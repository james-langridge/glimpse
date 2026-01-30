import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { generateId } from "@/src/lib/codes";
import { savePhoto, deletePhotoFile } from "@/src/lib/storage";
import { insertPhoto } from "@/src/db/photos";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("photos") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploaded = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        continue;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const image = sharp(buffer);
      const metadata = await image.metadata();

      const width = metadata.width ?? null;
      const height = metadata.height ?? null;
      const aspectRatio =
        width && height ? Math.round((width / height) * 100) / 100 : 1.5;

      // Generate blur placeholder (tiny base64 image)
      const blurBuffer = await image
        .resize(20, 20, { fit: "inside" })
        .jpeg({ quality: 40 })
        .toBuffer();
      const blurData = `data:image/jpeg;base64,${blurBuffer.toString("base64")}`;

      const id = generateId();
      const ext = (file.name.split(".").pop()?.toLowerCase() ?? "jpg").replace(
        /[^a-z0-9]/g,
        "",
      );
      const filename = `${id}.${ext || "jpg"}`;

      await savePhoto(filename, buffer);
      try {
        await insertPhoto({
          id,
          filename,
          original_name: file.name,
          width,
          height,
          aspect_ratio: aspectRatio,
          blur_data: blurData,
          file_size: buffer.length,
        });
      } catch (e) {
        await deletePhotoFile(filename);
        throw e;
      }

      uploaded.push({ id, filename });
    }

    return NextResponse.json({ uploaded });
  } catch (e) {
    console.error("Upload failed:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
