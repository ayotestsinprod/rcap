import { NextResponse } from "next/server";
import {
  getWorkspaceWriteClient,
  updateWorkspaceSuggestionStatus,
  type SuggestionStatus,
} from "@/lib/data/workspace-mutations";

export const runtime = "nodejs";

const VALID_STATUSES = new Set<SuggestionStatus>([
  "pending",
  "dismissed",
  "acted",
]);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "id_required" }, { status: 400 });
    }
    const body = (await req.json().catch(() => null)) as
      | { status?: string }
      | null;
    const status = body?.status as SuggestionStatus | undefined;
    if (!status || !VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }
    const client = await getWorkspaceWriteClient();
    await updateWorkspaceSuggestionStatus(client, id, status);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "update_suggestion_failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
