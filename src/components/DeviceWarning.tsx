"use client";

import { useState, useEffect } from "react";
import { Smartphone, Monitor, X, Tablet } from "lucide-react";

export function DeviceWarning() {
  const [showWarning, setShowWarning] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const checkScreenSize = () => {
      const isLargeScreen = window.innerWidth > 1024;
      setShowWarning(isLargeScreen && !isDismissed);
    };

    const handleStoredDismissal = () => {
      try {
        const dismissed = localStorage.getItem("device-warning-dismissed");
        if (dismissed === "true") {
          setIsDismissed(true);
        }
      } catch {
        // Ignore localStorage errors
      }
    };

    handleStoredDismissal();
    checkScreenSize();

    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, [mounted, isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowWarning(false);
    try {
      localStorage.setItem("device-warning-dismissed", "true");
    } catch {
      // Ignore localStorage errors
    }
  };

  if (!mounted || !showWarning) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-end sm:items-center justify-center z-[9999] p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-t-xl sm:rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
              <Monitor size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Mobile Experience
              </h2>
              <p className="text-sm text-slate-400">
                Best viewed on smaller screens
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-slate-300 leading-relaxed">
            This manga reader is designed for mobile devices and tablets. Touch
            gestures, reading flow, and interface elements are optimized for
            smaller screens.
          </p>

          <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-2">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center mx-auto">
                  <Smartphone size={16} className="text-white" />
                </div>
                <div className="text-emerald-400 text-sm font-medium">
                  Perfect
                </div>
              </div>

              <div className="space-y-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mx-auto">
                  <Tablet size={16} className="text-white" />
                </div>
                <div className="text-blue-400 text-sm font-medium">Great</div>
              </div>

              <div className="space-y-2">
                <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center mx-auto">
                  <Monitor size={16} className="text-white" />
                </div>
                <div className="text-slate-500 text-sm font-medium">
                  Limited
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleDismiss}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-lg font-medium transition-colors"
            >
              Continue on Desktop
            </button>
          </div>

          <p className="text-xs text-slate-500 text-center">
            Some features like touch gestures and mobile-optimized layouts may
            not work as intended on larger screens.
          </p>
        </div>
      </div>
    </div>
  );
}
