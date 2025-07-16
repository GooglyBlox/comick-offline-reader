/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Users,
  ArrowUp,
  ArrowDown,
  Save,
  RefreshCw,
  Check,
  AlertCircle,
} from "lucide-react";
import { getAllSeries, saveSeries } from "@/lib/db";
import { LocalSeries } from "@/types/comick";

interface GlobalTranslatorRanking {
  name: string;
  priority: number;
  isEnabled: boolean;
}

const GLOBAL_RANKINGS_KEY = "comick-global-translator-rankings";

export default function SettingsPage() {
  const [series, setSeries] = useState<LocalSeries[]>([]);
  const [globalTranslators, setGlobalTranslators] = useState<
    GlobalTranslatorRanking[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSeriesOverview, setShowSeriesOverview] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const allSeries = await getAllSeries();
      setSeries(allSeries);

      const savedRankings = localStorage.getItem(GLOBAL_RANKINGS_KEY);
      if (savedRankings) {
        try {
          const existingRankings = JSON.parse(
            savedRankings,
          ) as GlobalTranslatorRanking[];
          const updatedRankings = mergeNewTranslators(
            allSeries,
            existingRankings,
          );
          setGlobalTranslators(updatedRankings);

          if (updatedRankings.length > existingRankings.length) {
            setHasUnsavedChanges(true);
          }
        } catch (error) {
          console.error("Failed to parse saved rankings:", error);
          generateDefaultRankings(allSeries);
        }
      } else {
        generateDefaultRankings(allSeries);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const mergeNewTranslators = (
    allSeries: LocalSeries[],
    existingRankings: GlobalTranslatorRanking[],
  ): GlobalTranslatorRanking[] => {
    const currentTranslatorMap = new Map<string, number>();

    allSeries.forEach((series) => {
      series.translators.forEach((translator) => {
        const count = currentTranslatorMap.get(translator.name) || 0;
        currentTranslatorMap.set(
          translator.name,
          count + translator.chapters.length,
        );
      });
    });

    const mergedRankings: GlobalTranslatorRanking[] = [];
    const usedNames = new Set<string>();

    existingRankings.forEach((ranking) => {
      if (currentTranslatorMap.has(ranking.name)) {
        mergedRankings.push({ ...ranking });
        usedNames.add(ranking.name);
      }
    });

    const maxPriority =
      mergedRankings.length > 0
        ? Math.max(...mergedRankings.map((r) => r.priority))
        : -1;

    const newTranslators: { name: string; chapterCount: number }[] = [];
    currentTranslatorMap.forEach((chapterCount, name) => {
      if (!usedNames.has(name)) {
        newTranslators.push({ name, chapterCount });
      }
    });

    newTranslators.sort((a, b) => b.chapterCount - a.chapterCount);

    newTranslators.forEach((translator, index) => {
      mergedRankings.push({
        name: translator.name,
        priority: maxPriority + 1 + index,
        isEnabled: true,
      });
    });

    return mergedRankings;
  };

  const generateDefaultRankings = (allSeries: LocalSeries[]) => {
    const translatorMap = new Map<string, number>();

    allSeries.forEach((series) => {
      series.translators.forEach((translator) => {
        const count = translatorMap.get(translator.name) || 0;
        translatorMap.set(translator.name, count + translator.chapters.length);
      });
    });

    const rankings = Array.from(translatorMap.entries())
      .map(([name]) => ({
        name,
        priority: 0,
        isEnabled: true,
      }))
      .sort((a, b) => {
        const aCount = translatorMap.get(a.name) || 0;
        const bCount = translatorMap.get(b.name) || 0;
        return bCount - aCount;
      })
      .map((item, index) => ({
        ...item,
        priority: index,
      }));

    setGlobalTranslators(rankings);
    setHasUnsavedChanges(false);
  };

  const saveGlobalRankings = () => {
    try {
      localStorage.setItem(
        GLOBAL_RANKINGS_KEY,
        JSON.stringify(globalTranslators),
      );
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Failed to save rankings:", error);
      alert("Failed to save rankings. Please try again.");
    }
  };

  const moveTranslator = (name: string, direction: "up" | "down") => {
    const newRankings = [...globalTranslators];
    const index = newRankings.findIndex((t) => t.name === name);

    if (index === -1) return;

    if (direction === "up" && index > 0) {
      const temp = newRankings[index].priority;
      newRankings[index].priority = newRankings[index - 1].priority;
      newRankings[index - 1].priority = temp;

      [newRankings[index], newRankings[index - 1]] = [
        newRankings[index - 1],
        newRankings[index],
      ];
    } else if (direction === "down" && index < newRankings.length - 1) {
      const temp = newRankings[index].priority;
      newRankings[index].priority = newRankings[index + 1].priority;
      newRankings[index + 1].priority = temp;

      [newRankings[index], newRankings[index + 1]] = [
        newRankings[index + 1],
        newRankings[index],
      ];
    }

    setGlobalTranslators(newRankings);
    setHasUnsavedChanges(true);
  };

  const toggleTranslator = (name: string) => {
    setGlobalTranslators((prev) =>
      prev.map((t) =>
        t.name === name ? { ...t, isEnabled: !t.isEnabled } : t,
      ),
    );
    setHasUnsavedChanges(true);
  };

  const applyGlobalSettings = async () => {
    try {
      setSaving(true);
      saveGlobalRankings();

      const enabledTranslators = globalTranslators
        .filter((t) => t.isEnabled)
        .sort((a, b) => a.priority - b.priority);

      if (enabledTranslators.length === 0) {
        alert("Please enable at least one translator.");
        return;
      }

      const primaryTranslator = enabledTranslators[0].name;
      const backupTranslators = enabledTranslators.slice(1).map((t) => t.name);

      for (const seriesItem of series) {
        const updatedPreferences = {
          primary: primaryTranslator,
          backups: backupTranslators,
          allowBackupOverride: true,
        };

        const updatedSeries = {
          ...seriesItem,
          translatorPreferences: updatedPreferences,
        };

        await saveSeries(updatedSeries);
      }

      alert(
        `Global translator settings applied to all ${series.length} series!`,
      );
      await loadData();
    } catch (error) {
      console.error("Error applying global settings:", error);
      alert("Failed to apply settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    if (
      hasUnsavedChanges &&
      !confirm("You have unsaved changes. Are you sure you want to reset?")
    ) {
      return;
    }
    generateDefaultRankings(series);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <div className="text-white text-lg">Loading settings...</div>
        </div>
      </div>
    );
  }

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

            <div className="text-center flex-1 mx-4">
              <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
              <p className="text-sm text-slate-400">
                Global translator preferences
              </p>
            </div>

            <div className="w-12"></div>
          </div>

          {hasUnsavedChanges && (
            <div className="bg-amber-600/20 border border-amber-600/30 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="text-amber-400" />
                <div className="flex-1">
                  <div className="text-amber-300 font-medium text-sm">
                    Unsaved Changes
                  </div>
                  <div className="text-amber-200 text-xs">
                    Remember to save your rankings
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <Users size={20} className="text-blue-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white">
                  Translator Rankings
                </h2>
                <p className="text-slate-400 text-sm">
                  Set priority order for all series
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              {globalTranslators.map((translator, index) => (
                <div
                  key={translator.name}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-4">
                    <button
                      onClick={() => toggleTranslator(translator.name)}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                        translator.isEnabled
                          ? "bg-blue-600 border-blue-600"
                          : "border-slate-500"
                      }`}
                    >
                      {translator.isEnabled && (
                        <Check size={14} className="text-white" />
                      )}
                    </button>

                    <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
                      <span className="text-slate-300 text-sm font-bold">
                        {index + 1}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-white font-medium truncate block">
                        {translator.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveTranslator(translator.name, "up")}
                        disabled={index === 0}
                        className="p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-slate-700 transition-all"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        onClick={() => moveTranslator(translator.name, "down")}
                        disabled={index === globalTranslators.length - 1}
                        className="p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-slate-700 transition-all"
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <button
                onClick={saveGlobalRankings}
                disabled={!hasUnsavedChanges}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} />
                Save Rankings
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={applyGlobalSettings}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <Users size={18} />
                  )}
                  {saving ? "Applying..." : "Apply to All Series"}
                </button>

                <button
                  onClick={resetToDefaults}
                  className="bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-xl font-medium transition-all"
                >
                  Reset to Defaults
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <button
              onClick={() => setShowSeriesOverview(!showSeriesOverview)}
              className="w-full flex items-center justify-between text-left"
            >
              <div>
                <h3 className="text-lg font-bold text-white mb-1">
                  Series Overview
                </h3>
                <p className="text-slate-400 text-sm">
                  {series.length} series in your library
                </p>
              </div>
              <div
                className={`transform transition-transform ${
                  showSeriesOverview ? "rotate-180" : ""
                }`}
              >
                <ArrowDown size={20} className="text-slate-400" />
              </div>
            </button>

            {showSeriesOverview && (
              <div className="mt-6 space-y-3">
                {series.map((seriesItem) => (
                  <div
                    key={seriesItem.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium mb-2 line-clamp-1">
                          {seriesItem.title}
                        </h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">Primary:</span>
                            <span className="text-slate-300 font-medium truncate">
                              {seriesItem.translatorPreferences.primary}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">Backups:</span>
                            <span className="text-slate-500 text-xs">
                              {seriesItem.translatorPreferences.backups.length}{" "}
                              configured
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          router.push(`/series/${seriesItem.id}/settings`)
                        }
                        className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 rounded-lg text-sm font-medium transition-all"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="safe-bottom" />
    </div>
  );
}
