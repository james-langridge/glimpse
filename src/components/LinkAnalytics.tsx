"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

interface OverviewStats {
  total_views: number;
  unique_visitors: number;
  avg_duration_ms: number;
}

interface ViewOverTime {
  date: string;
  views: number;
}

interface DeviceBreakdown {
  device_type: string;
  count: number;
}

interface BrowserBreakdown {
  browser: string;
  count: number;
}

interface GeoBreakdown {
  country: string;
  city: string;
  count: number;
}

interface RecentView {
  id: number;
  viewed_at: string;
  country: string | null;
  city: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  session_duration_ms: number | null;
}

interface LinkAnalyticsData {
  overview: OverviewStats;
  viewsOverTime: ViewOverTime[];
  devices: DeviceBreakdown[];
  browsers: BrowserBreakdown[];
  geo: GeoBreakdown[];
  recent: RecentView[];
}

const PIE_COLORS = ["#a78bfa", "#818cf8", "#6366f1", "#4f46e5", "#4338ca"];

const DAY_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

function formatDuration(ms: number): string {
  if (ms < 1000) return "< 1s";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type SortDir = "asc" | "desc";

function SortIcon({ direction }: { direction: SortDir | null }) {
  return (
    <svg
      className="ml-1 inline h-3 w-3"
      viewBox="0 0 10 14"
      fill="currentColor"
    >
      <path
        d="M5 0L9 5H1L5 0Z"
        className={direction === "asc" ? "text-white" : "text-zinc-600"}
      />
      <path
        d="M5 14L1 9H9L5 14Z"
        className={direction === "desc" ? "text-white" : "text-zinc-600"}
      />
    </svg>
  );
}

function useTableSort<K extends string>(
  defaultKey: K,
  defaultDir: SortDir,
  stringKeys: K[],
) {
  const [sortKey, setSortKey] = useState<K>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  function handleSort(key: K) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(stringKeys.includes(key) ? "asc" : "desc");
    }
  }

  return { sortKey, sortDir, handleSort } as const;
}

function sortedBy<T, K extends string>(
  items: T[],
  sortKey: K,
  sortDir: SortDir,
  compareFn: (a: T, b: T, key: K) => number,
): T[] {
  const multiplier = sortDir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => multiplier * compareFn(a, b, sortKey));
}

type GeoSortKey = "country" | "city" | "views";

function compareGeo(
  a: GeoBreakdown,
  b: GeoBreakdown,
  key: GeoSortKey,
): number {
  switch (key) {
    case "country":
      return a.country.localeCompare(b.country);
    case "city":
      return a.city.localeCompare(b.city);
    case "views":
      return a.count - b.count;
  }
}

type RecentSortKey = "time" | "location" | "device" | "browser" | "duration";

function compareRecent(
  a: RecentView,
  b: RecentView,
  key: RecentSortKey,
): number {
  switch (key) {
    case "time":
      return (
        new Date(a.viewed_at).getTime() - new Date(b.viewed_at).getTime()
      );
    case "location": {
      const aLoc = [a.city, a.country].filter(Boolean).join(", ");
      const bLoc = [b.city, b.country].filter(Boolean).join(", ");
      return aLoc.localeCompare(bLoc);
    }
    case "device":
      return (a.device_type ?? "").localeCompare(b.device_type ?? "");
    case "browser":
      return (a.browser ?? "").localeCompare(b.browser ?? "");
    case "duration":
      return (a.session_duration_ms ?? 0) - (b.session_duration_ms ?? 0);
  }
}

function RecentViewCard({ view }: { view: RecentView }) {
  const location =
    [view.city, view.country].filter(Boolean).join(", ") || "-";
  const browser =
    [view.browser, view.os].filter(Boolean).join(" / ") || "-";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-300">
          {formatDateTime(view.viewed_at)}
        </span>
        <span className="text-xs text-zinc-500">
          {view.session_duration_ms
            ? formatDuration(view.session_duration_ms)
            : "-"}
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
      </div>
    </div>
  );
}

