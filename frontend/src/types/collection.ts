export const ROOT_COLLECTION_ID = "collection_root";
export const UNFILED_COLLECTION_ID = "collection_unfiled";

export type CollectionNode = {
  id: string;
  parent_id: string | null;
  name: string;
  description?: string | null;
  path: string;
  is_system: boolean;
  direct_question_count: number;
  total_question_count: number;
  /** Present only for a deleted collection; required by the restore endpoint. */
  deletion_id?: string | null;
  is_deleted: boolean;
  children: CollectionNode[];
};

export type CollectionCreatePayload = { name: string; parent_id?: string | null; description?: string | null };
export type CollectionUpdatePayload = Partial<Pick<CollectionCreatePayload, "name" | "description">>;
export type CollectionDeletePayload = { reason?: string | null };

export type CollectionDeletion = {
  id: string;
  root_collection_id: string;
  collection_ids: string[];
  question_ids: string[];
  reason?: string | null;
  restored_at?: string | null;
  created_at?: string | null;
};

export type QuestionPlacement = { question_id: string; collection_id: string | null };
export type BulkMoveResponse = {
  moved_count?: number;
  failed_count?: number;
  moved_ids?: string[];
  failures?: Array<{ question_id: string; message: string }>;
};
