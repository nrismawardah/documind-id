import { supabase } from "@/lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface DocumentItem {
  id: string;
  user_id: string;
  filename: string;
  storage_path: string;
  file_size_bytes: number;
  page_count: number | null;
  status: "uploaded" | "processing" | "ready" | "failed" | "deleting";
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  chunk_id: string;
  document_id: string;
  filename: string;
  page_number: number;
  chunk_index: number;
  content: string;
  similarity: number;
}

export interface SearchResponse {
  query: string;
  total_results: number;
  results: SearchResult[];
}

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;

  const token = data.session?.access_token;
  if (!token) {
    throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
  }

  return token;
}

async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (!API_URL) {
    throw new Error("URL backend belum dikonfigurasi.");
  }

  const token = await getAccessToken();
  const headers = new Headers(init.headers);

  headers.set("Authorization", `Bearer ${token}`);

  if (!(init.body instanceof FormData) && init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      typeof payload === "object" &&
      payload !== null &&
      "detail" in payload &&
      typeof payload.detail === "string"
        ? payload.detail
        : `Request gagal (${response.status})`;

    throw new Error(detail);
  }

  return payload as T;
}

export async function listDocuments(): Promise<DocumentItem[]> {
  return apiRequest<DocumentItem[]>("/documents");
}

export async function uploadDocument(file: File): Promise<DocumentItem> {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest<DocumentItem>("/documents", {
    method: "POST",
    body: formData,
  });
}

export async function processDocument(
  documentId: string,
): Promise<{ document_id: string; page_count: number; chunk_count: number; status: string }> {
  return apiRequest(`/documents/${documentId}/process`, {
    method: "POST",
  });
}

export async function searchDocuments(
  query: string,
  documentId?: string,
): Promise<SearchResponse> {
  return apiRequest<SearchResponse>("/search", {
    method: "POST",
    body: JSON.stringify({
      query,
      match_count: 5,
      match_threshold: 0,
      ...(documentId ? { document_id: documentId } : {}),
    }),
  });
}

export async function deleteDocument(
  documentId: string,
): Promise<{ message: string; document_id: string }> {
  return apiRequest(`/documents/${documentId}`, {
    method: "DELETE",
  });
}
