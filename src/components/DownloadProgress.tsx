"use client";

import { X, RefreshCw, AlertTriangle } from "lucide-react";

interface DownloadProgressProps {
  progress: {
    current: number;
    total: number;
    status: string;
    type?: "setup" | "chapters" | "images";
  };
  error?: {
    message: string;
    type: "network" | "partial" | "cancelled" | "unknown";
    resumeable: boolean;
  } | null;
  onCancel?: () => void;
  onRetry?: () => void;
}

export function DownloadProgress({
  progress,
  error,
  onCancel,
  onRetry,
}: DownloadProgressProps) {
  const percentage = Math.round((progress.current / progress.total) * 100);

  const getProgressLabel = () => {
    switch (progress.type) {
      case "setup":
        return `${progress.current} of ${progress.total} setup steps`;
      case "chapters":
        return `${progress.current} of ${progress.total} chapters`;
      case "images":
        return `${progress.current} of ${progress.total} pages`;
      default:
        return `${progress.current} of ${progress.total} items`;
    }
  };

  const getProgressColor = () => {
    if (error) {
      return error.type === "partial" ? "bg-amber-500" : "bg-red-500";
    }
    switch (progress.type) {
      case "setup":
        return "bg-blue-500";
      case "chapters":
        return "bg-emerald-500";
      case "images":
        return "bg-purple-500";
      default:
        return "bg-blue-500";
    }
  };

  const getErrorIcon = () => {
    if (error?.type === "partial") {
      return <AlertTriangle className="text-amber-400" size={24} />;
    }
    return <X className="text-red-400" size={24} />;
  };

  const getErrorTitle = () => {
    switch (error?.type) {
      case "partial":
        return "Partial Download Complete";
      case "network":
        return "Network Error";
      case "cancelled":
        return "Download Cancelled";
      default:
        return "Download Error";
    }
  };

  const getErrorColor = () => {
    return error?.type === "partial" ? "amber" : "red";
  };

  if (error) {
    const errorColor = getErrorColor();

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 bg-${errorColor}-600/20 rounded-xl`}>
                {getErrorIcon()}
              </div>
              <h3 className="text-white font-bold text-xl">
                {getErrorTitle()}
              </h3>
            </div>
            {onCancel && (
              <button
                onClick={onCancel}
                className="p-2 text-slate-400 hover:text-white rounded-lg"
              >
                <X size={20} />
              </button>
            )}
          </div>

          <div className="space-y-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {percentage}%
              </div>
              <div
                className={`text-${errorColor}-300 text-sm line-clamp-3 min-h-[3rem] flex items-center justify-center`}
              >
                {error.message}
              </div>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full ${getProgressColor()} rounded-full transition-all duration-300`}
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="text-center text-slate-400 text-sm">
              {getProgressLabel()}
            </div>
          </div>

          <div className="space-y-3">
            {error.resumeable && onRetry && (
              <button
                onClick={onRetry}
                className={`w-full bg-${errorColor}-600 hover:bg-${errorColor}-700 text-white py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2`}
              >
                <RefreshCw size={18} />
                {error.type === "partial"
                  ? "Download Remaining"
                  : "Retry Download"}
              </button>
            )}

            {onCancel && (
              <button
                onClick={onCancel}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-xl font-medium transition-all"
              >
                {error.resumeable ? "Cancel" : "Close"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-bold text-xl">Downloading...</h3>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 text-slate-400 hover:text-white rounded-lg"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">
              {percentage}%
            </div>
            <div className="text-slate-300 text-sm line-clamp-2 min-h-[2.5rem] flex items-center justify-center">
              {progress.status}
            </div>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full ${getProgressColor()} rounded-full transition-all duration-300`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="text-center text-slate-400 text-sm">
            {getProgressLabel()}
          </div>

          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-medium transition-all"
            >
              Cancel Download
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
