export const WORKSPACE_EMAILS_PAGE_SIZE_DEFAULT = 12;
export const WORKSPACE_EMAILS_PAGE_SIZE_MAX = 50;

export type WorkspaceEmailListRow = {
  id: string;
  fromName: string | null;
  fromAddress: string;
  subject: string;
  snippet: string | null;
  receivedAt: string;
};

export type WorkspaceEmailsPageResult = {
  rows: WorkspaceEmailListRow[];
  total: number;
};

export type WorkspaceEmailAttachmentRow = {
  id: string;
  filename: string;
  contentType: string | null;
  sizeBytes: number | null;
  storageBucket: string | null;
  storagePath: string | null;
};

export type WorkspaceEmailDetail = {
  id: string;
  receivedAt: string;
  fromName: string | null;
  fromAddress: string;
  toAddresses: string[];
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  snippet: string | null;
  attachments: WorkspaceEmailAttachmentRow[];
};
