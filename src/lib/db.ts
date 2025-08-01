import { openDB, DBSchema, IDBPDatabase } from "idb";
import { LocalSeries, LocalChapter } from "@/types/comick";

interface ComickDB extends DBSchema {
  series: {
    key: string;
    value: LocalSeries;
    indexes: { "by-title": string };
  };
  chapters: {
    key: string;
    value: LocalChapter;
    indexes: { "by-series": string };
  };
  images: {
    key: string;
    value: {
      id: string;
      blob: Blob;
      downloadedAt: Date;
    };
  };
}

let db: IDBPDatabase<ComickDB> | null = null;

export async function initDB(): Promise<IDBPDatabase<ComickDB>> {
  if (db) return db;

  try {
    db = await openDB<ComickDB>("comick-offline", 1, {
      upgrade(database) {
        const seriesStore = database.createObjectStore("series", {
          keyPath: "id",
        });
        seriesStore.createIndex("by-title", "title");

        const chaptersStore = database.createObjectStore("chapters", {
          keyPath: "chapterHid",
        });
        chaptersStore.createIndex("by-series", "seriesId");

        database.createObjectStore("images", {
          keyPath: "id",
        });
      },
    });

    return db;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw new Error("Database initialization failed");
  }
}

export async function saveSeries(series: LocalSeries): Promise<void> {
  try {
    const database = await initDB();
    await database.put("series", series);
  } catch (error) {
    console.error("Failed to save series:", error);
    throw new Error("Failed to save series to database");
  }
}

export async function getSeries(id: string): Promise<LocalSeries | undefined> {
  try {
    const database = await initDB();
    const series = await database.get("series", id);
    if (series) {
      return await syncSeriesWithDatabase(series);
    }
    return undefined;
  } catch (error) {
    console.error("Failed to get series:", error);
    return undefined;
  }
}

export async function getAllSeries(): Promise<LocalSeries[]> {
  try {
    const database = await initDB();
    const allSeries = await database.getAll("series");

    const syncedSeries = await Promise.all(
      allSeries.map((series) => syncSeriesWithDatabase(series))
    );

    return syncedSeries;
  } catch (error) {
    console.error("Failed to get all series:", error);
    return [];
  }
}

async function syncSeriesWithDatabase(
  series: LocalSeries
): Promise<LocalSeries> {
  try {
    const actualChapters = await getChaptersBySeriesId(series.id);
    const actualChapterNumbers = actualChapters
      .map((ch) => parseFloat(ch.chapterNumber))
      .filter((num) => !isNaN(num))
      .sort((a, b) => a - b);

    const syncedSeries = {
      ...series,
      downloadedChapters: actualChapterNumbers,
      totalChapters: Math.max(
        series.totalChapters,
        actualChapterNumbers.length
      ),
    };

    if (actualChapterNumbers.length !== series.downloadedChapters.length) {
      await saveSeries(syncedSeries);
    }

    return syncedSeries;
  } catch (error) {
    console.error("Failed to sync series with database:", error);
    return series;
  }
}

export async function updateLastReadChapter(
  seriesId: string,
  chapterNumber: string,
  chapterHid: string
): Promise<void> {
  try {
    const series = await getSeries(seriesId);
    if (series) {
      const updatedSeries = {
        ...series,
        lastReadChapter: {
          chapterNumber,
          chapterHid,
          readAt: new Date(),
        },
      };
      await saveSeries(updatedSeries);
    }
  } catch (error) {
    console.error("Failed to update last read chapter:", error);
  }
}

export async function deleteSeries(id: string): Promise<void> {
  try {
    const database = await initDB();
    const tx = database.transaction(
      ["series", "chapters", "images"],
      "readwrite"
    );

    await tx.objectStore("series").delete(id);

    const chapters = await tx
      .objectStore("chapters")
      .index("by-series")
      .getAll(id);

    for (const chapter of chapters) {
      await tx.objectStore("chapters").delete(chapter.chapterHid);
      for (const imageId of chapter.images) {
        await tx.objectStore("images").delete(imageId);
      }
    }

    await tx.done;
  } catch (error) {
    console.error("Failed to delete series:", error);
    throw new Error("Failed to delete series from database");
  }
}

export async function saveChapter(chapter: LocalChapter): Promise<void> {
  try {
    const database = await initDB();
    await database.put("chapters", chapter);
  } catch (error) {
    console.error("Failed to save chapter:", error);
    throw new Error("Failed to save chapter to database");
  }
}

export async function getChapter(
  hid: string
): Promise<LocalChapter | undefined> {
  try {
    const database = await initDB();
    return await database.get("chapters", hid);
  } catch (error) {
    console.error("Failed to get chapter:", error);
    return undefined;
  }
}

export async function getChaptersBySeriesId(
  seriesId: string
): Promise<LocalChapter[]> {
  try {
    const database = await initDB();
    return await database.getAllFromIndex("chapters", "by-series", seriesId);
  } catch (error) {
    console.error("Failed to get chapters by series ID:", error);
    return [];
  }
}

export async function saveImage(id: string, blob: Blob): Promise<void> {
  try {
    const database = await initDB();
    await database.put("images", {
      id,
      blob,
      downloadedAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to save image:", error);
    throw new Error("Failed to save image to database");
  }
}

export async function getImage(id: string): Promise<Blob | undefined> {
  try {
    const database = await initDB();
    const result = await database.get("images", id);
    return result?.blob;
  } catch (error) {
    console.error("Failed to get image:", error);
    return undefined;
  }
}
