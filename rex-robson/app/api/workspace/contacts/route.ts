import { NextResponse } from "next/server";
import {
  getWorkspaceContactsPage,
  sanitizeContactsSearch,
  WORKSPACE_CONTACTS_PAGE_SIZE_DEFAULT,
  WORKSPACE_CONTACTS_PAGE_SIZE_MAX,
} from "@/lib/data/workspace-contacts-page";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const qRaw = url.searchParams.get("q") ?? url.searchParams.get("search") ?? "";
  const pageRaw = url.searchParams.get("page");
  const sizeRaw = url.searchParams.get("pageSize") ?? url.searchParams.get("limit");

  const page = pageRaw ? Number.parseInt(pageRaw, 10) : 1;
  const pageSize = sizeRaw
    ? Number.parseInt(sizeRaw, 10)
    : WORKSPACE_CONTACTS_PAGE_SIZE_DEFAULT;

  if (!Number.isFinite(page) || page < 1) {
    return NextResponse.json({ error: "Invalid page" }, { status: 400 });
  }
  if (
    !Number.isFinite(pageSize) ||
    pageSize < 1 ||
    pageSize > WORKSPACE_CONTACTS_PAGE_SIZE_MAX
  ) {
    return NextResponse.json(
      { error: `pageSize must be 1–${WORKSPACE_CONTACTS_PAGE_SIZE_MAX}` },
      { status: 400 },
    );
  }

  const search = sanitizeContactsSearch(qRaw);

  try {
    const result = await getWorkspaceContactsPage({
      search,
      page,
      pageSize,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Query failed";
    if (process.env.NODE_ENV === "development") {
      console.error("[rex-robson] /api/workspace/contacts:", e);
    }
    return NextResponse.json(
      {
        error: message,
        hint:
          "If this mentions workspace_contacts_page, apply the latest Supabase migration (20260413150000_workspace_contacts_page.sql).",
      },
      { status: 503 },
    );
  }
}
