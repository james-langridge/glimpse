"use client";

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

  function isActive(item: (typeof navItems)[number]) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <aside className="flex w-52 shrink-0 flex-col border-r border-zinc-800">
        <div className="px-5 py-6">
          <Link
            href="/admin"
            className="text-sm font-light tracking-[0.3em] text-white"
          >
            GLIMPSE
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
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
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
