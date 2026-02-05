"use client";

import { useState } from "react";
import EmailDownloadModal from "./EmailDownloadModal";

export default function DownloadButton({
  code,
  filename,
  size = "sm",
}: {
  code: string;
  filename: string;
  size?: "sm" | "lg";
}) {
  const [showModal, setShowModal] = useState(false);
  const sizeClass = size === "lg" ? "h-10 w-10" : "h-8 w-8";

  return (
    <>
      <button
        className={`absolute right-2 bottom-2 z-10 flex ${sizeClass} items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80`}
        onClick={(e) => {
          e.stopPropagation();
          setShowModal(true);
        }}
        aria-label="Download photo"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={size === "lg" ? "h-5 w-5" : "h-4 w-4"}
        >
          <path d="M10 3a.75.75 0 01.75.75v7.69l2.22-2.22a.75.75 0 011.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 011.06-1.06l2.22 2.22V3.75A.75.75 0 0110 3z" />
          <path d="M3 15.75a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" />
        </svg>
      </button>
      {showModal && (
        <EmailDownloadModal
          code={code}
          filename={filename}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
