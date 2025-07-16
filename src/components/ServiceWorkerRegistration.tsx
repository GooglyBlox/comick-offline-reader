"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const isLocalhost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "[::1]";

      if (isLocalhost) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister().then((success) => {
              if (success) {
                console.log(
                  "Service Worker unregistered successfully in development",
                );
              }
            });
          });
        });
      } else {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log(
              "Service Worker registered successfully:",
              registration,
            );
          })
          .catch((error) => {
            console.log("Service Worker registration failed:", error);
          });
      }
    }
  }, []);

  return null;
}
