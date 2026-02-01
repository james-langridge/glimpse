"use client";

import { useRouter } from "next/navigation";

interface RecentView {
  id: number;
  share_link_id: string;
  code: string;
  city: string | null;
  country: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  session_duration_ms: number | null;
  viewed_at: string;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return "< 1s";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RecentActivityTable({ views }: { views: RecentView[] }) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-400">
            <th className="pb-2 font-medium">Code</th>
            <th className="pb-2 font-medium">Location</th>
            <th className="pb-2 font-medium">Device</th>
            <th className="pb-2 font-medium">Browser</th>
            <th className="pb-2 text-right font-medium">Duration</th>
            <th className="pb-2 text-right font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {views.map((view) => (
            <tr
              key={view.id}
              className="cursor-pointer border-b border-zinc-800/50 transition hover:bg-zinc-800/50"
              onClick={() =>
                router.push(`/admin/links/${view.share_link_id}`)
              }
            >
              <td className="py-2 pr-4 font-mono text-zinc-200">
                {view.code}
              </td>
              <td className="py-2 pr-4 text-zinc-400">
                {[view.city, view.country].filter(Boolean).join(", ") ||
                  "-"}
              </td>
              <td className="py-2 pr-4 capitalize text-zinc-400">
                {view.device_type ?? "-"}
              </td>
              <td className="py-2 pr-4 text-zinc-400">
                {[view.browser, view.os].filter(Boolean).join(" / ") ||
                  "-"}
              </td>
              <td className="py-2 pr-4 text-right text-zinc-500">
                {view.session_duration_ms
                  ? formatDuration(view.session_duration_ms)
                  : "-"}
              </td>
              <td className="py-2 text-right text-zinc-600">
                {formatDateTime(String(view.viewed_at))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
