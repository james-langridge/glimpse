import { NextRequest, NextResponse } from "next/server";
import { getLinkById, getPhotosForLink, isCodeUnique } from "@/src/db/links";
import { generateId, generateShareCode } from "@/src/lib/codes";
import { withTransaction } from "@/src/lib/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const link = await getLinkById(id);

    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    const photos = await getPhotosForLink(id);
    if (photos.length === 0) {
      return NextResponse.json(
        { error: "Cannot duplicate: link has no photos" },
        { status: 400 },
      );
    }

    const duration =
      new Date(link.expires_at).getTime() -
      new Date(link.created_at).getTime();
    const newExpiry = new Date(Date.now() + duration);

    let code = generateShareCode();
    let attempts = 0;
    while (!(await isCodeUnique(code)) && attempts < 10) {
      code = generateShareCode();
      attempts++;
    }
    if (attempts >= 10) {
      return NextResponse.json(
        { error: "Failed to generate unique code" },
        { status: 500 },
      );
    }

    const newId = generateId();
    const linkTitle = link.title ?? null;

    await withTransaction(async (client) => {
      await client.query(
        "INSERT INTO share_links (id, code, title, expires_at) VALUES ($1, $2, $3, $4)",
        [newId, code, linkTitle, newExpiry.toISOString()],
      );
      for (let i = 0; i < photos.length; i++) {
        await client.query(
          "INSERT INTO share_link_photos (share_link_id, photo_id, display_order) VALUES ($1, $2, $3)",
          [newId, photos[i].id, i],
        );
      }
    });

    return NextResponse.json({ id: newId, code });
  } catch (e) {
    console.error("Failed to duplicate link:", e);
    return NextResponse.json(
      { error: "Failed to duplicate link" },
      { status: 500 },
    );
  }
}
