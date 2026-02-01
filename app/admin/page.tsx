import Link from "next/link";
import { getPhotoCount } from "@/src/db/photos";
import { getLinkCounts } from "@/src/db/links";
import { getOverviewStats, getRecentViews } from "@/src/db/analytics";
import { RecentActivityTable } from "@/src/components/RecentActivityTable";

export const dynamic = "force-dynamic";


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
            <RecentActivityTable
              views={recentViews.map((v) => ({
                ...v,
                viewed_at: String(v.viewed_at),
              }))}
            />
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
