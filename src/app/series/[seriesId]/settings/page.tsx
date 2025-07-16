/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Save } from "lucide-react";
import { TranslatorSelector } from "@/components/TranslatorSelector";
import { getSeries, saveSeries } from "@/lib/db";
import { LocalSeries, TranslatorPreferences } from "@/types/comick";

interface SeriesSettingsPageProps {
  params: {
    seriesId: string;
  };
}

export default function SeriesSettingsPage({
  params,
}: SeriesSettingsPageProps) {
  const [series, setSeries] = useState<LocalSeries | null>(null);
  const [showTranslatorSelector, setShowTranslatorSelector] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadSeries();
  }, [params.seriesId]);

  const loadSeries = async () => {
    try {
      setLoading(true);
      const seriesData = await getSeries(params.seriesId);
      if (!seriesData) {
        router.push("/");
        return;
      }
      setSeries(seriesData);
    } catch (error) {
      console.error("Error loading series:", error);
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const handleTranslatorUpdate = async (preferences: TranslatorPreferences) => {
    if (!series) return;

    try {
      const updatedSeries = {
        ...series,
        translatorPreferences: preferences,
      };

      await saveSeries(updatedSeries);
      setSeries(updatedSeries);
      setShowTranslatorSelector(false);
      alert("Translator preferences updated successfully!");
    } catch (error) {
      console.error("Error updating preferences:", error);
      alert("Failed to update preferences. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-lg">Loading series settings...</div>
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

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12">
        <button
          onClick={() => router.push(`/read/${series.id}`)}
          className="mb-8 text-slate-400 hover:text-white flex items-center gap-2 transition-colors"
        >
          <ChevronLeft size={20} />
          Back to Series
        </button>

        <div className="mb-12">
          <h1 className="text-4xl font-light text-white mb-3 tracking-tight">
            {series.title}
          </h1>
          <p className="text-lg text-slate-400 font-light">
            Manage translator preferences for this series
          </p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
          <h2 className="text-xl font-light text-white mb-6">
            Current Settings
          </h2>

          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-slate-400 text-sm font-medium mb-2">
                Primary Translator
              </label>
              <div className="text-white text-lg">
                {series.translatorPreferences.primary}
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-sm font-medium mb-2">
                Backup Translators
              </label>
              {series.translatorPreferences.backups.length > 0 ? (
                <div className="space-y-2">
                  {series.translatorPreferences.backups.map((backup, index) => (
                    <div key={backup} className="text-slate-300">
                      {index + 1}. {backup}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-500 italic">
                  No backup translators set
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-400 text-sm font-medium mb-2">
                Allow Backup Override
              </label>
              <div className="text-white">
                {series.translatorPreferences.allowBackupOverride
                  ? "Yes"
                  : "No"}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowTranslatorSelector(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Save size={18} />
            Update Translator Settings
          </button>
        </div>

        {showTranslatorSelector && (
          <TranslatorSelector
            slug={series.slug}
            onSelect={handleTranslatorUpdate}
            onCancel={() => setShowTranslatorSelector(false)}
          />
        )}
      </div>
    </div>
  );
}
