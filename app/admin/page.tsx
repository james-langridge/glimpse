import Link from "next/link";
import { getPhotoCount } from "@/src/db/photos";
import { getLinkCounts } from "@/src/db/links";
import { getOverviewStats, getRecentViews } from "@/src/db/analytics";

export const dynamic = "force-dynamic";

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

export default async function AdminPage() {
  const [photoCount, linkCounts, overview, recentViews] = await Promise.all([
    getPhotoCount(),
    getLinkCounts(),
    getOverviewStats(30),
    getRecentViews(10),
  ]);

  const cards = [
    { label: "Photos", value: photoCount, href: "/admin/photos" },
    { label: "Active Links", value: linkCounts.active, href: "/admin/links" },
    {
      label: "Total Views (30d)",
      value: overview.total_views,
      href: "/admin/analytics",
    },
    {
      label: "Unique Visitors (30d)",
      value: overview.unique_visitors,
      href: "/admin/analytics",
    },
  ];

  return (
    <div className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-light tracking-widest text-white">
            DASHBOARD
          </h1>
          <p className="mt-1 text-sm text-zinc-400">Overview of your photos</p>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {cards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-lg bg-zinc-900 p-4 transition hover:bg-zinc-800"
            >
              <div className="text-xs text-zinc-400">{card.label}</div>
              <div className="mt-1 text-2xl font-light text-white">
                {card.value.toLocaleString()}
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg bg-zinc-900 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-300">
              Recent Activity
            </h2>
            <Link
              href="/admin/analytics"
              className="text-xs text-zinc-400 transition hover:text-white"
            >
              View all
            </Link>
          </div>
          {recentViews.length > 0 ? (
            <div className="space-y-3">
              {recentViews.map((view) => (
                <div
                  key={view.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-zinc-200">
                      {view.code}
                    </span>
                    <span className="text-zinc-500">
                      {[view.city, view.country]
                        .filter(Boolean)
                        .join(", ") || "Unknown location"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    {view.session_duration_ms && (
                      <span className="text-zinc-500">
                        {formatDuration(view.session_duration_ms)}
                      </span>
                    )}
                    <span className="text-zinc-600">
                      {formatDateTime(String(view.viewed_at))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-zinc-500">
              No views yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
