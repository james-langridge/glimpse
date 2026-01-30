"use client";

import { useEffect, useRef } from "react";

interface ProtectedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  onClick?: () => void;
  loading?: "lazy" | "eager";
  blurDataURL?: string | null;
}

export default function ProtectedImage({
  src,
  alt,
  width,
  height,
  className = "",
  onClick,
  loading = "lazy",
  blurDataURL,
}: ProtectedImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;

    const prevent = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const elements = [img, container];
    for (const el of elements) {
      el.addEventListener("contextmenu", prevent);
      el.addEventListener("selectstart", prevent);
      el.addEventListener("dragstart", prevent);
      (el as HTMLElement).draggable = false;
    }

    return () => {
      for (const el of elements) {
        el.removeEventListener("contextmenu", prevent);
        el.removeEventListener("selectstart", prevent);
        el.removeEventListener("dragstart", prevent);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative select-none ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => (e.key === "Enter" || e.key === " ") && onClick()
          : undefined
      }
    >
      {blurDataURL && (
        <img
          src={blurDataURL}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden
        />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={loading}
        className="relative h-full w-full object-cover"
        style={{
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          pointerEvents: "none",
        }}
      />
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "auto",
          touchAction: "manipulation",
        }}
      >
        <rect width="100%" height="100%" fill="transparent" />
      </svg>
    </div>
  );
}
