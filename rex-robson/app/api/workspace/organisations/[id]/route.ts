import { NextResponse } from "next/server";
import { parseOrganisationUpsertBody } from "@/lib/api/workspace-entity-bodies";
import { isValidUuid, readJsonObject } from "@/lib/api/workspace-post-parse";
import {
  getWorkspaceWriteClient,
  updateWorkspaceOrganisation,
} from "@/lib/data/workspace-mutations";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const parsed = await readJsonObject(req);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const fields = parseOrganisationUpsertBody(parsed.body);
  if (!fields.ok) {
    return NextResponse.json({ error: fields.error }, { status: 400 });
  }

  try {
    const client = await getWorkspaceWriteClient();
    const row = await updateWorkspaceOrganisation(client, id, {
      name: fields.value.name,
      type: fields.value.type,
      description: fields.value.description,
    });
    if (!row) {
      return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    if (process.env.NODE_ENV === "development") {
      console.error("[rex-robson] PATCH /api/workspace/organisations/[id]:", e);
    }
    return NextResponse.json(
      {
        error: message,
        hint:
          "Ensure Supabase RLS allows updates (authenticated) or set SUPABASE_SERVICE_ROLE_KEY for local dev.",
      },
      { status: 503 },
    );
  }
}
