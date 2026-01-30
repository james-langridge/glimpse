"use client";

import { useEffect, useRef } from "react";

interface DurationTrackerProps {
  viewId: number;
}

export default function DurationTracker({ viewId }: DurationTrackerProps) {
  const startTime = useRef(Date.now());
  const lastSent = useRef(0);

  useEffect(() => {
    function sendDuration() {
      const durationMs = Date.now() - startTime.current;
      if (durationMs < 1000 || durationMs === lastSent.current) return;
      lastSent.current = durationMs;

      const body = JSON.stringify({ viewId, durationMs });
      const blob = new Blob([body], { type: "application/json" });

      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/analytics/duration", blob);
      } else {
        fetch("/api/analytics/duration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        sendDuration();
      }
    }

    function handleBeforeUnload() {
      sendDuration();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      sendDuration();
    };
  }, [viewId]);

  return null;
}
