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
export interface AskSource {
  chunk_id?: string;
  document_id: string;
  filename: string;
  page_number: number;
  content: string;
  similarity: number;
}
export interface AskResponse {
  query: string;
  answer: string;
  sources: AskSource[];
}
export interface MessageSource {
  chunk_id: string;
  document_id: string;
  page_number: number;
  quote_text: string;
}
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  sources: MessageSource[];
}
export interface ChatConversation {
  id: string;
  user_id: string;
  document_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}
export interface ConversationDetail extends ChatConversation {
  messages: ChatMessage[];
}
async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token)
    throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
  return token;
}
async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new Error("URL backend belum dikonfigurasi.");
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!(init.body instanceof FormData) && init.body !== undefined)
    headers.set("Content-Type", "application/json");

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new Error(
      "Tidak dapat terhubung ke server. Periksa koneksi Anda, lalu coba lagi.",
    );
  }

  if (response.status === 204) return undefined as T;
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
export function listDocuments() {
  return apiRequest<DocumentItem[]>("/documents");
}
export function uploadDocument(file: File) {
  const body = new FormData();
  body.append("file", file);
  return apiRequest<DocumentItem>("/documents", { method: "POST", body });
}
export function processDocument(documentId: string) {
  return apiRequest<{
    document_id: string;
    page_count: number;
    chunk_count: number;
    status: string;
  }>(`/documents/${documentId}/process`, { method: "POST" });
}
export function searchDocuments(query: string, documentId?: string) {
  return apiRequest<SearchResponse>("/search", {
    method: "POST",
    body: JSON.stringify({
      query,
      match_count: 10,
      match_threshold: 0,
      ...(documentId ? { document_id: documentId } : {}),
    }),
  });
}
export function askDocument(query: string, documentId?: string) {
  return apiRequest<AskResponse>("/search/ask", {
    method: "POST",
    body: JSON.stringify({
      query,
      match_count: 20,
      match_threshold: 0,
      ...(documentId ? { document_id: documentId } : {}),
    }),
  });
}
export function deleteDocument(documentId: string) {
  return apiRequest<{ message: string; document_id: string }>(
    `/documents/${documentId}`,
    { method: "DELETE" },
  );
}
export function listConversations(documentId: string) {
  return apiRequest<ChatConversation[]>(
    `/chat/conversations?document_id=${encodeURIComponent(documentId)}`,
  );
}
export function createConversation(documentId: string, title: string) {
  return apiRequest<ChatConversation>("/chat/conversations", {
    method: "POST",
    body: JSON.stringify({ document_id: documentId, title }),
  });
}
export function getConversation(conversationId: string) {
  return apiRequest<ConversationDetail>(
    `/chat/conversations/${encodeURIComponent(conversationId)}`,
  );
}
export function postChatMessage(conversationId: string, content: string) {
  return apiRequest<{
    user_message: ChatMessage;
    assistant_message: ChatMessage;
  }>(`/chat/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}
