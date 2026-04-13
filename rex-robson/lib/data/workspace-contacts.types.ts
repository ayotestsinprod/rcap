export const WORKSPACE_CONTACTS_PAGE_SIZE_DEFAULT = 10;
export const WORKSPACE_CONTACTS_PAGE_SIZE_MAX = 50;

export type WorkspaceContactPageRow = {
  id: string;
  name: string;
  role: string | null;
  geography: string | null;
  organisation_id: string | null;
  organisation_name: string | null;
};

export type WorkspaceContactsPageResult = {
  rows: WorkspaceContactPageRow[];
  total: number;
};
