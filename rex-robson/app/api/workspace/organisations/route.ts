import { NextResponse } from "next/server";
import { sanitizeWorkspaceListSearch } from "@/lib/data/workspace-search-sanitize";
import {
  getWorkspaceOrganisationsPage,
  WORKSPACE_ORGANISATIONS_PAGE_SIZE_DEFAULT,
  WORKSPACE_ORGANISATIONS_PAGE_SIZE_MAX,
} from "@/lib/data/workspace-organisations-page";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const qRaw = url.searchParams.get("q") ?? url.searchParams.get("search") ?? "";
  const pageRaw = url.searchParams.get("page");
  const sizeRaw = url.searchParams.get("pageSize") ?? url.searchParams.get("limit");

  const page = pageRaw ? Number.parseInt(pageRaw, 10) : 1;
  const pageSize = sizeRaw
    ? Number.parseInt(sizeRaw, 10)
    : WORKSPACE_ORGANISATIONS_PAGE_SIZE_DEFAULT;

  if (!Number.isFinite(page) || page < 1) {
    return NextResponse.json({ error: "Invalid page" }, { status: 400 });
  }
  if (
    !Number.isFinite(pageSize) ||
    pageSize < 1 ||
    pageSize > WORKSPACE_ORGANISATIONS_PAGE_SIZE_MAX
  ) {
    return NextResponse.json(
      { error: `pageSize must be 1–${WORKSPACE_ORGANISATIONS_PAGE_SIZE_MAX}` },
      { status: 400 },
    );
  }

  const search = sanitizeWorkspaceListSearch(qRaw);

  try {
    const result = await getWorkspaceOrganisationsPage({
      search,
      page,
      pageSize,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Query failed";
    if (process.env.NODE_ENV === "development") {
      console.error("[rex-robson] /api/workspace/organisations:", e);
    }
    return NextResponse.json(
      {
        error: message,
        hint:
          "If this mentions workspace_organisations_page, apply the latest Supabase migration (20260413160000_workspace_orgs_deals_page.sql).",
      },
      { status: 503 },
    );
  }
}
