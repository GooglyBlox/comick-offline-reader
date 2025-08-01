"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { getAllSeries } from "@/lib/db";

export function CacheInvalidationBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const checkShouldShow = async () => {
      try {
        const currentCacheVersion = "v1.8";
        const acknowledgedVersion = localStorage.getItem(
          "cache-invalidation-acknowledged",
        );

        if (
          acknowledgedVersion &&
          acknowledgedVersion !== currentCacheVersion
        ) {
          setShowBanner(true);
        } else if (!acknowledgedVersion) {
          const existingSeries = await getAllSeries();
          if (existingSeries.length > 0) {
            setShowBanner(true);
          }
        }
      } catch {
        // Ignore errors
      }
    };

    checkShouldShow();
  }, [mounted]);

  const handleDismiss = () => {
    setShowBanner(false);
    try {
      localStorage.setItem("cache-invalidation-acknowledged", "v1.8");
    } catch {
      // Ignore localStorage errors
    }
  };

  if (!mounted || !showBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900 border-b border-slate-700 safe-top">
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-amber-600/20 border border-amber-600/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-600/20 border border-amber-600/30 rounded-lg">
              <AlertTriangle size={16} className="text-amber-400" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-amber-300 font-semibold text-sm mb-1">
                Cache Update Applied
              </h3>
              <p className="text-amber-200/90 text-xs leading-relaxed">
                We apologize for the inconvenience. Previously cached pages will
                need to be revisited to re-cache them for offline viewing.
              </p>
            </div>

            <button
              onClick={handleDismiss}
              className="p-2 text-amber-400 hover:text-amber-300 hover:bg-amber-600/10 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
