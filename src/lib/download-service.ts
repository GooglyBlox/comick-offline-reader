import {
  ComicInfo,
  Chapter,
  ChapterImages,
  LocalSeries,
  LocalChapter,
  TranslatorInfo,
  TranslatorPreferences,
  UpdateResult,
  DownloadProgressState,
} from "@/types/comick";
import {
  saveSeries,
  saveChapter,
  saveImage,
  getSeries,
  getChaptersBySeriesId,
} from "@/lib/db";

interface DownloadResult {
  success: boolean;
  imageId: string;
  error?: string;
}

interface ConcurrentDownloadConfig {
  maxConcurrent: number;
  retryAttempts: number;
  retryDelay: number;
  batchSize: number;
}

interface UpdateOptions {
  skipTranslatorWarning?: boolean;
}

interface DownloadError extends Error {
  type: "network" | "partial" | "cancelled" | "unknown";
  resumeable: boolean;
  completedChapters?: number[];
  failedChapters?: Chapter[];
  seriesId?: string;
}

interface ResumeInfo {
  seriesId: string;
  completedChapters: number[];
  remainingChapters: Chapter[];
  translatorPreferences: TranslatorPreferences;
}

function getTranslatorName(chapter: Chapter): string {
  if (
    chapter.md_chapters_groups &&
    chapter.md_chapters_groups.length > 0 &&
    chapter.md_chapters_groups[0].md_groups?.title
  ) {
    return chapter.md_chapters_groups[0].md_groups.title;
  }

  if (chapter.group_name && chapter.group_name.length > 0) {
    return chapter.group_name[0];
  }

  if (chapter.identities?.traits?.username) {
    return chapter.identities.traits.username;
  }

  return "Unknown";
}

export class DownloadService {
  private onProgress?: (progress: DownloadProgressState) => void;
  private downloadConfig: ConcurrentDownloadConfig = {
    maxConcurrent: 6,
    retryAttempts: 3,
    retryDelay: 1000,
    batchSize: 40,
  };
  private cancelled = false;
  private activeRequests = new Set<AbortController>();
  private connectionResetCounter = 0;
  private networkHealthy = true;

  constructor(onProgress?: (progress: DownloadProgressState) => void) {
    this.onProgress = onProgress;
  }

  cancel(): void {
    this.cancelled = true;

    this.activeRequests.forEach((controller) => {
      controller.abort();
    });
    this.activeRequests.clear();
  }

  private async resetNetworkConnections(): Promise<void> {
    this.activeRequests.forEach((controller) => {
      controller.abort();
    });
    this.activeRequests.clear();

    await this.sleep(1000);

    this.connectionResetCounter = 0;
    this.networkHealthy = true;

    console.log("Network connections reset");
  }

  private async checkNetworkHealth(): Promise<boolean> {
    try {
      const healthCheck = await fetch(
        `https://meo.comick.pictures/health-check-${Date.now()}`,
        {
          method: "HEAD",
          cache: "no-cache",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          signal: AbortSignal.timeout(5000),
        }
      );

      this.networkHealthy = healthCheck.ok || healthCheck.status === 404;
      return this.networkHealthy;
    } catch {
      this.networkHealthy = false;
      return false;
    }
  }

