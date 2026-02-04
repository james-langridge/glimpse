import { NextRequest, NextResponse } from "next/server";
import { deleteLink } from "@/src/db/links";

const MAX_BULK_DELETE = 100;

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

    if (ids.length > MAX_BULK_DELETE) {
      return NextResponse.json(
        { error: `Cannot delete more than ${MAX_BULK_DELETE} links at once` },
        { status: 400 },
      );
    }

    if (!ids.every((id) => typeof id === "string" && id.length > 0)) {
      return NextResponse.json(
        { error: "All ids must be non-empty strings" },
        { status: 400 },
      );
    }

    const deleted: string[] = [];
    const failed: string[] = [];

    for (const id of ids as string[]) {
      try {
        await deleteLink(id);
        deleted.push(id);
      } catch (e) {
        console.error(`Failed to delete link ${id}:`, e);
        failed.push(id);
      }
    }

    return NextResponse.json({ deleted, failed });
  } catch (e) {
    console.error("Bulk delete failed:", e);
    return NextResponse.json(
      { error: "Bulk delete failed" },
      { status: 500 },
    );
  }
}
