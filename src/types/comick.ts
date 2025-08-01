export interface ComicInfo {
  comic: {
    id: number;
    hid: string;
    title: string;
    country: string;
    status: number;
    last_chapter: number;
    chapter_count: number;
    desc: string;
    slug: string;
    year: number;
    bayesian_rating: string;
    rating_count: number;
    content_rating: string;
    md_covers: Array<{
      vol: string;
      w: number;
      h: number;
      b2key: string;
    }>;
    cover_url: string;
  };
  firstChap: {
    chap: string;
    hid: string;
    lang: string;
    group_name: string[];
    vol: string | null;
  };
  authors: Array<{
    name: string;
    slug: string;
  }>;
  artists: Array<{
    name: string;
    slug: string;
  }>;
}

export interface Chapter {
  id: number;
  chap: string;
  title: string | null;
  vol: string | null;
  lang: string;
  created_at: string;
  updated_at: string;
  up_count: number;
  down_count: number;
  is_the_last_chapter: boolean;
  publish_at: string;
  group_name: string[] | null;
  hid: string;
  md_chapters_groups?: Array<{
    md_groups: {
      title: string;
      slug: string;
    };
  }>;
  identities?: {
    id: string;
    traits: {
      username: string;
      gravatar: string;
    };
  };
}

export interface ChapterImages {
  h: number;
  w: number;
  name: string;
  s: number;
  b2key: string;
  optimized: number;
}

export interface TranslatorInfo {
  name: string;
  chapters: number[];
  latestChapter: number;
}

export interface TranslatorPreferences {
  primary: string;
  backups: string[];
  allowBackupOverride: boolean;
}

export interface LocalSeries {
  id: string;
  title: string;
  slug: string;
  hid: string;
  coverUrl: string;
  totalChapters: number;
  downloadedChapters: number[];
  lastUpdated: Date;
  info: ComicInfo;
  translators: TranslatorInfo[];
  translatorPreferences: TranslatorPreferences;
  lastReadChapter?: {
    chapterNumber: string;
    chapterHid: string;
    readAt: Date;
  };
}

export interface LocalChapter {
  seriesId: string;
  chapterNumber: string;
  chapterHid: string;
  translator: string;
  images: string[];
  downloadedAt: Date;
  updatedAt?: Date;
}

export interface UpdateResult {
  newChapters: number;
  conflicts: Chapter[];
}

export interface DownloadProgressState {
  current: number;
  total: number;
  status: string;
  type?: "setup" | "chapters" | "images";
}

export interface ConflictDialogState {
  seriesId: string;
  conflicts: Chapter[];
  primaryTranslator: string;
}
