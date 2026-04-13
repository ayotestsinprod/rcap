export const WORKSPACE_TASKS_PAGE_SIZE_DEFAULT = 20;
export const WORKSPACE_TASKS_PAGE_SIZE_MAX = 100;

export type WorkspaceTaskStatus = "pending" | "running" | "done" | "dismissed";
export type WorkspaceTaskSource = "manual" | "meeting_note" | "email" | "import";

export type WorkspaceTaskRow = {
  id: string;
  title: string;
  detail: string | null;
  status: WorkspaceTaskStatus;
  source: WorkspaceTaskSource;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceTasksPageResult = {
  rows: WorkspaceTaskRow[];
  total: number;
};