  async getTranslatorInfo(slug: string): Promise<TranslatorInfo[]> {
    try {
      const comicResponse = await fetch(`/api/comic/${slug}`);
      if (!comicResponse.ok) {
        throw new Error(
          `Failed to fetch comic information: ${comicResponse.status}`
        );
      }
      const comicInfo: ComicInfo = await comicResponse.json();

      const chaptersResponse = await fetch(
        `/api/chapters/${comicInfo.comic.hid}?limit=1000`
      );
      if (!chaptersResponse.ok) {
        throw new Error(`Failed to fetch chapters: ${chaptersResponse.status}`);
      }
      const chaptersData = await chaptersResponse.json();
      const chapters: Chapter[] = chaptersData.chapters || [];

      const englishChapters = chapters.filter(
        (chapter) => chapter.lang === "en"
      );

      const translatorMap = new Map<string, number[]>();

      englishChapters.forEach((chapter) => {
        const translator = getTranslatorName(chapter);
        const chapterNum = parseFloat(chapter.chap);

        if (!isNaN(chapterNum)) {
          if (!translatorMap.has(translator)) {
            translatorMap.set(translator, []);
          }
          translatorMap.get(translator)!.push(chapterNum);
        }
      });

      const translators: TranslatorInfo[] = [];
      translatorMap.forEach((chapters, name) => {
        chapters.sort((a, b) => a - b);
        translators.push({
          name,
          chapters,
          latestChapter: Math.max(...chapters),
        });
      });

      return translators.sort((a, b) => b.latestChapter - a.latestChapter);
    } catch (error) {
      console.error("Error getting translator info:", error);
      throw new Error("Failed to fetch translator information");
    }
  }

  async checkExistingSeries(slug: string): Promise<LocalSeries | null> {
    try {
      const comicResponse = await fetch(`/api/comic/${slug}`);
      if (!comicResponse.ok) {
        return null;
      }
      const comicInfo: ComicInfo = await comicResponse.json();

      const existingSeries = await getSeries(comicInfo.comic.hid);
      return existingSeries || null;
    } catch (error) {
      console.error("Error checking existing series:", error);
      return null;
    }
  }

  async getResumeInfo(slug: string): Promise<ResumeInfo | null> {
    try {
      const existingSeries = await this.checkExistingSeries(slug);
      if (!existingSeries) {
        return null;
      }

      const chaptersResponse = await fetch(
        `/api/chapters/${existingSeries.hid}?limit=1000`
      );
      if (!chaptersResponse.ok) {
        return null;
      }
      const chaptersData = await chaptersResponse.json();
      const chapters: Chapter[] = chaptersData.chapters || [];

      const englishChapters = chapters
        .filter((chapter) => chapter.lang === "en")
        .sort((a, b) => parseFloat(a.chap) - parseFloat(b.chap));

      const existingChapters = await getChaptersBySeriesId(existingSeries.id);
      const existingChapterNumbers = new Set(
        existingChapters.map((ch) => parseFloat(ch.chapterNumber))
      );

      const allAvailableChapters = this.selectChaptersToDownload(
        englishChapters,
        existingSeries.translatorPreferences
      );

      const remainingChapters = allAvailableChapters.filter(
        (ch) => !existingChapterNumbers.has(parseFloat(ch.chap))
      );

      if (remainingChapters.length === 0) {
        return null;
      }

      return {
        seriesId: existingSeries.id,
        completedChapters: Array.from(existingChapterNumbers).sort(
          (a, b) => a - b
        ),
        remainingChapters,
        translatorPreferences: existingSeries.translatorPreferences,
      };
    } catch (error) {
      console.error("Error getting resume info:", error);
      return null;
    }
  }

  private checkFutureChapters(chapters: Chapter[]): {
    futureChapters: Chapter[];
    availableChapters: Chapter[];
  } {
    const now = new Date();
    const futureChapters: Chapter[] = [];
    const availableChapters: Chapter[] = [];

    chapters.forEach((chapter) => {
      const publishTime = new Date(chapter.publish_at);
      if (publishTime > now) {
        futureChapters.push(chapter);
      } else {
        availableChapters.push(chapter);
      }
    });

    return { futureChapters, availableChapters };
  }

