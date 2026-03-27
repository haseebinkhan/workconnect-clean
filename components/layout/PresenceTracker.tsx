"use client";

import { useEffect } from "react";

export default function PresenceTracker() {
  useEffect(() => {
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const updatePresence = async (isOnline: boolean) => {
      try {
        await fetch("/api/presence/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isOnline }),
          keepalive: true, // important for unload
        });
      } catch (error) {
        console.error("Presence update failed:", error);
      }
    };

    // 🟢 On load → online
    updatePresence(true);

    // 🔁 Heartbeat every 30s
    heartbeat = setInterval(() => {
      if (document.visibilityState === "visible") {
        updatePresence(true);
      }
    }, 30000);

    // 👁️ Visibility change
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        updatePresence(true);
      } else {
        updatePresence(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    // ❌ On tab close → offline
    const handleUnload = () => {
      navigator.sendBeacon(
        "/api/presence/update",
        new Blob([JSON.stringify({ isOnline: false })], {
          type: "application/json",
        })
      );
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      if (heartbeat) clearInterval(heartbeat);

      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleUnload);

      updatePresence(false);
    };
  }, []);

  return null;
}