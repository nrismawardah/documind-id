"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import {
  askDocument,
  AskResponse,
  deleteDocument,
  DocumentItem,
  listDocuments,
  processDocument,
  SearchResponse,
  searchDocuments,
  uploadDocument,
} from "@/lib/api";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const API_URL = process.env.NEXT_PUBLIC_API_URL;

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(status: DocumentItem["status"]): string {
  const labels: Record<DocumentItem["status"], string> = {
    uploaded: "Menunggu proses",
    processing: "Sedang diproses",
    ready: "Siap dicari",
    failed: "Gagal diproses",
    deleting: "Sedang dihapus",
  };
  return labels[status];
}

function statusClass(status: DocumentItem["status"]): string {
  if (status === "ready") return "bg-green-100 text-green-800";
  if (status === "failed") return "bg-red-100 text-red-700";
  if (status === "processing") return "bg-amber-100 text-amber-800";
  return "bg-stone-100 text-stone-700";
}

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: "file" | "search" | "upload" | "trash" | "logout" | "spark" | "book";
  className?: string;
}) {
  const shared = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
    "aria-hidden": true as const,
  };

  switch (name) {
    case "file":
      return (
        <svg {...shared}>
          <path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10z" />
          <path d="M13 3v7h7M8 14h8M8 18h6" />
        </svg>
      );
    case "search":
      return (
        <svg {...shared}>
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path d="m16 16 4.5 4.5" />
        </svg>
      );
    case "upload":
      return (
        <svg {...shared}>
          <path d="M12 16V4m-4 4 4-4 4 4" />
          <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
        </svg>
      );
    case "trash":
      return (
        <svg {...shared}>
          <path d="M3 6h18M8 6V4h8v2m-11 0 1 14h12l1-14M10 10v6m4-6v6" />
        </svg>
      );
    case "logout":
      return (
        <svg {...shared}>
          <path d="M10 17l5-5-5-5m5 5H3" />
          <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
        </svg>
      );
    case "spark":
      return (
        <svg {...shared}>
          <path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2z" />
          <path d="m19 14 1.1 2.1L22 17l-1.9.9L19 20l-1-2.1-2-.9 2-.9z" />
        </svg>
      );
    case "book":
      return (
        <svg {...shared}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z" />
          <path d="M4 5.5v13A2.5 2.5 0 0 1 6.5 16H20M8 7h8M8 10h8" />
        </svg>
      );
  }
}

