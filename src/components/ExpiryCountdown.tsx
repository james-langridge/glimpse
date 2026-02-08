"use client";

import { useEffect, useState } from "react";

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return "";

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    if (remainingHours === 0) return `${days}d`;
    return `${days}d ${remainingHours}h`;
  }
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  }
  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

export default function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    function update() {
      const ms = new Date(expiresAt).getTime() - Date.now();
      if (ms > 0) {
        setTimeLeft(formatTimeLeft(ms));
        setExpired(false);
      } else {
        setTimeLeft("");
        setExpired(true);
      }
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (expired) {
    return (
      <p className="px-4 pt-2 text-center text-sm text-zinc-500">
        This link has expired
      </p>
    );
  }

  if (!timeLeft) return null;

  return (
    <p className="px-4 pt-2 text-center text-sm text-zinc-500">
      You can view this page for another{" "}
      <span className="tabular-nums">{timeLeft}</span>
    </p>
  );
}
