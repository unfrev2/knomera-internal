/**
 * Shared metadata expectations for new domain objects (Stage 2+).
 * Not every object needs every field — only add what is meaningful.
 */

export type WorkspaceScopedRecord = {
  id: string;
  workspace_id: string;
  created_at: string;
  updated_at?: string;
  created_by?: string | null;
};

export type OwnedRecord = WorkspaceScopedRecord & {
  owner?: string | null;
};

export type ScheduledRecord = OwnedRecord & {
  target_date?: string | null;
};

export type StatusRecord<TStatus extends string> = WorkspaceScopedRecord & {
  status: TStatus;
};
