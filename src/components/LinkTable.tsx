"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo, useSyncExternalStore } from "react";

interface LinkItem {
  id: string;
  code: string;
  title: string | null;
  status: "active" | "expired" | "revoked";
  expires_at: string;
  created_at: string;
  photo_count: number;
  preview_photo_ids: string[];
}

interface LinkTableProps {
  links: LinkItem[];
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

function CopyButton({
  code,
  children,
}: {
  code: string;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}/${code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (children) {
    return (
      <button
        onClick={handleCopy}
        className="cursor-pointer transition"
        title="Copy share link"
      >
        {copied ? (
          <span className="text-emerald-400">Copied!</span>
        ) : (
          children
        )}
      </button>
    );
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
      onClick={(e) => e.stopPropagation()}
      className="text-zinc-400 transition hover:text-white"
      title="Open share link"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

const noop = () => () => {};

function ShareButton({ code, title }: { code: string; title: string | null }) {
  const canShare = useSyncExternalStore(
    noop,
    () => typeof navigator.share === "function",
    () => false,
  );

  if (!canShare) return null;

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}/${code}`;
    navigator.share({
      url,
      ...(title ? { title, text: title } : { title: "Glimpse" }),
    });
  }

  return (
    <button
      onClick={handleShare}
      className="text-zinc-400 transition hover:text-white"
      title="Share link"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    </button>
  );
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400",
  expired: "bg-zinc-500/20 text-zinc-400",
  revoked: "bg-red-500/20 text-red-400",
};

function Checkmark({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-3 w-3 text-white"}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M2 6l3 3 5-5" />
    </svg>
  );
}

type SortKey = "code" | "status" | "photos" | "expires" | "created";
type SortDir = "asc" | "desc";

const statusOrder: Record<string, number> = { active: 0, expired: 1, revoked: 2 };

function compareLinkItems(a: LinkItem, b: LinkItem, key: SortKey): number {
  switch (key) {
    case "code":
      return a.code.localeCompare(b.code);
    case "status":
      return (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
    case "photos":
      return a.photo_count - b.photo_count;
    case "expires":
      return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
    case "created":
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  }
}

function SortIcon({ direction }: { direction: SortDir | null }) {
  return (
    <svg className="ml-1 inline h-3 w-3" viewBox="0 0 10 14" fill="currentColor">
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

function PhotoPreviews({
  photoIds,
  totalCount,
}: {
  photoIds: string[];
  totalCount: number;
}) {
  if (photoIds.length === 0) return null;
  const extra = totalCount - photoIds.length;
  return (
    <div className="flex items-center gap-1">
      {photoIds.map((id) => (
        <img
          key={id}
          src={`/api/photos/${id}/image?w=400`}
          alt=""
          className="h-8 w-8 rounded object-cover"
          loading="lazy"
        />
      ))}
      {extra > 0 && (
        <span className="ml-1 text-xs text-zinc-500">+{extra}</span>
      )}
    </div>
  );
}

function LinkCard({
  link,
  selectionMode,
  isSelected,
  onToggleSelect,
}: {
  link: LinkItem;
  selectionMode?: boolean;
  isSelected: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const router = useRouter();

  return (
    <div
      className={`cursor-pointer rounded-lg border bg-zinc-900/50 p-4 transition ${
        isSelected
          ? "border-blue-500 bg-blue-500/5"
          : "border-zinc-800 hover:border-zinc-700"
      }`}
      onClick={() =>
        selectionMode
          ? onToggleSelect?.(link.id)
          : router.push(`/admin/links/${link.id}`)
      }
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectionMode && (
            <div
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                isSelected
                  ? "border-blue-500 bg-blue-500"
                  : "border-zinc-600 bg-zinc-800"
              }`}
            >
              {isSelected && <Checkmark />}
            </div>
          )}
          <CopyButton code={link.code}>
            <code className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-white hover:bg-zinc-700">
              {link.code}
            </code>
          </CopyButton>
          {link.title && (
            <span className="truncate text-sm text-zinc-400">
              {link.title}
            </span>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[link.status]}`}
        >
          {link.status}
        </span>
      </div>
      {link.preview_photo_ids.length > 0 && (
        <div className="mt-3">
          <PhotoPreviews
            photoIds={link.preview_photo_ids}
            totalCount={link.photo_count}
          />
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-zinc-500">Photos</span>
          <p className="text-zinc-300">{link.photo_count}</p>
        </div>
        <div>
          <span className="text-zinc-500">Expires</span>
          <p className="text-zinc-300">
            {link.status === "active"
              ? timeUntil(link.expires_at)
              : formatDate(link.expires_at)}
          </p>
        </div>
        <div className="col-span-2">
          <span className="text-zinc-500">Created</span>
          <p className="text-zinc-400">{formatDate(link.created_at)}</p>
        </div>
      </div>
      {!selectionMode && (
        <div className="mt-3 flex items-center gap-4 border-t border-zinc-800 pt-3">
          <CopyButton code={link.code} />
          <OpenButton code={link.code} />
          <ShareButton code={link.code} title={link.title} />
        </div>
      )}
    </div>
  );
}

export default function LinkTable({
  links,
  selectionMode,
  selectedIds,
  onToggleSelect,
}: LinkTableProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "code" || key === "expires" ? "asc" : "desc");
    }
  }

  const sorted = useMemo(() => {
    const multiplier = sortDir === "asc" ? 1 : -1;
    return [...links].sort((a, b) => multiplier * compareLinkItems(a, b, sortKey));
  }, [links, sortKey, sortDir]);

  if (links.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-700 py-16 text-center text-zinc-500">
        No links found
      </div>
    );
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: "code", label: "Code" },
    { key: "status", label: "Status" },
    { key: "photos", label: "Photos" },
    { key: "expires", label: "Expires" },
    { key: "created", label: "Created" },
  ];

  return (
    <>
      {/* Mobile: card layout */}
      <div className="flex flex-col gap-3 md:hidden">
        {sorted.map((link) => (
          <LinkCard
            key={link.id}
            link={link}
            selectionMode={selectionMode}
            isSelected={!!selectionMode && !!selectedIds?.has(link.id)}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>

      {/* Desktop: table layout */}
      <div className="hidden md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">
              {selectionMode && (
                <th className="w-8 pb-3 pr-4 font-medium"></th>
              )}
              {columns.map((col) => (
                <th key={col.key} className="pb-3 pr-4 font-medium">
                  <button
                    onClick={() => handleSort(col.key)}
                    className="inline-flex items-center transition hover:text-white"
                  >
                    {col.label}
                    <SortIcon direction={sortKey === col.key ? sortDir : null} />
                  </button>
                </th>
              ))}
              {!selectionMode && <th className="pb-3 font-medium"></th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map((link) => {
              const isSelected = selectionMode && selectedIds?.has(link.id);
              return (
                <tr
                  key={link.id}
                  className={`cursor-pointer border-b border-zinc-800/50 transition ${
                    isSelected ? "bg-blue-500/10" : "hover:bg-zinc-800/50"
                  }`}
                  onClick={() =>
                    selectionMode
                      ? onToggleSelect?.(link.id)
                      : router.push(`/admin/links/${link.id}`)
                  }
                >
                  {selectionMode && (
                    <td className="py-3 pr-4">
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded border ${
                          isSelected
                            ? "border-blue-500 bg-blue-500"
                            : "border-zinc-600 bg-zinc-800"
                        }`}
                      >
                        {isSelected && <Checkmark />}
                      </div>
                    </td>
                  )}
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <CopyButton code={link.code}>
                        <code className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-white hover:bg-zinc-700">
                          {link.code}
                        </code>
                      </CopyButton>
                      {link.title && (
                        <span className="truncate text-sm text-zinc-400">
                          {link.title}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[link.status]}`}
                    >
                      {link.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-zinc-300">
                    <div className="flex items-center gap-2">
                      <PhotoPreviews
                        photoIds={link.preview_photo_ids}
                        totalCount={link.photo_count}
                      />
                      {link.preview_photo_ids.length === 0 && link.photo_count}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-zinc-300">
                    {link.status === "active"
                      ? timeUntil(link.expires_at)
                      : formatDate(link.expires_at)}
                  </td>
                  <td className="py-3 pr-4 text-zinc-400">
                    {formatDate(link.created_at)}
                  </td>
                  {!selectionMode && (
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-3">
                        <CopyButton code={link.code} />
                        <OpenButton code={link.code} />
                        <ShareButton code={link.code} title={link.title} />
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
