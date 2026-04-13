import { NextResponse } from "next/server";
import {
  getWorkspaceTasksPage,
  WORKSPACE_TASKS_PAGE_SIZE_DEFAULT,
  WORKSPACE_TASKS_PAGE_SIZE_MAX,
} from "@/lib/data/workspace-tasks";
import {
  getWorkspaceWriteClient,
  insertWorkspaceTask,
} from "@/lib/data/workspace-mutations";

function readTaskCreateBody(
  body: unknown,
):
  | {
      ok: true;
      value: {
        title: string;
        detail: string | null;
        source: "manual" | "meeting_note" | "email" | "import";
        due_at: string | null;
      };
    }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Body must be an object." };
  }
  const o = body as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  if (!title) {
    return { ok: false, error: "title is required." };
  }
  const detail =
    typeof o.detail === "string" ? o.detail.trim() || null : null;
  const sourceRaw = o.source;
  const source =
    sourceRaw === "manual" ||
    sourceRaw === "meeting_note" ||
    sourceRaw === "email" ||
    sourceRaw === "import"
      ? sourceRaw
      : "manual";
  const dueRaw = o.dueAt;
  const due_at =
    typeof dueRaw === "string" && dueRaw.trim() ? dueRaw.trim() : null;
  return { ok: true, value: { title, detail, source, due_at } };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const pageRaw = url.searchParams.get("page");
  const sizeRaw = url.searchParams.get("pageSize") ?? url.searchParams.get("limit");
  const statusRaw = url.searchParams.get("status");

  const page = pageRaw ? Number.parseInt(pageRaw, 10) : 1;
  const pageSize = sizeRaw
    ? Number.parseInt(sizeRaw, 10)
    : WORKSPACE_TASKS_PAGE_SIZE_DEFAULT;
  if (!Number.isFinite(page) || page < 1) {
    return NextResponse.json({ error: "Invalid page" }, { status: 400 });
  }
  if (
    !Number.isFinite(pageSize) ||
    pageSize < 1 ||
    pageSize > WORKSPACE_TASKS_PAGE_SIZE_MAX
  ) {
    return NextResponse.json(
      { error: `pageSize must be 1–${WORKSPACE_TASKS_PAGE_SIZE_MAX}` },
      { status: 400 },
    );
  }

  try {
    const result = await getWorkspaceTasksPage({
      page,
      pageSize,
      status: statusRaw,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Query failed";
    return NextResponse.json(
      {
        error: message,
        hint:
          "Apply migration 20260413190000_rex_tasks.sql if rex_tasks is missing.",
      },
      { status: 503 },
    );
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = readTaskCreateBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const client = await getWorkspaceWriteClient();
    const row = await insertWorkspaceTask(client, parsed.value);
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Insert failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
