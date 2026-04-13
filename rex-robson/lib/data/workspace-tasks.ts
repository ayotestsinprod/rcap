import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { tryCreateServiceRoleClient } from "@/lib/supabase/service-role";
import type {
  WorkspaceTaskRow,
  WorkspaceTasksPageResult,
} from "@/lib/data/workspace-tasks.types";
import {
  WORKSPACE_TASKS_PAGE_SIZE_DEFAULT,
  WORKSPACE_TASKS_PAGE_SIZE_MAX,
} from "@/lib/data/workspace-tasks.types";

export {
  WORKSPACE_TASKS_PAGE_SIZE_DEFAULT,
  WORKSPACE_TASKS_PAGE_SIZE_MAX,
};
export type { WorkspaceTaskRow, WorkspaceTasksPageResult };

function mapTaskRow(r: Record<string, unknown>): WorkspaceTaskRow {
  const statusRaw = r.status;
  const status =
    statusRaw === "pending" ||
    statusRaw === "running" ||
    statusRaw === "done" ||
    statusRaw === "dismissed"
      ? statusRaw
      : "pending";
  const sourceRaw = r.source;
  const source =
    sourceRaw === "manual" ||
    sourceRaw === "meeting_note" ||
    sourceRaw === "email" ||
    sourceRaw === "import"
      ? sourceRaw
      : "manual";
  return {
    id: String(r.id ?? ""),
    title: String(r.title ?? ""),
    detail: r.detail == null ? null : String(r.detail),
    status,
    source,
    dueAt: r.due_at == null ? null : String(r.due_at),
    createdAt: r.created_at == null ? "" : String(r.created_at),
    updatedAt: r.updated_at == null ? "" : String(r.updated_at),
  };
}

export async function fetchWorkspaceTasksPageWithClient(
  client: SupabaseClient,
  params: { page: number; pageSize: number; status: string | null },
): Promise<WorkspaceTasksPageResult> {
  const page = Math.max(1, Math.floor(params.page));
  const pageSize = Math.min(
    WORKSPACE_TASKS_PAGE_SIZE_MAX,
    Math.max(1, Math.floor(params.pageSize)),
  );
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  let q = client
    .from("rex_tasks")
    .select("id,title,detail,status,source,due_at,created_at,updated_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false });

  if (
    params.status === "pending" ||
    params.status === "running" ||
    params.status === "done" ||
    params.status === "dismissed"
  ) {
    q = q.eq("status", params.status);
  }

  const { data, error, count } = await q.range(start, end);
  if (error) throw error;
  const rows = (Array.isArray(data) ? data : []).map((r) =>
    mapTaskRow(r as Record<string, unknown>),
  );
  const total =
    typeof count === "number" && Number.isFinite(count) ? count : rows.length;
  return { rows, total };
}

export async function getWorkspaceTasksPage(params: {
  page: number;
  pageSize: number;
  status: string | null;
}): Promise<WorkspaceTasksPageResult> {
  const service = tryCreateServiceRoleClient();
  const userScoped = await createServerSupabaseClient();
  return fetchWorkspaceTasksPageWithClient(service ?? userScoped, params);
}
