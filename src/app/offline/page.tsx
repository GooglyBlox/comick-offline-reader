"use client";

import { WifiOff, RefreshCw, Home } from "lucide-react";
import { useEffect, useState } from "react";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const checkOnline = () => {
      setIsOnline(navigator.onLine);
    };

    checkOnline();
    window.addEventListener("online", checkOnline);
    window.addEventListener("offline", checkOnline);

    return () => {
      window.removeEventListener("online", checkOnline);
      window.removeEventListener("offline", checkOnline);
    };
  }, []);

  const handleRetry = () => {
    if (isOnline) {
      window.location.reload();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="p-6 bg-slate-800/50 rounded-2xl w-fit mx-auto mb-6">
          <WifiOff size={48} className="text-slate-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">
          You&apos;re Offline
        </h1>

        <p className="text-slate-400 mb-8 leading-relaxed">
          This page isn&apos;t available offline. Check your connection and try
          again, or go back to your manga collection.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleRetry}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
          >
            <RefreshCw size={18} />
            Try Again
          </button>

          <button
            onClick={handleGoHome}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
          >
            <Home size={18} />
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
