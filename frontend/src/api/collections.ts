import { request } from "./client";
import type { CollectionCreatePayload, CollectionDeletePayload, CollectionDeletion, CollectionNode, CollectionUpdatePayload } from "../types/collection";

export const getCollectionTree = () => request<CollectionNode[]>("/collections/tree");
export const getDeletedCollections = () => request<CollectionNode[]>("/collections/deleted");
export const createCollection = (payload: CollectionCreatePayload) =>
  request<CollectionNode>("/collections", { method: "POST", body: JSON.stringify(payload) });
export const updateCollection = (id: string, payload: CollectionUpdatePayload) =>
  request<CollectionNode>(`/collections/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const moveCollection = (id: string, target_parent_id: string | null) =>
  request<CollectionNode>(`/collections/${id}/move`, { method: "POST", body: JSON.stringify({ target_parent_id }) });
export const mergeCollection = (id: string, target_collection_id: string) =>
  request<CollectionNode>(`/collections/${id}/merge`, { method: "POST", body: JSON.stringify({ target_collection_id }) });
export const deleteCollection = (id: string, payload: CollectionDeletePayload) =>
  request<CollectionDeletion>(`/collections/${id}`, { method: "DELETE", body: JSON.stringify(payload) });
export const restoreCollection = (deletionId: string) =>
  request<CollectionDeletion>(`/collections/deletions/${deletionId}/restore`, { method: "POST" });
