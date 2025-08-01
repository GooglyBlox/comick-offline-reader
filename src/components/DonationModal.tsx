"use client";

import { useState, useEffect } from "react";
import { Heart, X, ExternalLink } from "lucide-react";

export function DonationModal() {
  const [showModal, setShowModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const checkShouldShow = () => {
      try {
        const currentVersion = "2025-07";
        const dismissedVersion = localStorage.getItem(
          "donation-modal-dismissed-version",
        );

        const shouldShow = dismissedVersion !== currentVersion;

        if (shouldShow) {
          setShowModal(true);
        } else {
          setIsDismissed(true);
        }
      } catch {
        // Fallback if localStorage fails
        setIsDismissed(true);
      }
    };

    checkShouldShow();
  }, [mounted]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowModal(false);
    try {
      localStorage.setItem("donation-modal-dismissed-version", "2025-07");
    } catch {
      // Ignore localStorage errors
    }
  };

  const handleDonate = () => {
    window.open(
      "https://ko-fi.com/googlyblox",
      "_blank",
      "noopener,noreferrer",
    );
    handleDismiss();
  };

  if (!mounted || !showModal || isDismissed) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-end sm:items-center justify-center z-[9999] p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-t-xl sm:rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
              <Heart size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Support This Project
              </h2>
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
          <div className="space-y-4">
            <p className="text-slate-300 leading-relaxed">
              It costs real money to run this service! Downloading thousands of
              manga panels requires substantial bandwidth.
            </p>

            <p className="text-slate-300 leading-relaxed">
              All costs incurred by deployments of my open source projects are
              paid out of my own pocket. If you appreciate tools like this, any
              support would be incredibly helpful.
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
            <div className="text-slate-200 text-sm">
              <strong>Ko-fi:</strong> Every donation helps cover server costs
              and keeps this project free for everyone.
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleDonate}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-4 px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Heart size={18} />
              Support on Ko-fi
              <ExternalLink size={16} />
            </button>

            <button
              onClick={handleDismiss}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white py-4 px-6 rounded-lg font-medium transition-colors"
            >
              Maybe Later
            </button>
          </div>

          <p className="text-xs text-slate-500 text-center">
            This message appears once. Your support helps keep this service
            running.
          </p>
        </div>
      </div>
    </div>
  );
}
