"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/photos", label: "Photos" },
  { href: "/admin/links", label: "Links" },
  { href: "/admin/analytics", label: "Analytics" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function isActive(item: (typeof navItems)[number]) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* Mobile header */}
      <div className="fixed top-0 right-0 left-0 z-40 flex items-center border-b border-zinc-800 bg-zinc-950 px-4 py-3 md:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="mr-3 flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white"
          aria-label="Toggle menu"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            {sidebarOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" />
            )}
          </svg>
        </button>
        <Link
          href="/admin"
          className="text-sm font-light tracking-[0.3em] text-white"
        >
          GLIMPSE
        </Link>
      </div>

      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed z-50 flex h-full w-52 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-6">
          <Link
            href="/admin"
            className="text-sm font-light tracking-[0.3em] text-white"
            onClick={() => setSidebarOpen(false)}
          >
            GLIMPSE
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`rounded-md px-3 py-2 text-sm transition ${
                isActive(item)
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-zinc-800 px-3 py-4">
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full rounded-md px-3 py-2 text-left text-sm text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-300"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-auto pt-14 md:pt-0">{children}</main>
    </div>
  );
}
