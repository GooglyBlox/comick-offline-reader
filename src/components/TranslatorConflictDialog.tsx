"use client";

import { Chapter } from "@/types/comick";
import { AlertTriangle } from "lucide-react";

function getTranslatorName(chapter: Chapter): string {
  if (
    chapter.md_chapters_groups &&
    chapter.md_chapters_groups.length > 0 &&
    chapter.md_chapters_groups[0].md_groups?.title
  ) {
    return chapter.md_chapters_groups[0].md_groups.title;
  }

  if (chapter.group_name && chapter.group_name.length > 0) {
    return chapter.group_name[0];
  }

  return "Unknown";
}

interface TranslatorConflictDialogProps {
  conflicts: Chapter[];
  primaryTranslator: string;
  onResolve: (action: "skip" | "download" | "change-preferences") => void;
}

export function TranslatorConflictDialog({
  conflicts,
  primaryTranslator,
  onResolve,
}: TranslatorConflictDialogProps) {
  const conflictTranslators = Array.from(
    new Set(conflicts.map((ch) => getTranslatorName(ch))),
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-amber-600/20 rounded-xl">
            <AlertTriangle className="text-amber-500" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-bold text-xl mb-2">
              Translator Conflict
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              New chapters are available, but they&apos;re not from your primary
              translator.
            </p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Primary:</span>
                <span className="text-white font-medium">
                  {primaryTranslator}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">New chapters from:</span>
                <span className="text-white font-medium">
                  {conflictTranslators.join(", ")}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/30 rounded-xl p-3">
            <div className="text-sm text-slate-400">
              Chapters: {conflicts.map((ch) => ch.chap).join(", ")}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => onResolve("skip")}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-xl font-medium transition-all text-left px-4"
          >
            <div className="font-medium">Skip for now</div>
            <div className="text-sm text-slate-400">
              Wait for primary translator
            </div>
          </button>

          <button
            onClick={() => onResolve("download")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-medium transition-all text-left px-4"
          >
            <div className="font-medium">Download anyway</div>
            <div className="text-sm text-blue-200">Use available chapters</div>
          </button>

          <button
            onClick={() => onResolve("change-preferences")}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-medium transition-all text-left px-4"
          >
            <div className="font-medium">Update preferences</div>
            <div className="text-sm text-emerald-200">
              Change translator settings
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
