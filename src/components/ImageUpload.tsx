"use client";

import { useRef, useState, type ChangeEvent } from "react";

const MAX_SIZE = 2400;
const QUALITY = 0.8;
const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp";

interface ImageUploadProps {
  onUploadComplete: () => void;
}

export default function ImageUpload({ onUploadComplete }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  async function processFile(file: File): Promise<Blob> {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { colorSpace: "display-p3" })!;

    const img = await createImageBitmap(file);
    const ratio = img.width / img.height;

    const width = Math.round(ratio >= 1 ? MAX_SIZE : MAX_SIZE * ratio);
    const height = Math.round(ratio >= 1 ? MAX_SIZE / ratio : MAX_SIZE);

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(img, 0, 0, width, height);
    img.close();

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob!),
        "image/jpeg",
        QUALITY,
      );
    });
  }

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setProgress({ current: 0, total: files.length });

    try {
      const formData = new FormData();

      for (let i = 0; i < files.length; i++) {
        setProgress({ current: i + 1, total: files.length });

        const file = files[i];
        const needsResize =
          file.type === "image/png" || file.size > 4 * 1024 * 1024;

        if (needsResize) {
          const blob = await processFile(file);
          const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
          const name = file.name.replace(`.${ext}`, ".jpg");
          formData.append("photos", new File([blob], name, { type: "image/jpeg" }));
        } else {
          formData.append("photos", file);
        }
      }

      const res = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Upload failed");
      }

      onUploadComplete();
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
      setProgress({ current: 0, total: 0 });
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <label
        className={`inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition ${
          uploading
            ? "pointer-events-none bg-zinc-700 text-zinc-400"
            : "bg-white text-zinc-950 hover:bg-zinc-200"
        }`}
      >
        {uploading
          ? progress.total > 1
            ? `Processing ${progress.current}/${progress.total}...`
            : "Uploading..."
          : "Upload photos"}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPTED_TYPES}
          multiple
          disabled={uploading}
          onChange={handleChange}
        />
      </label>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
