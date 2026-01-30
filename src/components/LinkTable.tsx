"use client";

import Link from "next/link";
import { useState } from "react";

interface LinkItem {
  id: string;
  code: string;
  status: "active" | "expired" | "revoked";
  expires_at: string;
  created_at: string;
  photo_count: number;
}

interface LinkTableProps {
  links: LinkItem[];
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const url = `${window.location.origin}/${code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="text-zinc-400 transition hover:text-white"
      title="Copy share link"
    >
      {copied ? (
        <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

function OpenButton({ code }: { code: string }) {
  return (
    <a
      href={`/${code}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-zinc-400 transition hover:text-white"
      title="Open share link"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400",
  expired: "bg-zinc-500/20 text-zinc-400",
  revoked: "bg-red-500/20 text-red-400",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "Expired";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  const minutes = Math.floor(diff / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

export default function LinkTable({ links }: LinkTableProps) {
  if (links.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-700 py-16 text-center text-zinc-500">
        No links found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-400">
            <th className="pb-3 pr-4 font-medium">Code</th>
            <th className="pb-3 pr-4 font-medium">Status</th>
            <th className="pb-3 pr-4 font-medium">Photos</th>
            <th className="pb-3 pr-4 font-medium">Expires</th>
            <th className="pb-3 pr-4 font-medium">Created</th>
            <th className="pb-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {links.map((link) => (
            <tr key={link.id} className="border-b border-zinc-800/50">
              <td className="py-3 pr-4">
                <code className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-white">
                  {link.code}
                </code>
              </td>
              <td className="py-3 pr-4">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[link.status]}`}
                >
                  {link.status}
                </span>
              </td>
              <td className="py-3 pr-4 text-zinc-300">{link.photo_count}</td>
              <td className="py-3 pr-4 text-zinc-300">
                {link.status === "active"
                  ? timeUntil(link.expires_at)
                  : formatDate(link.expires_at)}
              </td>
              <td className="py-3 pr-4 text-zinc-400">
                {formatDate(link.created_at)}
              </td>
              <td className="py-3">
                <div className="flex items-center justify-end gap-3">
                  <CopyButton code={link.code} />
                  <OpenButton code={link.code} />
                  <Link
                    href={`/admin/links/${link.id}`}
                    className="text-zinc-400 transition hover:text-white"
                  >
                    Edit
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