  private formatTimeUntilAvailable(publishTime: Date): string {
    const now = new Date();
    const diffInMs = publishTime.getTime() - now.getTime();
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) {
      const dayText = diffInDays > 1 ? "days" : "day";
      return `${diffInDays} ${dayText} (${publishTime.toLocaleDateString()} ${publishTime.toLocaleTimeString()})`;
    } else if (diffInHours > 0) {
      const hourText = diffInHours > 1 ? "hours" : "hour";
      return `${diffInHours} ${hourText} (${publishTime.toLocaleTimeString()})`;
    } else if (diffInMinutes > 0) {
      const minuteText = diffInMinutes > 1 ? "minutes" : "minute";
      return `${diffInMinutes} ${minuteText} (${publishTime.toLocaleTimeString()})`;
    } else {
      const secondText = diffInSeconds > 1 ? "seconds" : "second";
      return `${diffInSeconds} ${secondText} (${publishTime.toLocaleTimeString()})`;
    }
  }

  private async downloadImageWithRetry(
    b2key: string,
    imageId: string,
    retryCount = 0
  ): Promise<DownloadResult> {
    if (this.cancelled) {
      return { success: false, imageId, error: "Download cancelled" };
    }

    const controller = new AbortController();
    this.activeRequests.add(controller);

    try {
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 12000);

      const cacheBuster = `sw-bypass-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const downloadResponse = await fetch(
        `https://meo.comick.pictures/${b2key}?${cacheBuster}`,
        {
          method: "GET",
          headers: {
            "User-Agent": "ComickOfflineReader/1.0",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
            "X-Bypass-SW": "true",
          },
          cache: "no-store",
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!downloadResponse.ok) {
        throw new Error(`HTTP ${downloadResponse.status}`);
      }

      const blob = await downloadResponse.blob();

      if (blob.size === 0) {
        throw new Error("Empty image received");
      }

      await saveImage(imageId, blob);

      this.activeRequests.delete(controller);
      return { success: true, imageId };
    } catch (error) {
      this.activeRequests.delete(controller);

      if (retryCount < this.downloadConfig.retryAttempts && !this.cancelled) {
        this.connectionResetCounter++;
        if (this.connectionResetCounter >= 10) {
          console.warn(
            "Multiple download failures detected, resetting network connections"
          );
          await this.resetNetworkConnections();
        }

        await this.sleep(
          this.downloadConfig.retryDelay * Math.pow(2, retryCount)
        );
        return this.downloadImageWithRetry(b2key, imageId, retryCount + 1);
      }

      return {
        success: false,
        imageId,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async downloadImagesConcurrently(
    images: ChapterImages[],
    chapterHid: string,
    chapterNumber: string
  ): Promise<string[]> {
    if (this.cancelled) {
      throw new Error("Download cancelled");
    }

    if (!this.networkHealthy) {
      const isHealthy = await this.checkNetworkHealth();
      if (!isHealthy) {
        await this.resetNetworkConnections();
      }
    }

    const imageIds: string[] = [];
    const totalImages = images.length;
    let completedImages = 0;
    let failedImages = 0;
    let consecutiveFailures = 0;

    const processBatch = async (batch: ChapterImages[]): Promise<void> => {
      const promises = batch.map(async (image) => {
        if (this.cancelled) {
          return;
        }

        const imageId = `${chapterHid}-${image.b2key}`;
        const result = await this.downloadImageWithRetry(image.b2key, imageId);

        if (result.success) {
          imageIds.push(result.imageId);
          consecutiveFailures = 0;
        } else {
          failedImages++;
          consecutiveFailures++;
          console.error(`Failed to download image ${imageId}:`, result.error);

          if (consecutiveFailures >= 5) {
            console.warn("Too many consecutive failures, resetting network");
            await this.resetNetworkConnections();
            consecutiveFailures = 0;
          }
        }

        completedImages++;
        this.updateProgress(
          completedImages,
          totalImages,
          `Chapter ${chapterNumber} - ${completedImages}/${totalImages} pages${
            failedImages > 0 ? ` (${failedImages} failed)` : ""
          }`,
          "images"
        );
      });

      const chunks: Promise<void>[][] = [];
      for (
        let i = 0;
        i < promises.length;
        i += this.downloadConfig.maxConcurrent
      ) {
        chunks.push(promises.slice(i, i + this.downloadConfig.maxConcurrent));
      }

      for (const chunk of chunks) {
        if (this.cancelled) {
          throw new Error("Download cancelled");
        }
        await Promise.allSettled(chunk);
        if (chunk.length === this.downloadConfig.maxConcurrent) {
          await this.sleep(25);
        }
      }
    };

    for (let i = 0; i < images.length; i += this.downloadConfig.batchSize) {
      if (this.cancelled) {
        throw new Error("Download cancelled");
      }

      const batch = images.slice(i, i + this.downloadConfig.batchSize);
      await processBatch(batch);

      if (
        failedImages > 0 &&
        i + this.downloadConfig.batchSize < images.length
      ) {
        await this.resetNetworkConnections();
        await this.sleep(500);
      } else if (i + this.downloadConfig.batchSize < images.length) {
        await this.sleep(50);
      }
    }

    if (failedImages > 0) {
      const retryCount = Math.min(failedImages, 5);
      console.warn(
        `Chapter ${chapterNumber}: ${failedImages} images failed to download. Retrying ${retryCount} images...`
      );
    }

    return imageIds.sort((a, b) => {
      const aIndex = images.findIndex((img) =>
        a.includes(`${chapterHid}-${img.b2key}`)
      );
      const bIndex = images.findIndex((img) =>
        b.includes(`${chapterHid}-${img.b2key}`)
      );
      return aIndex - bIndex;
    });
  }

  async resumeDownload(resumeInfo: ResumeInfo, startFromChapter?: number): Promise<void> {
    this.cancelled = false;

    try {
      const { seriesId, remainingChapters } = resumeInfo;

      const localSeries = await getSeries(seriesId);
      if (!localSeries) {
        throw new Error("Series not found for resume");
      }

      let chaptersToProcess = remainingChapters;
      if (startFromChapter !== undefined) {
        chaptersToProcess = remainingChapters.filter(
          (chapter) => parseFloat(chapter.chap) >= startFromChapter
        );
      }

      const { futureChapters, availableChapters } =
        this.checkFutureChapters(chaptersToProcess);

      if (futureChapters.length > 0) {
        const confirmed = await this.confirmFutureChapters(futureChapters, startFromChapter);
        if (!confirmed) {
          throw new Error("Download cancelled by user");
        }
      }

      const completedChapters: number[] = [];
      const failedChapters: Chapter[] = [];

      for (let i = 0; i < availableChapters.length; i++) {
        if (this.cancelled) {
          const error = new Error("Download cancelled") as DownloadError;
          error.type = "cancelled";
          error.resumeable = true;
          error.completedChapters = completedChapters;
          error.failedChapters = availableChapters.slice(i);
          error.seriesId = seriesId;
          throw error;
        }

        const chapter = availableChapters[i];

        this.updateProgress(
          i + 1,
          availableChapters.length,
          `Downloading chapter ${chapter.chap} by ${getTranslatorName(
            chapter
          )}`,
          "chapters"
        );

        try {
          await this.downloadChapter(seriesId, chapter);
          completedChapters.push(parseFloat(chapter.chap));
        } catch (error) {
          console.error(`Failed to download chapter ${chapter.chap}:`, error);
          failedChapters.push(chapter);
        }
      }

      if (completedChapters.length > 0) {
        const updatedDownloadedChapters = Array.from(
          new Set([...localSeries.downloadedChapters, ...completedChapters])
        ).sort((a, b) => a - b);

        localSeries.downloadedChapters = updatedDownloadedChapters;
        localSeries.lastUpdated = new Date();
        await saveSeries(localSeries);
      }

      if (failedChapters.length > 0 && completedChapters.length > 0) {
        const error = new Error(
          `Downloaded ${completedChapters.length} chapters, but ${failedChapters.length} failed`
        ) as DownloadError;
        error.type = "partial";
        error.resumeable = true;
        error.completedChapters = completedChapters;
        error.failedChapters = failedChapters;
        error.seriesId = seriesId;
        throw error;
      } else if (failedChapters.length > 0) {
        const error = new Error(
          `Failed to download ${failedChapters.length} chapters`
        ) as DownloadError;
        error.type = "network";
        error.resumeable = true;
        error.failedChapters = failedChapters;
        error.seriesId = seriesId;
        throw error;
      }

      this.updateProgress(
        availableChapters.length,
        availableChapters.length,
        "Download complete!",
        "chapters"
      );
    } catch (error) {
      console.error("Error resuming download:", error);
      throw error;
    }
  }

  async downloadSeries(
    slug: string,
    translatorPreferences: TranslatorPreferences,
    startFromChapter?: number
  ): Promise<void> {
    this.cancelled = false;

    try {
      this.updateProgress(0, 3, "Fetching comic information...", "setup");

      const comicResponse = await fetch(`/api/comic/${slug}`);
      if (!comicResponse.ok) {
        throw new Error(
          `Failed to fetch comic information: ${comicResponse.status}`
        );
      }
      const comicInfo: ComicInfo = await comicResponse.json();

      this.updateProgress(1, 3, "Fetching chapters list...", "setup");

      const chaptersResponse = await fetch(
        `/api/chapters/${comicInfo.comic.hid}?limit=1000`
      );
      if (!chaptersResponse.ok) {
        throw new Error(`Failed to fetch chapters: ${chaptersResponse.status}`);
      }
      const chaptersData = await chaptersResponse.json();
      const chapters: Chapter[] = chaptersData.chapters || [];

      const englishChapters = chapters
        .filter((chapter) => chapter.lang === "en")
        .sort((a, b) => parseFloat(a.chap) - parseFloat(b.chap));

      const translators = await this.getTranslatorInfo(slug);
      let chaptersToDownload = this.selectChaptersToDownload(
        englishChapters,
        translatorPreferences
      );

      if (startFromChapter !== undefined) {
        chaptersToDownload = chaptersToDownload.filter(
          (chapter) => parseFloat(chapter.chap) >= startFromChapter
        );
      }

      const { futureChapters, availableChapters } =
        this.checkFutureChapters(chaptersToDownload);

      if (futureChapters.length > 0) {
        const confirmed = await this.confirmFutureChapters(futureChapters, startFromChapter);
        if (!confirmed) {
          throw new Error("Download cancelled by user");
        }
      }

      this.updateProgress(2, 3, "Preparing download...", "setup");

      const localSeries: LocalSeries = {
        id: comicInfo.comic.hid,
        title: comicInfo.comic.title,
        slug: comicInfo.comic.slug,
        hid: comicInfo.comic.hid,
        coverUrl: comicInfo.comic.cover_url,
        totalChapters: availableChapters.length,
        downloadedChapters: [],
        lastUpdated: new Date(),
        info: comicInfo,
        translators,
        translatorPreferences,
        startFromChapter,
      };

      await saveSeries(localSeries);

      const completedChapters: number[] = [];
      const failedChapters: Chapter[] = [];

      for (let i = 0; i < availableChapters.length; i++) {
        if (this.cancelled) {
          const error = new Error("Download cancelled") as DownloadError;
          error.type = "cancelled";
          error.resumeable = true;
          error.completedChapters = completedChapters;
          error.failedChapters = availableChapters.slice(i);
          error.seriesId = comicInfo.comic.hid;
          throw error;
        }

        const chapter = availableChapters[i];

        this.updateProgress(
          i + 1,
          availableChapters.length,
          `Downloading chapter ${chapter.chap} by ${getTranslatorName(
            chapter
          )}`,
          "chapters"
        );

        try {
          await this.downloadChapter(comicInfo.comic.hid, chapter);
          completedChapters.push(parseFloat(chapter.chap));
        } catch (error) {
          console.error(`Failed to download chapter ${chapter.chap}:`, error);
          failedChapters.push(chapter);
        }
      }

      if (completedChapters.length > 0) {
        localSeries.downloadedChapters = completedChapters.sort(
          (a, b) => a - b
        );
        await saveSeries(localSeries);
      }

      if (failedChapters.length > 0 && completedChapters.length > 0) {
        const error = new Error(
          `Downloaded ${completedChapters.length} chapters, but ${failedChapters.length} failed`
        ) as DownloadError;
        error.type = "partial";
        error.resumeable = true;
        error.completedChapters = completedChapters;
        error.failedChapters = failedChapters;
        error.seriesId = comicInfo.comic.hid;
        throw error;
      } else if (failedChapters.length > 0) {
        const error = new Error(
          `Failed to download ${failedChapters.length} chapters`
        ) as DownloadError;
        error.type = "network";
        error.resumeable = true;
        error.failedChapters = failedChapters;
        error.seriesId = comicInfo.comic.hid;
        throw error;
      }

      this.updateProgress(
        availableChapters.length,
        availableChapters.length,
        "Download complete!",
        "chapters"
      );
    } catch (error) {
      console.error("Error downloading series:", error);
      throw error;
    }
  }

  private async confirmFutureChapters(
    futureChapters: Chapter[],
    startFromChapter?: number
  ): Promise<boolean> {
    const futureChaptersList = futureChapters
      .map((ch) => `Chapter ${ch.chap}`)
      .join(", ");

    const earliestRelease = futureChapters.reduce((earliest, chapter) => {
      const publishTime = new Date(chapter.publish_at);
      return publishTime < earliest ? publishTime : earliest;
    }, new Date(futureChapters[0].publish_at));

    const timeUntilAvailable = this.formatTimeUntilAvailable(earliestRelease);
    const pluralText = futureChapters.length === 1 ? "is" : "are";
    const startChapterText = startFromChapter ? ` (starting from chapter ${startFromChapter})` : "";

    const message = `Warning: ${futureChaptersList} ${pluralText} not yet available for download.\n\nThey will be available in ${timeUntilAvailable}.\n\nDo you want to proceed with downloading the available chapters only${startChapterText}?`;

    return confirm(message);
  }

  private selectChaptersToDownload(
    chapters: Chapter[],
    preferences: TranslatorPreferences
  ): Chapter[] {
    const chapterMap = new Map<number, Chapter[]>();

    chapters.forEach((chapter) => {
      const chapterNum = parseFloat(chapter.chap);
      if (!isNaN(chapterNum)) {
        if (!chapterMap.has(chapterNum)) {
          chapterMap.set(chapterNum, []);
        }
        chapterMap.get(chapterNum)!.push(chapter);
      }
    });

    const result: Chapter[] = [];
    const chapterNumbers = Array.from(chapterMap.keys()).sort((a, b) => a - b);

    for (const chapterNum of chapterNumbers) {
      const chaptersForNum = chapterMap.get(chapterNum)!;

      let selectedChapter = chaptersForNum.find(
        (ch) => getTranslatorName(ch) === preferences.primary
      );

      if (!selectedChapter && preferences.allowBackupOverride) {
        for (const backup of preferences.backups) {
          selectedChapter = chaptersForNum.find(
            (ch) => getTranslatorName(ch) === backup
          );
          if (selectedChapter) break;
        }
      }

      if (!selectedChapter) {
        selectedChapter = chaptersForNum[0];
      }

      result.push(selectedChapter);
    }

    return result;
  }

  async updateSeries(
    seriesId: string,
    options: UpdateOptions = {},
    startFromChapter?: number
  ): Promise<UpdateResult> {
    try {
      const localSeries = await getSeries(seriesId);
      if (!localSeries) {
        throw new Error("Series not found");
      }

      this.updateProgress(0, 2, "Checking for new chapters...", "setup");

      const chaptersResponse = await fetch(
        `/api/chapters/${seriesId}?limit=1000`
      );
      if (!chaptersResponse.ok) {
        throw new Error(`Failed to fetch chapters: ${chaptersResponse.status}`);
      }
      const chaptersData = await chaptersResponse.json();
      const chapters: Chapter[] = chaptersData.chapters || [];

      const englishChapters = chapters
        .filter((chapter) => chapter.lang === "en")
        .sort((a, b) => parseFloat(a.chap) - parseFloat(b.chap));

      const existingChapters = await getChaptersBySeriesId(seriesId);
      const existingChapterNumbers = new Set(
        existingChapters.map((ch) => parseFloat(ch.chapterNumber))
      );

      let newChapterCandidates = englishChapters.filter(
        (ch) => !existingChapterNumbers.has(parseFloat(ch.chap))
      );

      const effectiveStartChapter = startFromChapter ?? localSeries.startFromChapter;
      if (effectiveStartChapter !== undefined) {
        newChapterCandidates = newChapterCandidates.filter(
          (ch) => parseFloat(ch.chap) >= effectiveStartChapter
        );
      }

      if (newChapterCandidates.length === 0) {
        this.updateProgress(2, 2, "No new chapters found", "setup");
        return { newChapters: 0, conflicts: [] };
      }

      const newChapters = this.selectChaptersToDownload(
        newChapterCandidates,
        localSeries.translatorPreferences
      );

      const { futureChapters, availableChapters } =
        this.checkFutureChapters(newChapters);

      if (futureChapters.length > 0) {
        const confirmed = await this.confirmFutureChapters(futureChapters, effectiveStartChapter);
        if (!confirmed) {
          return { newChapters: 0, conflicts: [] };
        }
      }

      const conflicts = availableChapters.filter(
        (ch) =>
          getTranslatorName(ch) !== localSeries.translatorPreferences.primary &&
          !localSeries.translatorPreferences.backups.includes(
            getTranslatorName(ch)
          )
      );

      if (conflicts.length > 0 && !options.skipTranslatorWarning) {
        return { newChapters: 0, conflicts };
      }

      this.updateProgress(1, 2, "Downloading new chapters...", "setup");

      for (let i = 0; i < availableChapters.length; i++) {
        const chapter = availableChapters[i];

        this.updateProgress(
          i + 1,
          availableChapters.length,
          `Downloading chapter ${chapter.chap} by ${getTranslatorName(
            chapter
          )}`,
          "chapters"
        );

        await this.downloadChapter(seriesId, chapter);
      }

      const newChapterNumbers = availableChapters
        .map((ch) => parseFloat(ch.chap))
        .filter((num) => !isNaN(num));

      const updatedDownloadedChapters = Array.from(
        new Set([...localSeries.downloadedChapters, ...newChapterNumbers])
      ).sort((a, b) => a - b);

      localSeries.downloadedChapters = updatedDownloadedChapters;
      localSeries.lastUpdated = new Date();
      await saveSeries(localSeries);

      this.updateProgress(
        availableChapters.length,
        availableChapters.length,
        `Downloaded ${availableChapters.length} new chapters`,
        "chapters"
      );

      return { newChapters: availableChapters.length, conflicts: [] };
    } catch (error) {
      console.error("Error updating series:", error);
      throw error;
    }
  }

  private async downloadChapter(
    seriesId: string,
    chapter: Chapter
  ): Promise<void> {
    try {
      const imagesResponse = await fetch(`/api/chapter/${chapter.hid}/images`);
      if (!imagesResponse.ok) {
        throw new Error(
          `Failed to fetch images for chapter ${chapter.chap}: ${imagesResponse.status}`
        );
      }

      const images: ChapterImages[] = await imagesResponse.json();

      const imageIds = await this.downloadImagesConcurrently(
        images,
        chapter.hid,
        chapter.chap
      );

      const localChapter: LocalChapter = {
        seriesId,
        chapterNumber: chapter.chap,
        chapterHid: chapter.hid,
        translator: getTranslatorName(chapter),
        images: imageIds,
        downloadedAt: new Date(),
        updatedAt: new Date(chapter.created_at),
      };

      await saveChapter(localChapter);
    } catch (error) {
      console.error(`Error downloading chapter ${chapter.chap}:`, error);
      throw new Error(`Failed to download chapter ${chapter.chap}`);
    }
  }

  updateDownloadConfig(config: Partial<ConcurrentDownloadConfig>): void {
    this.downloadConfig = { ...this.downloadConfig, ...config };
  }

  private updateProgress(
    current: number,
    total: number,
    status: string,
    type: "setup" | "chapters" | "images"
  ): void {
    this.onProgress?.({ current, total, status, type });
  }

  destroy(): void {
    this.cancel();
  }
}
