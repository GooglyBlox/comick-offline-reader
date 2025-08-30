/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect } from "react";
import { TranslatorInfo, TranslatorPreferences } from "@/types/comick";
import { ArrowUp, ArrowDown, Check, X, BookOpen } from "lucide-react";

interface TranslatorSelectorProps {
  slug: string;
  onSelect: (preferences: TranslatorPreferences, startChapter?: number) => void;
  onCancel: () => void;
}

export function TranslatorSelector({
  slug,
  onSelect,
  onCancel,
}: TranslatorSelectorProps) {
  const [translators, setTranslators] = useState<TranslatorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [primary, setPrimary] = useState<string>("");
  const [backups, setBackups] = useState<string[]>([]);
  const [allowBackupOverride, setAllowBackupOverride] = useState(true);
  const [startFromChapter, setStartFromChapter] = useState<number>(1);
  const [availableChapters, setAvailableChapters] = useState<number[]>([]);

  useEffect(() => {
    loadTranslators();
  }, [slug]);

  const loadTranslators = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/translators/${slug}`);
      if (response.ok) {
        const data = await response.json();
        setTranslators(data);
        if (data.length > 0) {
          setPrimary(data[0].name);
          const allChapters = new Set<number>();
          data.forEach((translator: TranslatorInfo) => {
            translator.chapters.forEach((chapter: number) => {
              allChapters.add(chapter);
            });
          });
          const sortedChapters = Array.from(allChapters).sort((a, b) => a - b);
          setAvailableChapters(sortedChapters);
          if (sortedChapters.length > 0) {
            setStartFromChapter(sortedChapters[0]);
          }
        }
      }
    } catch (error) {
      console.error("Error loading translators:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBackup = (translator: string) => {
    if (backups.includes(translator)) {
      setBackups(backups.filter((t) => t !== translator));
    } else {
      setBackups([...backups, translator]);
    }
  };

  const moveBackup = (translator: string, direction: "up" | "down") => {
    const index = backups.indexOf(translator);
    if (direction === "up" && index > 0) {
      const newBackups = [...backups];
      [newBackups[index], newBackups[index - 1]] = [
        newBackups[index - 1],
        newBackups[index],
      ];
      setBackups(newBackups);
    } else if (direction === "down" && index < backups.length - 1) {
      const newBackups = [...backups];
      [newBackups[index], newBackups[index + 1]] = [
        newBackups[index + 1],
        newBackups[index],
      ];
      setBackups(newBackups);
    }
  };

  const handleConfirm = () => {
    if (!primary) return;

    onSelect({
      primary,
      backups,
      allowBackupOverride,
    }, startFromChapter);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg">
          <div className="text-white text-center text-lg">
            Loading translators...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-bold text-xl">Select Translators</h3>
          <button
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-white rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-3">
              Start from Chapter
            </label>
            <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
              <BookOpen size={16} className="text-slate-400" />
              <select
                value={startFromChapter}
                onChange={(e) => setStartFromChapter(Number(e.target.value))}
                className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
              >
                {availableChapters.map((chapter) => (
                  <option key={chapter} value={chapter}>
                    Chapter {chapter}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-2 p-2 bg-slate-800/30 rounded-lg">
              <div className="text-xs text-slate-400">
                Only chapters from {startFromChapter} onwards will be downloaded
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-3">
              Primary Translator
            </label>
            <div className="space-y-2">
              {translators.map((translator) => (
                <label
                  key={translator.name}
                  className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-800 transition-all"
                >
                  <div className="relative">
                    <input
                      type="radio"
                      name="primary"
                      value={translator.name}
                      checked={primary === translator.name}
                      onChange={(e) => setPrimary(e.target.value)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        primary === translator.name
                          ? "bg-blue-600 border-blue-600"
                          : "border-slate-500"
                      }`}
                    >
                      {primary === translator.name && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">
                      {translator.name}
                    </div>
                    <div className="text-slate-400 text-sm">
                      {translator.chapters.filter(ch => ch >= startFromChapter).length} chapters available from ch. {startFromChapter}, latest: {translator.latestChapter}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={allowBackupOverride}
                  onChange={(e) => setAllowBackupOverride(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    allowBackupOverride
                      ? "bg-blue-600 border-blue-600"
                      : "border-slate-500"
                  }`}
                >
                  {allowBackupOverride && (
                    <Check size={12} className="text-white" />
                  )}
                </div>
              </div>
              <div className="text-slate-300 text-sm">
                Allow backup translators when primary is unavailable
              </div>
            </label>
          </div>

          {allowBackupOverride && (
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-3">
                Backup Translators (in order of preference)
              </label>

              <div className="space-y-2">
                {translators
                  .filter((t) => t.name !== primary)
                  .map((translator) => (
                    <div
                      key={translator.name}
                      className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl"
                    >
                      <button
                        onClick={() => toggleBackup(translator.name)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          backups.includes(translator.name)
                            ? "bg-blue-600 border-blue-600"
                            : "border-slate-500"
                        }`}
                      >
                        {backups.includes(translator.name) && (
                          <Check size={12} className="text-white" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate">
                          {translator.name}
                        </div>
                        <div className="text-slate-400 text-sm">
                          {translator.chapters.filter(ch => ch >= startFromChapter).length} chapters available from ch. {startFromChapter}, latest: {translator.latestChapter}
                        </div>
                      </div>

                      {backups.includes(translator.name) && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => moveBackup(translator.name, "up")}
                            disabled={backups.indexOf(translator.name) === 0}
                            className="p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            onClick={() => moveBackup(translator.name, "down")}
                            disabled={
                              backups.indexOf(translator.name) ===
                              backups.length - 1
                            }
                            className="p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>

              {backups.length > 0 && (
                <div className="mt-3 p-3 bg-slate-800/30 rounded-xl">
                  <div className="text-sm text-slate-400">
                    Priority order: {backups.join(" → ")}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3 pt-4">
            <button
              onClick={handleConfirm}
              disabled={!primary}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-4 rounded-xl font-medium transition-all"
            >
              Confirm Selection
            </button>

            <button
              onClick={onCancel}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-xl font-medium transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