export default function Home() {
  const [sessionReady, setSessionReady] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentError, setDocumentError] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocument, setSelectedDocument] = useState("all");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(
    null,
  );
  const [searchMode, setSearchMode] = useState<"search" | "ask">("search");
  const [askResponse, setAskResponse] = useState<AskResponse | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readyDocuments = useMemo(
    () => documents.filter((document) => document.status === "ready"),
    [documents],
  );

  const refreshDocuments = useCallback(async () => {
    setDocumentsLoading(true);
    setDocumentError("");
    try {
      const data = await listDocuments();
      setDocuments(data);
    } catch (error) {
      setDocumentError(
        error instanceof Error ? error.message : "Gagal memuat dokumen.",
      );
    } finally {
      setDocumentsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setAuthMessage(error.message);
      setUserEmail(data.session?.user.email ?? "");
      setSessionReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUserEmail(session?.user.email ?? "");
      setSessionReady(true);

      if (!session) {
        setDocuments([]);
        setSearchResponse(null);
      } else if (
        event === "SIGNED_IN" ||
        event === "INITIAL_SESSION" ||
        event === "TOKEN_REFRESHED"
      ) {
        void refreshDocuments();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refreshDocuments]);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthMessage("");

    try {
      if (!API_URL) throw new Error("URL backend belum dikonfigurasi.");

      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        if (!data.session) {
          setIsRegister(false);
          setAuthMessage(
            "Registrasi berhasil. Periksa email untuk konfirmasi, lalu login.",
          );
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const token = data.session?.access_token;
      if (!token) {
        throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
      }

      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        await supabase.auth.signOut();
        throw new Error(
          "Login berhasil, tetapi verifikasi backend gagal. Periksa koneksi backend.",
        );
      }

      setUserEmail(data.session?.user.email ?? email);
      setPassword("");
      setAuthMessage("");
    } catch (error) {
      setAuthMessage(
        error instanceof Error ? error.message : "Autentikasi gagal.",
      );
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    setLogoutLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setEmail("");
      setPassword("");
      setAuthMessage("");
      setUploadMessage("");
      setSearchQuery("");
      setSearchResponse(null);
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Gagal logout.");
    } finally {
      setLogoutLoading(false);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadMessage("");
    setDocumentError("");

    if (
      !file.name.toLowerCase().endsWith(".pdf") ||
      file.type !== "application/pdf"
    ) {
      setUploadMessage("Pilih file PDF yang valid.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadMessage("Ukuran file melebihi batas 10 MB.");
      return;
    }

    setUploadLoading(true);
    setUploadMessage("Mengunggah PDF...");
    try {
      const uploaded = await uploadDocument(file);
      setUploadMessage(
        "PDF berhasil diunggah. Sedang memproses isi dokumen...",
      );
      await refreshDocuments();

      try {
        await processDocument(uploaded.id);
        setUploadMessage("Dokumen berhasil diproses dan siap dicari.");
      } catch (error) {
        setUploadMessage(
          error instanceof Error
            ? `PDF tersimpan, tetapi pemrosesan gagal: ${error.message}`
            : "PDF tersimpan, tetapi pemrosesan gagal.",
        );
      }

      await refreshDocuments();
    } catch (error) {
      setUploadMessage(
        error instanceof Error ? error.message : "Gagal mengunggah PDF.",
      );
    } finally {
      setUploadLoading(false);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = searchQuery.trim();

    if (!query) {
      setSearchError("Masukkan pertanyaan atau kata kunci terlebih dahulu.");
      return;
    }

    setSearchLoading(true);
    setSearchError("");
    setSearchResponse(null);
    setAskResponse(null);

    try {
      const documentId =
        selectedDocument === "all" ? undefined : selectedDocument;

      if (searchMode === "ask") {
        const result = await askDocument(query, documentId);
        setAskResponse(result);
      } else {
        const result = await searchDocuments(query, documentId);
        setSearchResponse(result);
      }
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : "Pencarian gagal.",
      );
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleDelete(document: DocumentItem) {
    const confirmed = window.confirm(
      `Hapus "${document.filename}"? File dan metadata dokumen akan dihapus.`,
    );
    if (!confirmed) return;

    setDocumentError("");
    try {
      await deleteDocument(document.id);
      setDocuments((current) =>
        current.filter((item) => item.id !== document.id),
      );
      if (selectedDocument === document.id) setSelectedDocument("all");
      setSearchResponse((current) => {
        if (!current) return current;
        return {
          ...current,
          results: current.results.filter(
            (result) => result.document_id !== document.id,
          ),
          total_results: current.results.filter(
            (result) => result.document_id !== document.id,
          ).length,
        };
      });
      setUploadMessage(`Dokumen "${document.filename}" berhasil dihapus.`);
    } catch (error) {
      setDocumentError(
        error instanceof Error ? error.message : "Gagal menghapus dokumen.",
      );
    }
  }

  if (!sessionReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F3EFDF] px-6 text-[#1F2A1F]">
        <div className="flex items-center gap-3 rounded-full border border-[#004B08]/10 bg-white/70 px-5 py-3 shadow-sm">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#004B08]" />
          <span className="text-sm font-medium">Menyiapkan DocuMind ID...</span>
        </div>
      </main>
    );
  }

  if (!userEmail) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F3EFDF] px-5 py-12 text-[#1F2A1F]">
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#C99A3D]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-[#004B08]/10 blur-3xl" />

        <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/60 shadow-[0_24px_80px_rgba(31,42,31,0.12)] backdrop-blur-xl md:grid-cols-2">
          <section className="flex flex-col justify-between bg-[#004B08] p-8 text-[#F3EFDF] sm:p-12">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                <Icon name="book" className="h-6 w-6" />
              </div>
              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.28em] text-[#DCC58F]">
                Your documents, understood
              </p>
              <h1 className="mt-4 max-w-sm text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Meet your documents halfway.
              </h1>
              <p className="mt-5 max-w-sm text-sm leading-7 text-[#F3EFDF]/75">
                Temukan informasi dari PDF berbahasa Indonesia melalui pencarian
                semantik dan kutipan yang terhubung ke halaman sumber.
              </p>
            </div>
            <div className="mt-12 flex items-center justify-between border-t border-white/15 pt-5 text-xs text-[#F3EFDF]/60">
              <span>DocuMind ID</span>
              <span>Built for clarity.</span>
            </div>
          </section>

          <section className="p-7 sm:p-12">
            <div className="mb-8">
              <p className="text-sm font-medium text-[#004B08]">
                Selamat datang
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                {isRegister ? "Buat akun baru" : "Masuk ke akun"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#1F2A1F]/65">
                {isRegister
                  ? "Daftar untuk mulai mengelola dokumen PDF-mu."
                  : "Lanjutkan pencarian pengetahuan dari dokumenmu."}
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nama@email.com"
                  className="h-12 w-full rounded-2xl border border-[#1F2A1F]/15 bg-white/80 px-4 text-sm outline-none transition placeholder:text-[#1F2A1F]/35 focus:border-[#004B08] focus:ring-4 focus:ring-[#004B08]/10"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete={
                    isRegister ? "new-password" : "current-password"
                  }
                  minLength={6}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="h-12 w-full rounded-2xl border border-[#1F2A1F]/15 bg-white/80 px-4 text-sm outline-none transition placeholder:text-[#1F2A1F]/35 focus:border-[#004B08] focus:ring-4 focus:ring-[#004B08]/10"
                />
              </div>

              {authMessage && (
                <p
                  role="status"
                  className="rounded-2xl border border-[#C99A3D]/30 bg-[#C99A3D]/10 px-4 py-3 text-sm leading-6"
                >
                  {authMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="flex h-12 w-full items-center justify-center rounded-full bg-[#004B08] px-5 text-sm font-semibold text-white transition hover:bg-[#003906] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {authLoading
                  ? "Memproses..."
                  : isRegister
                    ? "Buat akun"
                    : "Masuk"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#1F2A1F]/65">
              {isRegister ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsRegister((current) => !current);
                  setAuthMessage("");
                }}
                className="font-semibold text-[#004B08] underline decoration-[#C99A3D] decoration-2 underline-offset-4"
              >
                {isRegister ? "Masuk" : "Daftar"}
              </button>
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F3EFDF] text-[#1F2A1F]">
      <header className="sticky top-0 z-20 border-b border-[#1F2A1F]/10 bg-[#F3EFDF]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a href="#" className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#004B08] text-[#F3EFDF]">
              <Icon name="book" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-bold tracking-tight">
                DocuMind ID
              </span>
              <span className="block text-xs text-[#1F2A1F]/55">
                Document intelligence
              </span>
            </span>
          </a>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-48 truncate text-sm text-[#1F2A1F]/65 sm:block">
              {userEmail}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutLoading}
              className="flex items-center gap-2 rounded-full border border-[#1F2A1F]/15 bg-white/50 px-4 py-2.5 text-sm font-medium transition hover:bg-white disabled:opacity-50"
            >
              <Icon name="logout" className="h-4 w-4" />
              <span>{logoutLoading ? "Keluar..." : "Logout"}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <section className="relative overflow-hidden rounded-[2rem] bg-[#004B08] p-7 text-[#F3EFDF] sm:p-10 lg:p-12">
          <div className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full border-[48px] border-white/5" />
          <div className="pointer-events-none absolute bottom-[-5rem] right-40 h-52 w-52 rounded-full bg-[#C99A3D]/20 blur-3xl" />
          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-[#E6D5A8]">
              <Icon name="spark" className="h-4 w-4" />
              Ruang kerja dokumenmu
            </div>
            <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Bukan sekadar menyimpan dokumen. Temukan isinya.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#F3EFDF]/75 sm:text-base">
              Unggah PDF, proses kontennya, lalu cari bagian yang paling relevan
              dengan pertanyaanmu. Setiap hasil menyertakan halaman sumber untuk
              memudahkan verifikasi.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-white/10 px-4 py-2">
                {documents.length} dokumen
              </span>
              <span className="rounded-full bg-white/10 px-4 py-2">
                {readyDocuments.length} siap dicari
              </span>
            </div>
          </div>
        </section>

        {documentError && (
          <div
            role="alert"
            className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800"
          >
            <span>{documentError}</span>
            <button
              type="button"
              onClick={() => void refreshDocuments()}
              className="font-semibold underline underline-offset-4"
            >
              Coba lagi
            </button>
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-[2rem] border border-[#1F2A1F]/10 bg-white/65 p-6 shadow-sm backdrop-blur sm:p-8">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#C99A3D]/20 text-[#004B08]">
                <Icon name="upload" />
              </span>
              <div>
                <h2 className="text-xl font-semibold">Tambah dokumen</h2>
                <p className="mt-1 text-sm leading-6 text-[#1F2A1F]/60">
                  Unggah PDF untuk mengekstrak teks dan menyiapkannya bagi
                  pencarian.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadLoading}
              className="mt-6 flex min-h-40 w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#004B08]/25 bg-[#F3EFDF]/70 px-5 py-7 text-center transition hover:border-[#004B08]/60 hover:bg-[#F3EFDF] disabled:cursor-wait disabled:opacity-60"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#004B08] text-white">
                <Icon name="upload" className="h-5 w-5" />
              </span>
              <span className="mt-4 text-sm font-semibold">
                {uploadLoading
                  ? "Sedang memproses dokumen..."
                  : "Pilih file PDF"}
              </span>
              <span className="mt-1 text-xs text-[#1F2A1F]/55">
                Format PDF · Maksimal 10 MB
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploadLoading}
            />

            {uploadMessage && (
              <p
                role="status"
                className="mt-4 rounded-2xl bg-[#004B08]/5 px-4 py-3 text-sm leading-6 text-[#004B08]"
              >
                {uploadMessage}
              </p>
            )}

            <div className="mt-6 rounded-2xl bg-[#F3EFDF] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#004B08]">
                Alur pemrosesan
              </p>
              <div className="mt-3 space-y-3 text-sm text-[#1F2A1F]/70">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold">
                    1
                  </span>
                  Unggah dan simpan PDF
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold">
                    2
                  </span>
                  Ekstraksi teks dan embedding
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold">
                    3
                  </span>
                  Cari kutipan yang relevan
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-[#1F2A1F]/10 bg-white/65 p-6 shadow-sm backdrop-blur sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#004B08]/10 text-[#004B08]">
                  <Icon name="file" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold">Dokumen saya</h2>
                  <p className="mt-1 text-sm text-[#1F2A1F]/60">
                    PDF yang tersimpan di akunmu.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void refreshDocuments()}
                disabled={documentsLoading}
                className="rounded-full border border-[#1F2A1F]/15 px-4 py-2 text-xs font-semibold transition hover:bg-white disabled:opacity-50"
              >
                {documentsLoading ? "Memuat..." : "Refresh"}
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {!documentsLoading && documents.length === 0 ? (
                <div className="rounded-2xl bg-[#F3EFDF]/80 px-5 py-10 text-center">
                  <Icon
                    name="file"
                    className="mx-auto h-8 w-8 text-[#004B08]/50"
                  />
                  <p className="mt-3 text-sm font-semibold">
                    Belum ada dokumen
                  </p>
                  <p className="mt-1 text-xs text-[#1F2A1F]/55">
                    Unggah PDF pertama untuk memulai.
                  </p>
                </div>
              ) : (
                documents.map((document) => (
                  <article
                    key={document.id}
                    className="rounded-2xl border border-[#1F2A1F]/10 bg-white/70 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3EFDF] text-[#004B08]">
                        <Icon name="file" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-sm font-semibold leading-5">
                          {document.filename}
                        </h3>
                        <p className="mt-1 text-xs text-[#1F2A1F]/55">
                          {formatFileSize(document.file_size_bytes)} ·{" "}
                          {document.page_count == null
                            ? "Jumlah halaman belum tersedia"
                            : `${document.page_count} halaman`}{" "}
                          · {formatDate(document.created_at)}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass(document.status)}`}
                          >
                            {statusLabel(document.status)}
                          </span>
                          {document.status === "ready" && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDocument(document.id);
                                globalThis.document
                                  .getElementById("search-query")
                                  ?.focus();
                              }}
                              className="rounded-full bg-[#004B08]/8 px-3 py-1 text-xs font-semibold text-[#004B08] hover:bg-[#004B08]/15"
                            >
                              Cari di dokumen ini
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void handleDelete(document)}
                            className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50"
                          >
                            <Icon name="trash" className="h-3.5 w-3.5" />
                            Hapus
                          </button>
                        </div>
                        {document.error_message && (
                          <p className="mt-2 break-words text-xs text-red-700">
                            {document.error_message}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-[2rem] border border-[#1F2A1F]/10 bg-white/65 p-6 shadow-sm backdrop-blur sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#C99A3D]/20 text-[#004B08]">
              <Icon name="search" />
            </span>
            <div>
              <h2 className="text-xl font-semibold">Cari isi dokumen</h2>
              <p className="mt-1 text-sm leading-6 text-[#1F2A1F]/60">
                Ajukan pertanyaan atau masukkan kata kunci untuk menemukan
                kutipan yang relevan dari dokumenmu.
              </p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="mt-6">
            <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-[#1F2A1F]/5 p-1.5">
              <button
                type="button"
                onClick={() => {
                  setSearchMode("search");
                  setSearchResponse(null);
                  setAskResponse(null);
                  setSearchError("");
                }}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  searchMode === "search"
                    ? "bg-white text-[#004B08] shadow-sm"
                    : "text-[#1F2A1F]/60 hover:text-[#1F2A1F]"
                }`}
              >
                <Icon name="search" className="h-4 w-4" />
                Semantic Search
              </button>

              <button
                type="button"
                onClick={() => {
                  setSearchMode("ask");
                  setSearchResponse(null);
                  setAskResponse(null);
                  setSearchError("");
                }}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  searchMode === "ask"
                    ? "bg-[#004B08] text-white shadow-sm"
                    : "text-[#1F2A1F]/60 hover:text-[#1F2A1F]"
                }`}
              >
                <Icon name="spark" className="h-4 w-4" />
                Ask AI
              </button>
            </div>

            <label
              htmlFor="search-query"
              className="mb-2 block text-sm font-medium"
            >
              {searchMode === "ask"
                ? "Tanyakan sesuatu tentang dokumen"
                : "Pertanyaan atau kata kunci"}
            </label>
            <textarea
              id="search-query"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Contoh: Apa tujuan utama dokumen ini?"
              rows={3}
              className="w-full resize-y rounded-2xl border border-[#1F2A1F]/15 bg-white/80 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-[#1F2A1F]/35 focus:border-[#004B08] focus:ring-4 focus:ring-[#004B08]/10"
            />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="document-filter"
                  className="mb-2 block text-xs font-medium text-[#1F2A1F]/65"
                >
                  Cakupan pencarian
                </label>
                <select
                  id="document-filter"
                  value={selectedDocument}
                  onChange={(event) => setSelectedDocument(event.target.value)}
                  className="h-11 w-full rounded-full border border-[#1F2A1F]/15 bg-white px-4 text-sm outline-none focus:border-[#004B08]"
                >
                  <option value="all">Semua dokumen siap dicari</option>
                  {readyDocuments.map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.filename}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={searchLoading || readyDocuments.length === 0}
                className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#004B08] px-6 text-sm font-semibold text-white transition hover:bg-[#003906] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon
                  name={searchMode === "ask" ? "spark" : "search"}
                  className="h-4 w-4"
                />
                {searchLoading
                  ? searchMode === "ask"
                    ? "Menyiapkan jawaban..."
                    : "Mencari..."
                  : searchMode === "ask"
                    ? "Tanyakan ke AI"
                    : "Cari kutipan"}
              </button>
            </div>
            {readyDocuments.length === 0 && (
              <p className="mt-3 text-xs text-[#1F2A1F]/55">
                Proses setidaknya satu dokumen hingga statusnya “Siap dicari”
                sebelum memulai pencarian.
              </p>
            )}
          </form>

          {askResponse && (
            <div className="mt-6 space-y-5">
              <div className="rounded-3xl border border-[#004B08]/15 bg-white p-5 sm:p-7">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#004B08]">
                  <Icon name="spark" className="h-5 w-5" />
                  Jawaban AI
                </div>

                <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#1F2A1F]/85">
                  {askResponse.answer}
                </div>

                <p className="mt-5 border-t border-[#1F2A1F]/10 pt-4 text-xs leading-5 text-[#1F2A1F]/55">
                  Jawaban dibuat berdasarkan bagian dokumen yang ditemukan.
                  Periksa sumber berikut untuk memverifikasi informasi.
                </p>
              </div>

              <div className="rounded-3xl border border-[#1F2A1F]/10 bg-[#F3EFDF]/60 p-5 sm:p-7">
                <div className="flex items-center gap-2">
                  <Icon name="book" className="h-5 w-5 text-[#004B08]" />
                  <h3 className="font-semibold text-[#1F2A1F]">
                    Sumber jawaban ({askResponse.sources.length})
                  </h3>
                </div>

                {askResponse.sources.length === 0 ? (
                  <p className="mt-4 text-sm leading-6 text-[#1F2A1F]/60">
                    Tidak ada sumber yang dikembalikan untuk jawaban ini.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {askResponse.sources.map((source, index) => (
                      <article
                        key={`${source.document_id}-${source.page_number}-${index}`}
                        className="rounded-2xl border border-[#1F2A1F]/10 bg-white p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-[#1F2A1F]">
                            {source.filename}
                          </span>
                          <span className="rounded-full bg-[#004B08]/8 px-3 py-1 text-xs font-medium text-[#004B08]">
                            Halaman {source.page_number}
                          </span>
                        </div>

                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#1F2A1F]/70">
                          {source.content}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {searchError && (
            <p
              role="alert"
              className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {searchError}
            </p>
          )}

          {searchResponse && (
            <div className="mt-8">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1F2A1F]/10 pb-4">
                <div>
                  <h3 className="font-semibold">Kutipan yang ditemukan</h3>
                  <p className="mt-1 text-xs text-[#1F2A1F]/55">
                    Hasil untuk: “{searchResponse.query}”
                  </p>
                </div>
                <span className="rounded-full bg-[#004B08]/8 px-3 py-1.5 text-xs font-semibold text-[#004B08]">
                  {searchResponse.total_results} hasil
                </span>
              </div>

              {searchResponse.results.length === 0 ? (
                <div className="mt-5 rounded-2xl bg-[#F3EFDF]/80 px-5 py-8 text-center">
                  <p className="text-sm font-semibold">
                    Belum ada kutipan yang cocok
                  </p>
                  <p className="mt-1 text-xs text-[#1F2A1F]/55">
                    Coba pertanyaan lain atau unggah dokumen yang relevan.
                  </p>
                </div>
              ) : (
                <div className="mt-5 grid gap-4">
                  {searchResponse.results.map((result) => (
                    <article
                      key={result.chunk_id}
                      className="rounded-2xl border border-[#1F2A1F]/10 bg-white/75 p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                          <Icon
                            name="file"
                            className="h-4 w-4 shrink-0 text-[#004B08]"
                          />
                          <span className="break-words">{result.filename}</span>
                        </p>
                        <span className="rounded-full bg-[#C99A3D]/15 px-3 py-1 text-xs font-semibold text-[#725014]">
                          Halaman {result.page_number}
                        </span>
                      </div>
                      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-[#1F2A1F]/80">
                        {result.content}
                      </p>
                      <p className="mt-4 border-t border-[#1F2A1F]/8 pt-3 text-xs text-[#1F2A1F]/50">
                        Skor kemiripan semantik: {result.similarity.toFixed(3)}
                      </p>
                    </article>
                  ))}
                </div>
              )}
              <p className="mt-5 rounded-2xl bg-[#F3EFDF] px-4 py-3 text-xs leading-6 text-[#1F2A1F]/65">
                Catatan: hasil ini merupakan kutipan yang ditemukan melalui
                pencarian semantik, bukan jawaban yang disusun oleh LLM. Periksa
                kutipan dan halaman sumber sebelum menarik kesimpulan.
              </p>
            </div>
          )}
        </section>

        <footer className="flex flex-col gap-2 py-8 text-center text-xs text-[#1F2A1F]/45 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <span>DocuMind ID · Evidence-first document search</span>
          <span>Unggah dengan bijak. Verifikasi sumbernya.</span>
        </footer>
      </div>
    </main>
  );
}
