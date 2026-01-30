import { NextRequest, NextResponse } from "next/server";
import { getLinkById, revokeLink } from "@/src/db/links";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const link = await getLinkById(id);

    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    if (link.revoked) {
      return NextResponse.json(
        { error: "Link already revoked" },
        { status: 400 },
      );
    }

    await revokeLink(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Failed to revoke link:", e);
    return NextResponse.json(
      { error: "Failed to revoke link" },
      { status: 500 },
    );
  }
}
