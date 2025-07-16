/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  BookOpen,
  RefreshCw,
  Calendar,
  Tag,
  Users,
  ChevronRight,
  Settings,
  Play,
} from "lucide-react";
import { ChapterReader } from "@/components/ChapterReader";
import { LocalSeries, LocalChapter } from "@/types/comick";
import {
  getSeries,
  getChaptersBySeriesId,
  getChapter,
  saveSeries,
} from "@/lib/db";

interface ReadPageProps {
  params: {
    seriesId: string;
  };
}

export default function ReadPage({ params }: ReadPageProps) {
  const [series, setSeries] = useState<LocalSeries | null>(null);
  const [chapters, setChapters] = useState<LocalChapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<LocalChapter | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [updatingDescription, setUpdatingDescription] = useState(false);
  const [showAllChapters, setShowAllChapters] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadSeriesData();
  }, [params.seriesId]);

  const loadSeriesData = async () => {
    try {
      setLoading(true);
      const seriesData = await getSeries(params.seriesId);
      if (!seriesData) {
        router.push("/");
        return;
      }

      const chaptersData = await getChaptersBySeriesId(params.seriesId);
      const sortedChapters = chaptersData.sort(
        (a, b) => parseFloat(b.chapterNumber) - parseFloat(a.chapterNumber),
      );

      setSeries(seriesData);
      setChapters(sortedChapters);
    } catch (error) {
      console.error("Error loading series data:", error);
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const updateDescription = async () => {
    if (!series) return;

    try {
      setUpdatingDescription(true);
      const response = await fetch(`/api/comic/${series.slug}`);
      if (response.ok) {
        const updatedInfo = await response.json();
        const updatedSeries = {
          ...series,
          info: {
            ...series.info,
            comic: {
              ...series.info.comic,
              desc: updatedInfo.comic.desc,
            },
          },
        };
        await saveSeries(updatedSeries);
        setSeries(updatedSeries);
      }
    } catch (error) {
      console.error("Error updating description:", error);
    } finally {
      setUpdatingDescription(false);
    }
  };

  const openChapter = async (chapterHid: string) => {
    try {
      const chapter = await getChapter(chapterHid);
      if (chapter) {
        setCurrentChapter(chapter);
      }
    } catch (error) {
      console.error("Error opening chapter:", error);
    }
  };

  const openFirstChapter = async () => {
    if (chapters.length === 0) return;

    const firstChapter = chapters[chapters.length - 1];
    await openChapter(firstChapter.chapterHid);
  };

  const getCurrentChapterIndex = () => {
    if (!currentChapter) return -1;
    return chapters.findIndex(
      (ch) => ch.chapterHid === currentChapter.chapterHid,
    );
  };

  const goToPrevChapter = async () => {
    const currentIndex = getCurrentChapterIndex();
    if (currentIndex < chapters.length - 1) {
      const prevChapter = chapters[currentIndex + 1];
      await openChapter(prevChapter.chapterHid);
    }
  };

  const goToNextChapter = async () => {
    const currentIndex = getCurrentChapterIndex();
    if (currentIndex > 0) {
      const nextChapter = chapters[currentIndex - 1];
      await openChapter(nextChapter.chapterHid);
    }
  };

  const closeReader = () => {
    setCurrentChapter(null);
  };

  const formatRelativeTime = (date: Date | undefined) => {
    if (!date) {
      return "Unknown";
    }

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "Just now";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <div className="text-white text-lg">Loading series...</div>
        </div>
      </div>
    );
  }

  if (!series) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-lg">Series not found</div>
      </div>
    );
  }

  if (currentChapter) {
    const currentIndex = getCurrentChapterIndex();
    return (
      <ChapterReader
        chapter={currentChapter}
        onPrevChapter={goToPrevChapter}
        onNextChapter={goToNextChapter}
        hasPrevChapter={currentIndex < chapters.length - 1}
        hasNextChapter={currentIndex > 0}
        onClose={closeReader}
      />
    );
  }

  const description = series.info?.comic?.desc || "";
  const hasDescription = description.trim().length > 0;
  const isCompleted = series.info.comic.status === 2;
  const displayedChapters = showAllChapters ? chapters : chapters.slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="safe-top">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.push("/")}
              className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/series/${series.id}/settings`)}
                className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
              >
                <Settings size={20} />
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-24 h-32 relative overflow-hidden rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <img
                    src={series.coverUrl}
                    alt={series.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-white mb-3 leading-tight">
                  {series.title}
                </h1>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                      <Users size={12} />
                      <span className="truncate">
                        {series.translatorPreferences.primary}
                      </span>
                    </div>

                    {series.info.comic.year && (
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>{series.info.comic.year}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <Tag size={12} />
                      <span>{isCompleted ? "Completed" : "Ongoing"}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-white">
                      {chapters.length}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">
                      Downloaded
                    </div>
                  </div>
                  <button
                    onClick={openFirstChapter}
                    disabled={chapters.length === 0}
                    className="bg-blue-600/20 hover:bg-blue-600/30 disabled:bg-slate-800/50 disabled:cursor-not-allowed border border-blue-600/30 disabled:border-slate-700 rounded-lg p-3 text-center transition-all"
                  >
                    <div className="text-lg font-bold text-blue-300 disabled:text-white flex items-center justify-center gap-1">
                      <Play size={16} />
                    </div>
                    <div className="text-xs text-blue-400 disabled:text-slate-400 font-medium">
                      First Chap
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white">Description</h3>
                {!hasDescription && (
                  <button
                    onClick={updateDescription}
                    disabled={updatingDescription}
                    className="text-blue-400 hover:text-blue-300 disabled:text-slate-500 flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 transition-all"
                  >
                    <RefreshCw
                      size={14}
                      className={updatingDescription ? "animate-spin" : ""}
                    />
                    {updatingDescription ? "Loading..." : "Load"}
                  </button>
                )}
              </div>

              {hasDescription ? (
                <div className="text-slate-300 leading-relaxed text-sm">
                  {description.split("\n").map((paragraph, index) => (
                    <p key={index} className="mb-2 last:mb-0">
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 italic text-sm">
                  No description available.
                </p>
              )}
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Chapters</h2>
                <div className="bg-blue-600/20 border border-blue-600/30 px-3 py-1 rounded-lg">
                  <span className="text-blue-300 text-sm font-medium">
                    {chapters.length}
                  </span>
                </div>
              </div>

              {chapters.length === 0 ? (
                <div className="text-center py-8">
                  <div className="p-4 bg-slate-800/50 rounded-xl w-fit mx-auto mb-4">
                    <BookOpen size={32} className="text-slate-500" />
                  </div>
                  <p className="text-slate-400 text-sm">
                    No chapters downloaded yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {displayedChapters.map((chapter) => (
                    <button
                      key={chapter.chapterHid}
                      onClick={() => openChapter(chapter.chapterHid)}
                      className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 hover:border-slate-600 rounded-xl text-left transition-all group"
                    >
                      <div className="flex flex-col items-start">
                        <span className="text-white font-medium">
                          Chapter {chapter.chapterNumber}
                        </span>
                        {chapter.translator && (
                          <span className="text-slate-400 text-sm">
                            by {chapter.translator}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-sm">
                          {formatRelativeTime(
                            chapter.updatedAt || chapter.downloadedAt,
                          )}
                        </span>
                        <ChevronRight
                          size={16}
                          className="text-slate-400 group-hover:text-slate-300 transition-colors"
                        />
                      </div>
                    </button>
                  ))}

                  {chapters.length > 5 && (
                    <button
                      onClick={() => setShowAllChapters(!showAllChapters)}
                      className="w-full p-4 text-blue-400 hover:text-blue-300 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700 rounded-xl transition-all text-sm font-medium"
                    >
                      {showAllChapters
                        ? `Show less (${chapters.length - 5} hidden)`
                        : `Show all ${chapters.length} chapters`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="safe-bottom" />
    </div>
  );
}
