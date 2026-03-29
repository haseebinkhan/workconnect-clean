"use client";

import { useEffect } from "react";

export default function PresenceTracker() {
  async function updatePresence(isOnline: boolean) {
    try {
      await fetch("/api/presence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isOnline }),
      });
    } catch (error) {
      console.error("presence update failed:", error);
    }
  }

  useEffect(() => {
    // Set online on load
    updatePresence(true);

    // Heartbeat every 30s
    const interval = setInterval(() => {
      updatePresence(true);
    }, 30000);

    // On tab close / refresh ? offline
    const handleUnload = () => {
      navigator.sendBeacon(
        "/api/presence",
        JSON.stringify({ isOnline: false })
      );
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleUnload);

      // fallback offline
      updatePresence(false);
    };
  }, []);

  return null;
}

