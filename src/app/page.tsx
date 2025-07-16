/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect } from "react";
import {
  Download,
  Plus,
  Search,
  BookOpen,
  Settings,
  Grid3X3,
  List,
  X,
  Filter,
} from "lucide-react";
import { SeriesItem } from "@/components/SeriesItem";
import { SeriesListItem } from "@/components/SeriesListItem";
import { DownloadProgress } from "@/components/DownloadProgress";
import { TranslatorSelector } from "@/components/TranslatorSelector";
import { TranslatorConflictDialog } from "@/components/TranslatorConflictDialog";
import {
  LocalSeries,
  TranslatorPreferences,
  DownloadProgressState,
  ConflictDialogState,
} from "@/types/comick";
import { getAllSeries, deleteSeries } from "@/lib/db";
import { DownloadService } from "@/lib/download-service";
import { useRouter } from "next/navigation";

type ViewMode = "grid" | "list";
type SortMode = "title" | "updated" | "progress" | "rating";

export default function Home() {
  const [series, setSeries] = useState<LocalSeries[]>([]);
  const [filteredSeries, setFilteredSeries] = useState<LocalSeries[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortMode, setSortMode] = useState<SortMode>("updated");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showTranslatorSelector, setShowTranslatorSelector] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [comickUrl, setComickUrl] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgressState>({
      current: 0,
      total: 100,
      status: "",
    });
  const [currentSlug, setCurrentSlug] = useState("");
  const [updateConflicts, setUpdateConflicts] =
    useState<ConflictDialogState | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadSeries();
  }, []);

  useEffect(() => {
    filterAndSortSeries();
  }, [series, searchQuery, sortMode]);

  const loadSeries = async () => {
    try {
      const allSeries = await getAllSeries();
      setSeries(allSeries);
    } catch (error) {
      console.error("Error loading series:", error);
    }
  };

  const filterAndSortSeries = () => {
    let filtered = series;

    if (searchQuery) {
      filtered = series.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.translatorPreferences.primary
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
      );
    }

    filtered.sort((a, b) => {
      switch (sortMode) {
        case "title":
          return a.title.localeCompare(b.title);
        case "updated":
          return (
            new Date(b.lastUpdated).getTime() -
            new Date(a.lastUpdated).getTime()
          );
        case "progress":
          const aProgress =
            a.downloadedChapters.length / Math.max(a.totalChapters, 1);
          const bProgress =
            b.downloadedChapters.length / Math.max(b.totalChapters, 1);
          return bProgress - aProgress;
        case "rating":
          const aRating = parseFloat(a.info.comic.bayesian_rating) || 0;
          const bRating = parseFloat(b.info.comic.bayesian_rating) || 0;
          return bRating - aRating;
        default:
          return 0;
      }
    });

    setFilteredSeries(filtered);
  };

  const extractSlugFromUrl = (url: string): string => {
    const match = url.match(/\/comic\/([^\/]+)/);
    return match ? match[1] : url;
  };

  const handleAddSeries = () => {
    if (!comickUrl.trim()) return;

    const slug = extractSlugFromUrl(comickUrl.trim());
    setCurrentSlug(slug);
    setShowAddForm(false);
    setShowTranslatorSelector(true);
  };

  const handleTranslatorSelection = async (
    preferences: TranslatorPreferences,
  ) => {
    try {
      setDownloading(true);
      setShowTranslatorSelector(false);

      const downloadService = new DownloadService(setDownloadProgress);
      await downloadService.downloadSeries(currentSlug, preferences);
      await loadSeries();
      setComickUrl("");
    } catch (error) {
      console.error("Download failed:", error);
      alert("Download failed. Please check the URL and try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleUpdate = async (seriesId: string) => {
    try {
      setDownloading(true);
      const downloadService = new DownloadService(setDownloadProgress);
      const result = await downloadService.updateSeries(seriesId);

      if (result.conflicts.length > 0) {
        const seriesData = series.find((s) => s.id === seriesId);
        if (seriesData) {
          setUpdateConflicts({
            seriesId,
            conflicts: result.conflicts,
            primaryTranslator: seriesData.translatorPreferences.primary,
          });
          setShowConflictDialog(true);
        }
      } else if (result.newChapters > 0) {
        await loadSeries();
      }
    } catch (error) {
      console.error("Update failed:", error);
      alert("Update failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleConflictResolution = async (
    action: "skip" | "download" | "change-preferences",
  ) => {
    if (!updateConflicts) return;

    try {
      setShowConflictDialog(false);

      if (action === "skip") {
        return;
      } else if (action === "download") {
        setDownloading(true);
        const downloadService = new DownloadService(setDownloadProgress);
        await downloadService.updateSeries(updateConflicts.seriesId, {
          skipTranslatorWarning: true,
        });
        await loadSeries();
      } else if (action === "change-preferences") {
        const seriesData = series.find(
          (s) => s.id === updateConflicts.seriesId,
        );
        if (seriesData) {
          setCurrentSlug(seriesData.slug);
          setShowTranslatorSelector(true);
        }
      }
    } catch (error) {
      console.error("Error resolving conflict:", error);
      alert("Error resolving conflict. Please try again.");
    } finally {
      setDownloading(false);
      setUpdateConflicts(null);
    }
  };

  const handleDelete = async (seriesId: string) => {
    if (!confirm("Are you sure you want to delete this series?")) return;

    try {
      await deleteSeries(seriesId);
      await loadSeries();
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Delete failed. Please try again.");
    }
  };

  const handleRead = (seriesId: string) => {
    router.push(`/read/${seriesId}`);
  };

  const totalChapters = series.reduce(
    (sum, s) => sum + s.downloadedChapters.length,
    0,
  );
  const completedSeries = series.filter(
    (s) => s.info.comic.status === 2,
  ).length;

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="safe-top">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-1">Comick</h1>
              <p className="text-sm text-slate-400">Offline manga collection</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/settings")}
                className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
              >
                <Settings size={20} />
              </button>

              <button
                onClick={() => setShowAddForm(true)}
                className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-lg"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {series.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-white mb-1">
                    {series.length}
                  </div>
                  <div className="text-xs text-slate-400 font-medium">
                    Series
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-white mb-1">
                    {totalChapters}
                  </div>
                  <div className="text-xs text-slate-400 font-medium">
                    Chapters
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-white mb-1">
                    {completedSeries}
                  </div>
                  <div className="text-xs text-slate-400 font-medium">
                    Complete
                  </div>
                </div>
              </div>
            </div>
          )}

          {series.length > 0 && (
            <div className="space-y-4 mb-6">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500"
                />
                <input
                  type="text"
                  placeholder="Search series..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-900/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-300 hover:text-white transition-all"
                >
                  <Filter size={16} />
                  <span className="text-sm font-medium">Filters</span>
                </button>

                <div className="flex border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-3 transition-all ${
                      viewMode === "grid"
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Grid3X3 size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-3 transition-all ${
                      viewMode === "list"
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <List size={16} />
                  </button>
                </div>

                <div className="text-sm text-slate-400 ml-auto">
                  {filteredSeries.length} series
                </div>
              </div>

              {showFilters && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-300">
                      Sort by
                    </label>
                    <select
                      value={sortMode}
                      onChange={(e) => setSortMode(e.target.value as SortMode)}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="updated">Recently Updated</option>
                      <option value="title">Title A-Z</option>
                      <option value="progress">Progress</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {series.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 mx-auto">
                <div className="p-6 bg-slate-800/50 rounded-2xl w-fit mx-auto mb-6">
                  <BookOpen size={40} className="text-slate-500" />
                </div>
                <h2 className="text-xl font-bold text-white mb-3">
                  No series yet
                </h2>
                <p className="text-slate-400 mb-8 leading-relaxed">
                  Start building your offline manga library
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-medium transition-all shadow-lg"
                >
                  Add Your First Series
                </button>
              </div>
            </div>
          ) : filteredSeries.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-slate-400 text-lg mb-4">
                No series match your search
              </div>
              <button
                onClick={() => setSearchQuery("")}
                className="text-blue-400 hover:text-blue-300 py-2 px-4 rounded-lg"
              >
                Clear search
              </button>
            </div>
          ) : viewMode === "list" ? (
            <div className="space-y-3">
              {filteredSeries.map((seriesItem) => (
                <SeriesListItem
                  key={seriesItem.id}
                  series={seriesItem}
                  onRead={handleRead}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filteredSeries.map((seriesItem) => (
                <SeriesItem
                  key={seriesItem.id}
                  series={seriesItem}
                  onRead={handleRead}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="safe-bottom" />

      {showAddForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Add New Series</h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setComickUrl("");
                }}
                className="p-2 text-slate-400 hover:text-white rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-slate-300 text-sm font-medium mb-3">
                Comick URL or Slug
              </label>
              <input
                type="text"
                value={comickUrl}
                onChange={(e) => setComickUrl(e.target.value)}
                placeholder="https://comick.io/comic/sample-manga"
                className="w-full px-4 py-4 bg-slate-800 text-white rounded-xl border border-slate-700 focus:border-blue-500 focus:outline-none placeholder-slate-500 transition-all"
              />
            </div>

            <div className="space-y-3">
              <button
                onClick={handleAddSeries}
                disabled={!comickUrl.trim() || downloading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
              >
                <Download size={18} />
                Select Translators
              </button>

              <button
                onClick={() => {
                  setShowAddForm(false);
                  setComickUrl("");
                }}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-xl font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showTranslatorSelector && (
        <TranslatorSelector
          slug={currentSlug}
          onSelect={handleTranslatorSelection}
          onCancel={() => {
            setShowTranslatorSelector(false);
            setCurrentSlug("");
          }}
        />
      )}

      {showConflictDialog && updateConflicts && (
        <TranslatorConflictDialog
          conflicts={updateConflicts.conflicts}
          primaryTranslator={updateConflicts.primaryTranslator}
          onResolve={handleConflictResolution}
        />
      )}

      {downloading && <DownloadProgress progress={downloadProgress} />}
    </div>
  );
}
