import { NextRequest, NextResponse } from "next/server";
import { getLinkById, revokeLink } from "@/src/db/links";

const MAX_BULK_REVOKE = 100;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ids: unknown[] = body.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids must be a non-empty array" },
        { status: 400 },
      );
    }

    if (ids.length > MAX_BULK_REVOKE) {
      return NextResponse.json(
        { error: `Cannot revoke more than ${MAX_BULK_REVOKE} links at once` },
        { status: 400 },
      );
    }

    if (!ids.every((id) => typeof id === "string" && id.length > 0)) {
      return NextResponse.json(
        { error: "All ids must be non-empty strings" },
        { status: 400 },
      );
    }

    const revoked: string[] = [];
    const skipped: string[] = [];
    const failed: string[] = [];

    for (const id of ids as string[]) {
      try {
        const link = await getLinkById(id);
        if (!link) {
          failed.push(id);
          continue;
        }
        if (link.revoked) {
          skipped.push(id);
          continue;
        }
        await revokeLink(id);
        revoked.push(id);
      } catch (e) {
        console.error(`Failed to revoke link ${id}:`, e);
        failed.push(id);
      }
    }

    return NextResponse.json({ revoked, skipped, failed });
  } catch (e) {
    console.error("Bulk revoke failed:", e);
    return NextResponse.json(
      { error: "Bulk revoke failed" },
      { status: 500 },
    );
  }
}
