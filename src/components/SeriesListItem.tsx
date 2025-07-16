/* eslint-disable @next/next/no-img-element */
"use client";

import { LocalSeries } from "@/types/comick";
import {
  BookOpen,
  Trash2,
  RefreshCw,
  Users,
  Settings,
  Play,
  Calendar,
  MoreVertical,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface SeriesListItemProps {
  series: LocalSeries;
  onRead: (seriesId: string) => void;
  onUpdate: (seriesId: string) => void;
  onDelete: (seriesId: string) => void;
}

export function SeriesListItem({
  series,
  onRead,
  onUpdate,
  onDelete,
}: SeriesListItemProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const router = useRouter();

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await onUpdate(series.id);
    } finally {
      setIsUpdating(false);
    }
  };

  const completionPercentage = Math.round(
    (series.downloadedChapters.length / series.totalChapters) * 100,
  );

  return (
    <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <div className="w-12 h-16 relative overflow-hidden rounded-lg bg-slate-800/50">
            {!imageError ? (
              <img
                src={series.coverUrl}
                alt={series.title}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen size={16} className="text-slate-600" />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="cursor-pointer" onClick={() => onRead(series.id)}>
            <h3 className="font-semibold text-white text-base leading-tight line-clamp-1 mb-1">
              {series.title}
            </h3>

            <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
              <div className="flex items-center gap-1">
                <Users size={12} />
                <span className="truncate max-w-20">
                  {series.translatorPreferences.primary}
                </span>
              </div>
            </div>

            <div className="mb-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400">
                  {series.downloadedChapters.length} / {series.totalChapters}{" "}
                  chapters
                </span>
                <span className="text-slate-300 font-medium">
                  {completionPercentage}%
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Calendar size={10} />
              <span>
                Updated {new Date(series.lastUpdated).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onRead(series.id)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1.5"
          >
            <Play size={14} className="ml-0.5" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            >
              <MoreVertical size={16} />
            </button>

            {showActions && (
              <div className="absolute top-full right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-10 min-w-32">
                <button
                  onClick={() => {
                    handleUpdate();
                    setShowActions(false);
                  }}
                  disabled={isUpdating}
                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-800 flex items-center gap-2 first:rounded-t-lg"
                >
                  <RefreshCw
                    size={14}
                    className={isUpdating ? "animate-spin" : ""}
                  />
                  Update
                </button>
                <button
                  onClick={() => {
                    router.push(`/series/${series.id}/settings`);
                    setShowActions(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-800 flex items-center gap-2"
                >
                  <Settings size={14} />
                  Settings
                </button>
                <button
                  onClick={() => {
                    onDelete(series.id);
                    setShowActions(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-slate-800 flex items-center gap-2 last:rounded-b-lg"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