const TOOLTIP_STYLE = {
  backgroundColor: "#18181b",
  border: "1px solid #3f3f46",
  borderRadius: "8px",
  color: "#e4e4e7",
  fontSize: 13,
};

export default function LinkAnalytics({ linkId }: { linkId: string }) {
  const [data, setData] = useState<LinkAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [days, setDays] = useState(30);
  const geoSort = useTableSort<GeoSortKey>("views", "desc", [
    "country",
    "city",
  ]);
  const recentSort = useTableSort<RecentSortKey>("time", "desc", [
    "location",
    "device",
    "browser",
  ]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/links/${linkId}/analytics?days=${days}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [linkId, days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sortedGeo = useMemo(
    () =>
      data
        ? sortedBy(
            data.geo.slice(0, 20),
            geoSort.sortKey,
            geoSort.sortDir,
            compareGeo,
          )
        : [],
    [data, geoSort.sortKey, geoSort.sortDir],
  );
  const sortedRecent = useMemo(
    () =>
      data
        ? sortedBy(
            data.recent,
            recentSort.sortKey,
            recentSort.sortDir,
            compareRecent,
          )
        : [],
    [data, recentSort.sortKey, recentSort.sortDir],
  );

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin-slow rounded-full border-2 border-zinc-700 border-t-zinc-400" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-zinc-400">Failed to load analytics data</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      {/* Time Period Filter */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1 rounded-lg bg-zinc-900 p-1">
          {DAY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                days === opt.value
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {loading && (
          <div className="h-4 w-4 animate-spin-slow rounded-full border-2 border-zinc-700 border-t-zinc-400" />
        )}
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-zinc-900 p-4">
          <div className="text-xs text-zinc-400">Total Views</div>
          <div className="mt-1 text-2xl font-light text-white">
            {data.overview.total_views.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg bg-zinc-900 p-4">
          <div className="text-xs text-zinc-400">Unique Visitors</div>
          <div className="mt-1 text-2xl font-light text-white">
            {data.overview.unique_visitors.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg bg-zinc-900 p-4">
          <div className="text-xs text-zinc-400">Avg. Duration</div>
          <div className="mt-1 text-2xl font-light text-white">
            {formatDuration(data.overview.avg_duration_ms)}
          </div>
        </div>
      </div>

      {/* Views Over Time */}
      <div className="rounded-lg bg-zinc-900 p-4">
        <h3 className="mb-4 text-sm font-medium text-zinc-300">
          Views Over Time
        </h3>
        {data.viewsOverTime.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.viewsOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: "#71717a", fontSize: 12 }}
                stroke="#3f3f46"
              />
              <YAxis
                tick={{ fill: "#71717a", fontSize: 12 }}
                stroke="#3f3f46"
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={(label) =>
                  new Date(String(label)).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                }
              />
              <Line
                type="monotone"
                dataKey="views"
                stroke="#a78bfa"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#a78bfa" }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-8 text-center text-sm text-zinc-500">
            No views in this period
          </p>
        )}
      </div>

      {/* Device & Browser Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Device Breakdown */}
        <div className="rounded-lg bg-zinc-900 p-4">
          <h3 className="mb-4 text-sm font-medium text-zinc-300">Devices</h3>
          {data.devices.length > 0 ? (
            <div className="flex items-center gap-6">
              <div className="h-48 w-48 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.devices}
                      dataKey="count"
                      nameKey="device_type"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                    >
                      {data.devices.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {data.devices.map((d, i) => (
                  <div key={d.device_type} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                      }}
                    />
                    <span className="text-sm capitalize text-zinc-300">
                      {d.device_type}
                    </span>
                    <span className="text-sm text-zinc-500">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-zinc-500">No data</p>
          )}
        </div>

        {/* Browser Breakdown */}
        <div className="rounded-lg bg-zinc-900 p-4">
          <h3 className="mb-4 text-sm font-medium text-zinc-300">Browsers</h3>
          {data.browsers.length > 0 ? (
            <ResponsiveContainer width="100%" height={192}>
              <BarChart data={data.browsers.slice(0, 6)} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#27272a"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fill: "#71717a", fontSize: 12 }}
                  stroke="#3f3f46"
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="browser"
                  width={80}
                  tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  stroke="#3f3f46"
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="#818cf8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-zinc-500">No data</p>
          )}
        </div>
      </div>

      {/* Geographic Breakdown */}
      <div className="rounded-lg bg-zinc-900 p-4">
        <h3 className="mb-4 text-sm font-medium text-zinc-300">
          Geographic Breakdown
        </h3>
        {data.geo.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-zinc-400">
                  {(
                    [
                      {
                        key: "country" as const,
                        label: "Country",
                        align: "text-left",
                      },
                      {
                        key: "city" as const,
                        label: "City",
                        align: "text-left",
                      },
                      {
                        key: "views" as const,
                        label: "Views",
                        align: "text-right",
                      },
                    ] as const
                  ).map((col) => (
                    <th
                      key={col.key}
                      className={`pb-2 font-medium ${col.align}`}
                    >
                      <button
                        onClick={() => geoSort.handleSort(col.key)}
                        className="inline-flex items-center transition hover:text-white"
                      >
                        {col.label}
                        <SortIcon
                          direction={
                            geoSort.sortKey === col.key
                              ? geoSort.sortDir
                              : null
                          }
                        />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedGeo.map((row, i) => (
                  <tr key={i} className="border-b border-zinc-800/50">
                    <td className="py-2 text-zinc-200">{row.country}</td>
                    <td className="py-2 text-zinc-400">{row.city}</td>
                    <td className="py-2 text-right text-zinc-300">
                      {row.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-zinc-500">No data</p>
        )}
      </div>

      {/* Recent Views */}
      <div className="rounded-lg bg-zinc-900 p-4">
        <h3 className="mb-4 text-sm font-medium text-zinc-300">
          Recent Views
        </h3>
        {data.recent.length > 0 ? (
          <>
            {/* Mobile: card layout */}
            <div className="flex flex-col gap-3 md:hidden">
              {sortedRecent.map((view) => (
                <RecentViewCard key={view.id} view={view} />
              ))}
            </div>

            {/* Desktop: table layout */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-zinc-400">
                    {(
                      [
                        {
                          key: "time" as const,
                          label: "Time",
                          align: "text-left",
                        },
                        {
                          key: "location" as const,
                          label: "Location",
                          align: "text-left",
                        },
                        {
                          key: "device" as const,
                          label: "Device",
                          align: "text-left",
                        },
                        {
                          key: "browser" as const,
                          label: "Browser",
                          align: "text-left",
                        },
                        {
                          key: "duration" as const,
                          label: "Duration",
                          align: "text-right",
                        },
                      ] as const
                    ).map((col) => (
                      <th
                        key={col.key}
                        className={`pb-2 font-medium ${col.align}`}
                      >
                        <button
                          onClick={() => recentSort.handleSort(col.key)}
                          className="inline-flex items-center transition hover:text-white"
                        >
                          {col.label}
                          <SortIcon
                            direction={
                              recentSort.sortKey === col.key
                                ? recentSort.sortDir
                                : null
                            }
                          />
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedRecent.map((view) => (
                    <tr
                      key={view.id}
                      className="border-b border-zinc-800/50"
                    >
                      <td className="py-2 text-zinc-400">
                        {formatDateTime(view.viewed_at)}
                      </td>
                      <td className="py-2 text-zinc-300">
                        {[view.city, view.country].filter(Boolean).join(", ") ||
                          "-"}
                      </td>
                      <td className="py-2 capitalize text-zinc-300">
                        {view.device_type ?? "-"}
                      </td>
                      <td className="py-2 text-zinc-300">
                        {[view.browser, view.os].filter(Boolean).join(" / ") ||
                          "-"}
                      </td>
                      <td className="py-2 text-right text-zinc-400">
                        {view.session_duration_ms
                          ? formatDuration(view.session_duration_ms)
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-zinc-500">
            No views yet
          </p>
        )}
      </div>
    </div>
  );
}
