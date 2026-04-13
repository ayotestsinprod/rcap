export const WORKSPACE_ORGANISATIONS_PAGE_SIZE_DEFAULT = 8;
export const WORKSPACE_ORGANISATIONS_PAGE_SIZE_MAX = 50;

export type WorkspaceOrganisationPageRow = {
  id: string;
  name: string;
  type: string | null;
  description: string | null;
};

export type WorkspaceOrganisationsPageResult = {
  rows: WorkspaceOrganisationPageRow[];
  total: number;
};
