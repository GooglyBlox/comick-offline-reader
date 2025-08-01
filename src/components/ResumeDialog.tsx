"use client";

import { BookOpen, Play, X, Plus } from "lucide-react";

interface ResumeDialogProps {
  existingTitle: string;
  existingChapters: number;
  missingChapters: number;
  onResume: () => void;
  onStartNew: () => void;
  onCancel: () => void;
}

export function ResumeDialog({
  existingTitle,
  existingChapters,
  missingChapters,
  onResume,
  onStartNew,
  onCancel,
}: ResumeDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-blue-600/20 rounded-xl">
            <BookOpen className="text-blue-400" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-bold text-xl mb-2">
              Series Already Exists
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              You already have{" "}
              <span className="font-medium text-white">{existingTitle}</span> in
              your library.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-white rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-emerald-400 mb-1">
                  {existingChapters}
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  Downloaded
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400 mb-1">
                  {missingChapters}
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  Available
                </div>
              </div>
            </div>
          </div>

          {missingChapters > 0 && (
            <div className="bg-blue-600/10 border border-blue-600/20 rounded-xl p-3">
              <div className="text-sm text-blue-200">
                <span className="font-medium">
                  {missingChapters} new chapters
                </span>{" "}
                are available for download.
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {missingChapters > 0 ? (
            <>
              <button
                onClick={onResume}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-medium transition-all text-left px-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <Play size={16} />
                      Download Missing Chapters
                    </div>
                    <div className="text-sm text-blue-200">
                      Continue from where you left off
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={onStartNew}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-xl font-medium transition-all text-left px-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <Plus size={16} />
                      Configure New Settings
                    </div>
                    <div className="text-sm text-slate-400">
                      Change translator preferences first
                    </div>
                  </div>
                </div>
              </button>
            </>
          ) : (
            <>
              <div className="bg-emerald-600/10 border border-emerald-600/20 rounded-xl p-4 text-center">
                <div className="text-emerald-300 font-medium text-sm">
                  All available chapters are already downloaded!
                </div>
              </div>

              <button
                onClick={onStartNew}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-medium transition-all text-left px-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <Plus size={16} />
                      Update Settings
                    </div>
                    <div className="text-sm text-blue-200">
                      Change translator preferences
                    </div>
                  </div>
                </div>
              </button>
            </>
          )}

          <button
            onClick={onCancel}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl font-medium transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
