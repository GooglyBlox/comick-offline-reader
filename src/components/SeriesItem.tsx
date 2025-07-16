/* eslint-disable @next/next/no-img-element */
"use client";

import { LocalSeries } from "@/types/comick";
import {
  BookOpen,
  Trash2,
  RefreshCw,
  Users,
  Settings,
  MoreVertical,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface SeriesItemProps {
  series: LocalSeries;
  onRead: (seriesId: string) => void;
  onUpdate: (seriesId: string) => void;
  onDelete: (seriesId: string) => void;
}

export function SeriesItem({
  series,
  onRead,
  onUpdate,
  onDelete,
}: SeriesItemProps) {
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

  const handleCardClick = () => {
    onRead(series.id);
  };

  const completionPercentage = Math.round(
    (series.downloadedChapters.length / series.totalChapters) * 100,
  );

  return (
    <div
      className="group relative bg-slate-900/40 border border-slate-800/50 rounded-xl overflow-hidden cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-slate-800/50">
        {!imageError ? (
          <img
            src={series.coverUrl}
            alt={series.title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen size={32} className="text-slate-600" />
          </div>
        )}

        <div className="absolute top-2 right-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(!showActions);
            }}
            className="p-2 bg-black/50 backdrop-blur-sm text-white rounded-lg"
          >
            <MoreVertical size={14} />
          </button>

          {showActions && (
            <div className="absolute top-full right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-10 min-w-32">
              <button
                onClick={(e) => {
                  e.stopPropagation();
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
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/series/${series.id}/settings`);
                  setShowActions(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-800 flex items-center gap-2"
              >
                <Settings size={14} />
                Settings
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
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

      <div className="p-3 space-y-2">
        <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2">
          {series.title}
        </h3>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{series.downloadedChapters.length} chapters</span>
            <span className="font-medium">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        <div className="flex items-center text-xs text-slate-500">
          <Users size={10} className="mr-1" />
          <span className="truncate">
            {series.translatorPreferences.primary}
          </span>
        </div>
      </div>
    </div>
  );
}
