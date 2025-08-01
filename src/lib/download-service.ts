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
    maxConcurrent: 8,
    retryAttempts: 3,
    retryDelay: 1000,
    batchSize: 50,
  };

  constructor(onProgress?: (progress: DownloadProgressState) => void) {
    this.onProgress = onProgress;
  }

  async getTranslatorInfo(slug: string): Promise<TranslatorInfo[]> {
    try {
      const comicResponse = await fetch(`/api/comic/${slug}`);
      if (!comicResponse.ok) {
        throw new Error(
          `Failed to fetch comic information: ${comicResponse.status}`,
        );
      }
      const comicInfo: ComicInfo = await comicResponse.json();

      const chaptersResponse = await fetch(
        `/api/chapters/${comicInfo.comic.hid}?limit=1000`,
      );
      if (!chaptersResponse.ok) {
        throw new Error(`Failed to fetch chapters: ${chaptersResponse.status}`);
      }
      const chaptersData = await chaptersResponse.json();
      const chapters: Chapter[] = chaptersData.chapters || [];

      const englishChapters = chapters.filter(
        (chapter) => chapter.lang === "en",
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
    retryCount = 0,
  ): Promise<DownloadResult> {
    try {
      const downloadResponse = await fetch(
        `https://meo.comick.pictures/${b2key}`,
        {
          headers: {
            "User-Agent": "ComickOfflineReader/1.0",
          },
        },
      );

      if (!downloadResponse.ok) {
        throw new Error(`HTTP ${downloadResponse.status}`);
      }

      const blob = await downloadResponse.blob();
      await saveImage(imageId, blob);

      return { success: true, imageId };
    } catch (error) {
      if (retryCount < this.downloadConfig.retryAttempts) {
        await this.sleep(
          this.downloadConfig.retryDelay * Math.pow(2, retryCount),
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
    chapterNumber: string,
  ): Promise<string[]> {
    const imageIds: string[] = [];
    const totalImages = images.length;
    let completedImages = 0;
    let failedImages = 0;

    const processBatch = async (batch: ChapterImages[]): Promise<void> => {
      const promises = batch.map(async (image) => {
        const imageId = `${chapterHid}-${image.b2key}`;
        const result = await this.downloadImageWithRetry(image.b2key, imageId);

        if (result.success) {
          imageIds.push(result.imageId);
        } else {
          failedImages++;
          console.error(`Failed to download image ${imageId}:`, result.error);
        }

        completedImages++;
        this.updateProgress(
          completedImages,
          totalImages,
          `Chapter ${chapterNumber} - ${completedImages}/${totalImages} pages${
            failedImages > 0 ? ` (${failedImages} failed)` : ""
          }`,
          "images",
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
        await Promise.allSettled(chunk);
        if (chunk.length === this.downloadConfig.maxConcurrent) {
          await this.sleep(50);
        }
      }
    };

    for (let i = 0; i < images.length; i += this.downloadConfig.batchSize) {
      const batch = images.slice(i, i + this.downloadConfig.batchSize);
      await processBatch(batch);

      if (i + this.downloadConfig.batchSize < images.length) {
        await this.sleep(100);
      }
    }

    if (failedImages > 0) {
      const retryCount = Math.min(failedImages, 5);
      console.warn(
        `Chapter ${chapterNumber}: ${failedImages} images failed to download. Retrying ${retryCount} images...`,
      );
    }

    return imageIds.sort((a, b) => {
      const aIndex = images.findIndex((img) =>
        a.includes(`${chapterHid}-${img.b2key}`),
      );
      const bIndex = images.findIndex((img) =>
        b.includes(`${chapterHid}-${img.b2key}`),
      );
      return aIndex - bIndex;
    });
  }

  async downloadSeries(
    slug: string,
    translatorPreferences: TranslatorPreferences,
  ): Promise<void> {
    try {
      this.updateProgress(0, 3, "Fetching comic information...", "setup");

      const comicResponse = await fetch(`/api/comic/${slug}`);
      if (!comicResponse.ok) {
        throw new Error(
          `Failed to fetch comic information: ${comicResponse.status}`,
        );
      }
      const comicInfo: ComicInfo = await comicResponse.json();

      this.updateProgress(1, 3, "Fetching chapters list...", "setup");

      const chaptersResponse = await fetch(
        `/api/chapters/${comicInfo.comic.hid}?limit=1000`,
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
      const chaptersToDownload = this.selectChaptersToDownload(
        englishChapters,
        translatorPreferences,
      );

      const { futureChapters, availableChapters } =
        this.checkFutureChapters(chaptersToDownload);

      if (futureChapters.length > 0) {
        const confirmed = await this.confirmFutureChapters(futureChapters);
        if (!confirmed) {
          throw new Error("Download cancelled by user");
        }
      }

      this.updateProgress(2, 3, "Preparing download...", "setup");

      const downloadedChapterNumbers = availableChapters
        .map((ch) => parseFloat(ch.chap))
        .filter((num) => !isNaN(num));

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
      };

      await saveSeries(localSeries);

      for (let i = 0; i < availableChapters.length; i++) {
        const chapter = availableChapters[i];

        this.updateProgress(
          i + 1,
          availableChapters.length,
          `Downloading chapter ${chapter.chap} by ${getTranslatorName(
            chapter,
          )}`,
          "chapters",
        );

        await this.downloadChapter(comicInfo.comic.hid, chapter);
      }

      localSeries.downloadedChapters = downloadedChapterNumbers.sort(
        (a, b) => a - b,
      );
      await saveSeries(localSeries);

      this.updateProgress(
        availableChapters.length,
        availableChapters.length,
        "Download complete!",
        "chapters",
      );
    } catch (error) {
      console.error("Error downloading series:", error);
      throw error;
    }
  }

  private async confirmFutureChapters(
    futureChapters: Chapter[],
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

    const message = `Warning: ${futureChaptersList} ${pluralText} not yet available for download.\n\nThey will be available in ${timeUntilAvailable}.\n\nDo you want to proceed with downloading the available chapters only?`;

    return confirm(message);
  }

  private selectChaptersToDownload(
    chapters: Chapter[],
    preferences: TranslatorPreferences,
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
        (ch) => getTranslatorName(ch) === preferences.primary,
      );

      if (!selectedChapter && preferences.allowBackupOverride) {
        for (const backup of preferences.backups) {
          selectedChapter = chaptersForNum.find(
            (ch) => getTranslatorName(ch) === backup,
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
  ): Promise<UpdateResult> {
    try {
      const localSeries = await getSeries(seriesId);
      if (!localSeries) {
        throw new Error("Series not found");
      }

      this.updateProgress(0, 2, "Checking for new chapters...", "setup");

      const chaptersResponse = await fetch(
        `/api/chapters/${seriesId}?limit=1000`,
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
        existingChapters.map((ch) => parseFloat(ch.chapterNumber)),
      );

      const newChapterCandidates = englishChapters.filter(
        (ch) => !existingChapterNumbers.has(parseFloat(ch.chap)),
      );

      if (newChapterCandidates.length === 0) {
        this.updateProgress(2, 2, "No new chapters found", "setup");
        return { newChapters: 0, conflicts: [] };
      }

      const newChapters = this.selectChaptersToDownload(
        newChapterCandidates,
        localSeries.translatorPreferences,
      );

      const { futureChapters, availableChapters } =
        this.checkFutureChapters(newChapters);

      if (futureChapters.length > 0) {
        const confirmed = await this.confirmFutureChapters(futureChapters);
        if (!confirmed) {
          return { newChapters: 0, conflicts: [] };
        }
      }

      const conflicts = availableChapters.filter(
        (ch) =>
          getTranslatorName(ch) !== localSeries.translatorPreferences.primary &&
          !localSeries.translatorPreferences.backups.includes(
            getTranslatorName(ch),
          ),
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
            chapter,
          )}`,
          "chapters",
        );

        await this.downloadChapter(seriesId, chapter);
      }

      const newChapterNumbers = availableChapters
        .map((ch) => parseFloat(ch.chap))
        .filter((num) => !isNaN(num));

      const updatedDownloadedChapters = Array.from(
        new Set([...localSeries.downloadedChapters, ...newChapterNumbers]),
      ).sort((a, b) => a - b);

      localSeries.downloadedChapters = updatedDownloadedChapters;
      localSeries.lastUpdated = new Date();
      await saveSeries(localSeries);

      this.updateProgress(
        availableChapters.length,
        availableChapters.length,
        `Downloaded ${availableChapters.length} new chapters`,
        "chapters",
      );

      return { newChapters: availableChapters.length, conflicts: [] };
    } catch (error) {
      console.error("Error updating series:", error);
      throw error;
    }
  }

  private async downloadChapter(
    seriesId: string,
    chapter: Chapter,
  ): Promise<void> {
    try {
      const imagesResponse = await fetch(`/api/chapter/${chapter.hid}/images`);
      if (!imagesResponse.ok) {
        throw new Error(
          `Failed to fetch images for chapter ${chapter.chap}: ${imagesResponse.status}`,
        );
      }

      const images: ChapterImages[] = await imagesResponse.json();

      const imageIds = await this.downloadImagesConcurrently(
        images,
        chapter.hid,
        chapter.chap,
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
    type: "setup" | "chapters" | "images",
  ): void {
    this.onProgress?.({ current, total, status, type });
  }
}
