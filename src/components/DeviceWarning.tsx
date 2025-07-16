"use client";

import { useState, useEffect } from "react";
import { Smartphone, Monitor, X, Tablet } from "lucide-react";

export function DeviceWarning() {
  const [showWarning, setShowWarning] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const isLargeScreen = window.innerWidth > 1024;
      setShowWarning(isLargeScreen && !isDismissed);

      if (isLargeScreen && !isDismissed) {
        setTimeout(() => setIsVisible(true), 100);
      }
    };

    const handleStoredDismissal = () => {
      const dismissed = localStorage.getItem("device-warning-dismissed");
      if (dismissed === "true") {
        setIsDismissed(true);
      }
    };

    handleStoredDismissal();
    checkScreenSize();

    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, [isDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      setIsDismissed(true);
      setShowWarning(false);
      localStorage.setItem("device-warning-dismissed", "true");
    }, 300);
  };

  if (!showWarning) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-6 transition-all duration-500 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`relative bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-3xl max-w-lg w-full shadow-2xl transition-all duration-500 ${
          isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-8"
        }`}
      >
        <div className="absolute inset-0 rounded-3xl overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full -translate-x-16 -translate-y-16"></div>
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-purple-500/5 rounded-full translate-x-20 translate-y-20"></div>
        </div>

        <div className="relative p-8">
          <div className="flex items-start justify-between mb-8">
            <div className="flex-1">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/20 border border-amber-500/30 rounded-2xl mb-4">
                <Monitor size={28} className="text-amber-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
                Mobile Experience
              </h2>
              <p className="text-slate-400 text-sm">
                Best viewed on smaller screens
              </p>
            </div>

            <button
              onClick={handleDismiss}
              className="p-2 text-slate-500 hover:text-white hover:bg-slate-800/50 rounded-xl transition-all duration-200"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6">
            <p className="text-slate-300 text-lg leading-relaxed">
              This manga reader is made for mobile devices and tablets. Touch
              gestures, reading flow, and interface elements are optimized for
              smaller screens.
            </p>

            <div className="flex items-center justify-center gap-6 py-6">
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl">
                  <Smartphone size={24} className="text-emerald-400" />
                </div>
                <span className="text-emerald-300 text-sm font-medium">
                  Perfect
                </span>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-2xl">
                  <Tablet size={24} className="text-blue-400" />
                </div>
                <span className="text-blue-300 text-sm font-medium">Great</span>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-slate-600/20 border border-slate-600/30 rounded-2xl">
                  <Monitor size={24} className="text-slate-500" />
                </div>
                <span className="text-slate-500 text-sm font-medium">
                  Limited
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleDismiss}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-4 rounded-2xl font-semibold transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Continue on Desktop
              </button>

              <div className="text-center">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Some features like touch gestures and mobile-optimized layouts
                  may not work as intended on larger screens
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
