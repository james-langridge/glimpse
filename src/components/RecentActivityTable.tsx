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

function ActivityCard({ view }: { view: RecentView }) {
  const router = useRouter();
  const location =
    [view.city, view.country].filter(Boolean).join(", ") || "-";
  const browser =
    [view.browser, view.os].filter(Boolean).join(" / ") || "-";

  return (
    <div
      className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700"
      onClick={() => router.push(`/admin/links/${view.share_link_id}`)}
    >
      <div className="flex items-center justify-between">
        <code className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-white">
          {view.code}
        </code>
        <span className="text-xs text-zinc-600">
          {formatDateTime(String(view.viewed_at))}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-zinc-500">Location</span>
          <p className="text-zinc-300">{location}</p>
        </div>
        <div>
          <span className="text-zinc-500">Device</span>
          <p className="capitalize text-zinc-300">{view.device_type ?? "-"}</p>
        </div>
        <div>
          <span className="text-zinc-500">Browser</span>
          <p className="text-zinc-300">{browser}</p>
        </div>
        <div>
          <span className="text-zinc-500">Duration</span>
          <p className="text-zinc-300">
            {view.session_duration_ms
              ? formatDuration(view.session_duration_ms)
              : "-"}
          </p>
        </div>
      </div>
    </div>
  );
}

export function RecentActivityTable({ views }: { views: RecentView[] }) {
  const router = useRouter();

  return (
    <>
      {/* Mobile: card layout */}
      <div className="flex flex-col gap-3 md:hidden">
        {views.map((view) => (
          <ActivityCard key={view.id} view={view} />
        ))}
      </div>

      {/* Desktop: table layout */}
      <div className="hidden md:block overflow-x-auto">
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
    </>
  );
}
