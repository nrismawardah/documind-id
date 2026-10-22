"use client";

import {
  FormEvent,
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import {
  AskResponse,
  ChatConversation,
  ChatMessage,
  DocumentItem,
  askDocument,
  createConversation,
  deleteDocument,
  getConversation,
  listConversations,
  listDocuments,
  postChatMessage,
  processDocument,
  searchDocuments,
  SearchResponse,
  uploadDocument,
} from "@/lib/api";
import {
  ArrowRight,
  BookOpen,
  Copy,
  Eye,
  EyeOff,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
type View = "dashboard" | "search" | "chat";

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const iconProps = { size, strokeWidth: 1.8, "aria-hidden": true as const };
  const icons: Record<
    string,
    React.ComponentType<{
      size?: number;
      strokeWidth?: number;
      "aria-hidden"?: boolean;
    }>
  > = {
    logo: BookOpen,
    book: BookOpen,
    dashboard: LayoutDashboard,
    search: Search,
    chat: MessageCircle,
    file: FileText,
    upload: Upload,
    trash: Trash2,
    logout: LogOut,
    menu: Menu,
    close: X,
    copy: Copy,
    arrow: ArrowRight,
    spark: Sparkles,
    eye: Eye,
    eyeOff: EyeOff,
  };
  const LucideIcon = icons[name] ?? FileText;
  return <LucideIcon {...iconProps} />;
}

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M43.6 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-9 6-15.5Z"
      />
      <path
        fill="#34A853"
        d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.1c-1.8 1.2-4.1 2-6.8 2-5.3 0-9.8-3.6-11.4-8.4H5.7v5.3A20 20 0 0 0 24 44Z"
      />
      <path
        fill="#FBBC05"
        d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.7a20 20 0 0 0 0 17.8l6.9-5.3Z"
      />
      <path
        fill="#EA4335"
        d="M24 12c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 5.8 29.5 4 24 4A20 20 0 0 0 5.7 15.1l6.9 5.3C14.2 15.6 18.7 12 24 12Z"
      />
    </svg>
  );
}
function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
function dateLabel(value: string) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function copyText(value: string) {
  void navigator.clipboard.writeText(value);
}

export default function Home() {
  const [sessionReady, setSessionReady] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [authView, setAuthView] = useState<"landing" | "login" | "register">(
    "landing",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetPasswordMode, setResetPasswordMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<DocumentItem | null>(null);
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docError, setDocError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDoc, setSearchDoc] = useState("all");
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [searchAnswer, setSearchAnswer] = useState<AskResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [chatDoc, setChatDoc] = useState("");
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatQuery, setChatQuery] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [chatLoadingHistory, setChatLoadingHistory] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const readyDocs = useMemo(
    () => documents.filter((d) => d.status === "ready"),
    [documents],
  );
  const refreshDocuments = useCallback(async () => {
    setDocsLoading(true);
    setDocError("");
    try {
      setDocuments(await listDocuments());
    } catch (e) {
      setDocError(e instanceof Error ? e.message : "Gagal memuat dokumen.");
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setAuthMessage(error.message);
      setUserEmail(data.session?.user.email ?? "");
      setSessionReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[AUTH EVENT]", event, {
        hasSession: Boolean(session),
        hasEmail: Boolean(session?.user.email),
      });
      setUserEmail(session?.user.email ?? "");
      setSessionReady(true);
      if (event === "PASSWORD_RECOVERY") {
        setResetPasswordMode(true);
        setForgotPasswordMode(false);
        setAuthView("login");
        setAuthMessage("Silakan masukkan kata sandi baru.");
      }
      if (!session) {
        setDocuments([]);
        setConversations([]);
        setMessages([]);
        setConversationId("");
      } else if (
        ["SIGNED_IN", "INITIAL_SESSION", "TOKEN_REFRESHED"].includes(event)
      )
        void refreshDocuments();
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [refreshDocuments]);

  async function submitAuth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage("");

    const normalizedEmail = email.trim();

    try {
      // Validasi email
      if (!resetPasswordMode && !normalizedEmail) {
        setAuthMessage("Masukkan alamat email terlebih dahulu.");
        return;
      }

      // Validasi khusus registrasi
      if (!forgotPasswordMode && authView === "register") {
        if (password.length < 8) {
          setAuthMessage("Kata sandi minimal 8 karakter.");
          return;
        }

        if (password !== confirmPassword) {
          setAuthMessage("Konfirmasi kata sandi tidak cocok.");
          return;
        }
      }

      // Reset kata sandi
      if (forgotPasswordMode) {
        const { error } = await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo: `${window.location.origin}/?mode=reset-password`,
          },
        );

        if (error) throw error;

        setAuthMessage(
          "Jika email terdaftar, tautan untuk mengatur ulang kata sandi akan dikirim ke email tersebut.",
        );
        setForgotPasswordMode(false);
        return;
      }

      if (resetPasswordMode) {
        if (password.length < 8) {
          throw new Error("Kata sandi baru minimal 8 karakter.");
        }

        if (password !== confirmPassword) {
          throw new Error("Konfirmasi kata sandi tidak cocok.");
        }

        const { error } = await supabase.auth.updateUser({
          password,
        });

        if (error) throw error;

        setPassword("");
        setConfirmPassword("");
        setResetPasswordMode(false);
        setAuthMessage(
          "Kata sandi berhasil diperbarui. Silakan masuk menggunakan kata sandi baru.",
        );
        setAuthView("login");
        await supabase.auth.signOut();

        return;
      }

      // Registrasi
      if (authView === "register") {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
        });

        if (error) throw error;

        setPassword("");
        setConfirmPassword("");

        if (!data.session) {
          setAuthView("login");
          setAuthMessage(
            "Pendaftaran berhasil. Periksa email untuk konfirmasi sebelum login.",
          );
          return;
        }
      } else {
        // Login
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) throw error;
      }

      setPassword("");
      setConfirmPassword("");
      setAuthView("landing");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";

      console.error("[AUTH ERROR]", error);

      if (
        message.includes("invalid login credentials") ||
        message.includes("invalid_credentials")
      ) {
        setAuthMessage(
          "Email atau kata sandi yang kamu masukkan salah. Silakan periksa kembali.",
        );
      } else if (
        message.includes("user already registered") ||
        message.includes("already been registered") ||
        message.includes("already registered")
      ) {
        setAuthMessage(
          "Email ini sudah terdaftar. Silakan login atau gunakan email lain.",
        );
      } else if (
        message.includes("password should be at least") ||
        message.includes("password is too short")
      ) {
        setAuthMessage("Kata sandi minimal 8 karakter.");
      } else if (
        message.includes("invalid email") ||
        message.includes("email address is invalid")
      ) {
        setAuthMessage("Masukkan alamat email dengan format yang benar.");
      } else if (
        message.includes("failed to fetch") ||
        message.includes("networkerror") ||
        message.includes("network request failed")
      ) {
        setAuthMessage(
          "Tidak dapat terhubung ke server. Periksa koneksi internet dan coba lagi.",
        );
      } else {
        setAuthMessage(
          "Autentikasi gagal. Silakan periksa kembali data yang kamu masukkan dan coba lagi.",
        );
      }
    } finally {
      setAuthLoading(false);
    }
  }

  async function signInWithGoogle() {
    setAuthLoading(true);
    setAuthMessage("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
    } catch (e) {
      setAuthMessage(e instanceof Error ? e.message : "Login Google gagal.");
    } finally {
      setAuthLoading(false);
    }
  }
  async function logout() {
    setLogoutLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setAuthView("landing");
      setView("dashboard");
    } catch (e) {
      setDocError(e instanceof Error ? e.message : "Gagal keluar.");
    } finally {
      setLogoutLoading(false);
    }
  }
  async function uploadFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadMessage("");
    setDocError("");
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
    setUploading(true);
    setUploadMessage("Mengunggah PDF...");
    try {
      const doc = await uploadDocument(file);
      await refreshDocuments();
      setUploadMessage("PDF diunggah. Memproses isi dokumen...");
      try {
        await processDocument(doc.id);
        setUploadMessage("Dokumen berhasil diproses dan siap dicari.");
      } catch (err) {
        setUploadMessage(
          err instanceof Error
            ? `PDF tersimpan, tetapi pemrosesan gagal: ${err.message}`
            : "PDF tersimpan, tetapi pemrosesan gagal.",
        );
      }
      await refreshDocuments();
    } catch (err) {
      setUploadMessage(
        err instanceof Error ? err.message : "Gagal mengunggah PDF.",
      );
    } finally {
      setUploading(false);
    }
  }
  async function removeDocument(doc: DocumentItem) {
    setConfirmDelete(doc);
  }
  async function confirmRemoveDocument() {
    const doc = confirmDelete;
    if (!doc) return;
    setConfirmDelete(null);
    try {
      await deleteDocument(doc.id);
      setDocuments((curr) => curr.filter((d) => d.id !== doc.id));
      if (searchDoc === doc.id) {
        setSearchDoc("all");
        setSearchResult(null);
        setSearchAnswer(null);
      }
      if (chatDoc === doc.id) {
        setChatDoc("");
        setConversations([]);
        setMessages([]);
        setConversationId("");
      }
      setUploadMessage(`Dokumen "${doc.filename}" berhasil dihapus.`);
    } catch (err) {
      setDocError(
        err instanceof Error ? err.message : "Gagal menghapus dokumen.",
      );
    }
  }
  async function submitSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      setSearchError("Masukkan pertanyaan atau kata kunci terlebih dahulu.");
      return;
    }
    setSearchLoading(true);
    setSearchError("");
    setSearchResult(null);
    setSearchAnswer(null);
    try {
      const id = searchDoc === "all" ? undefined : searchDoc;
      const [results, answer] = await Promise.all([
        searchDocuments(q, id),
        askDocument(q, id),
      ]);
      // Keep only search excerpts that are among the sources selected as evidence by the answer model.
      const allowed = new Set(
        answer.sources.map(
          (s) => `${s.document_id}:${s.page_number}:${s.content.trim()}`,
        ),
      );
      const relevant = results.results.filter((r) =>
        allowed.has(`${r.document_id}:${r.page_number}:${r.content.trim()}`),
      );
      setSearchResult({
        ...results,
        results: relevant,
        total_results: relevant.length,
      });
      setSearchAnswer(answer);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Pencarian gagal.");
    } finally {
      setSearchLoading(false);
    }
  }
  const loadConversations = useCallback(async (documentId: string) => {
    if (!documentId) {
      setConversations([]);
      return;
    }
    try {
      setConversations(await listConversations(documentId));
    } catch (e) {
      setChatError(
        e instanceof Error ? e.message : "Gagal memuat riwayat chat.",
      );
    }
  }, []);
  async function selectChatDocument(id: string) {
    setChatDoc(id);
    setConversationId("");
    setMessages([]);
    setChatQuery("");
    setChatError("");
    if (id) await loadConversations(id);
    else setConversations([]);
  }
  async function openConversation(id: string) {
    setChatLoadingHistory(true);
    setChatError("");
    try {
      const data = await getConversation(id);
      setConversationId(data.id);
      setChatDoc(data.document_id);
      setMessages(data.messages);
    } catch (e) {
      setChatError(
        e instanceof Error ? e.message : "Gagal membuka percakapan.",
      );
    } finally {
      setChatLoadingHistory(false);
    }
  }
  async function sendChat(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = chatQuery.trim();
    if (!q) return;
    if (!chatDoc) {
      setChatError(
        "Pilih dokumen terlebih dahulu agar chat memiliki sumber yang jelas.",
      );
      return;
    }
    setChatLoading(true);
    setChatError("");
    setChatQuery("");
    const optimistic: ChatMessage = {
      id: `pending-${Date.now()}`,
      role: "user",
      content: q,
      created_at: new Date().toISOString(),
      sources: [],
    };
    setMessages((current) => [...current, optimistic]);
    try {
      let id = conversationId;
      if (!id) {
        const conv = await createConversation(chatDoc, q.slice(0, 80));
        id = conv.id;
        setConversationId(id);
      }
      const result = await postChatMessage(id, q);
      setMessages((current) => [
        ...current.filter((m) => m.id !== optimistic.id),
        result.user_message,
        result.assistant_message,
      ]);
      await loadConversations(chatDoc);
    } catch (err) {
      setMessages((current) => current.filter((m) => m.id !== optimistic.id));
      setChatQuery(q);
      setChatError(err instanceof Error ? err.message : "Pesan gagal dikirim.");
    } finally {
      setChatLoading(false);
    }
  }

  if (!sessionReady)
    return (
      <main className="loading-screen">
        <span className="pulse-dot" />
        Menyiapkan DocuMind ID...
      </main>
    );

  if (!userEmail || resetPasswordMode) {
    if (resetPasswordMode) {
      return (
        <main className="auth-screen">
          <div className="auth-glow" />
          <Link className="brand brand-auth" href="/">
            <span className="brand-icon">
              <Icon name="logo" />
            </span>
            <span>
              DocuMind <b>ID</b>
            </span>
          </Link>
          <section className="auth-card">
            <h1>Atur kata sandi baru</h1>
            <p className="muted">
              Buat kata sandi baru untuk akun DocuMind ID kamu.
            </p>

            <form onSubmit={submitAuth} className="stack-form" noValidate>
              {authMessage && <p className="notice">{authMessage}</p>}

              <label>
                Kata sandi baru
                <span className="password-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Minimal 8 karakter"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    aria-label={
                      showPassword
                        ? "Sembunyikan kata sandi"
                        : "Lihat kata sandi"
                    }
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    <Icon name={showPassword ? "eyeOff" : "eye"} size={17} />
                  </button>
                </span>
              </label>

              <label>
                Konfirmasi kata sandi baru
                <span className="password-field">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Ulangi kata sandi baru"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    aria-label={
                      showConfirmPassword
                        ? "Sembunyikan konfirmasi kata sandi"
                        : "Lihat konfirmasi kata sandi"
                    }
                    onClick={() => setShowConfirmPassword((v) => !v)}
                  >
                    <Icon
                      name={showConfirmPassword ? "eyeOff" : "eye"}
                      size={17}
                    />
                  </button>
                </span>
              </label>

              <button
                className="button button-primary button-wide"
                disabled={authLoading}
              >
                {authLoading ? "Memproses..." : "Simpan kata sandi baru"}
                <Icon name="arrow" size={17} />
              </button>
            </form>
          </section>
        </main>
      );
    }
    if (resetPasswordMode || authView === "login" || authView === "register")
      return (
        <main className="auth-screen">
          <div className="auth-glow" />
          <a
            className="brand brand-auth"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setAuthView("landing");
              setForgotPasswordMode(false);
            }}
          >
            <span className="brand-icon">
              <Icon name="logo" />
            </span>
            <span>
              DocuMind <b>ID</b>
            </span>
          </a>
          <section className="auth-card">
            <h1>
              {forgotPasswordMode
                ? "Atur ulang kata sandi"
                : authView === "register"
                  ? "Buat akun DocuMind"
                  : "Login ke DocuMind"}
            </h1>
            <p className="muted">
              {forgotPasswordMode
                ? "Masukkan email untuk menerima tautan pengaturan ulang kata sandi."
                : authView === "register"
                  ? "Daftar untuk mulai mencari dan bertanya pada dokumen PDF."
                  : "Masuk untuk melanjutkan pekerjaan dokumenmu."}
            </p>
            <form onSubmit={submitAuth} className="stack-form" noValidate>
              {authMessage && <p className="notice">{authMessage}</p>}
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="nama@email.com"
                  autoComplete="email"
                />
              </label>
              {!forgotPasswordMode && (
                <>
                  <label>
                    Kata sandi{" "}
                    <span className="password-field">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={
                          resetPasswordMode
                            ? 8
                            : authView === "register"
                              ? 8
                              : undefined
                        }
                        placeholder={
                          resetPasswordMode
                            ? "Minimal 8 karakter"
                            : authView === "register"
                              ? "Minimal 8 karakter"
                              : "Masukkan kata sandi"
                        }
                        autoComplete={
                          resetPasswordMode || authView === "register"
                            ? "new-password"
                            : "current-password"
                        }
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        aria-label={
                          showPassword
                            ? "Sembunyikan kata sandi"
                            : "Lihat kata sandi"
                        }
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        <Icon
                          name={showPassword ? "eyeOff" : "eye"}
                          size={17}
                        />
                      </button>
                    </span>
                  </label>
                  {(authView === "register" || resetPasswordMode) && (
                    <label>
                      Konfirmasi kata sandi{" "}
                      <span className="password-field">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          minLength={authView === "register" ? 8 : undefined}
                          placeholder="Ulangi kata sandi"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          aria-label={
                            showConfirmPassword
                              ? "Sembunyikan konfirmasi kata sandi"
                              : "Lihat konfirmasi kata sandi"
                          }
                          onClick={() => setShowConfirmPassword((v) => !v)}
                        >
                          <Icon
                            name={showConfirmPassword ? "eyeOff" : "eye"}
                            size={17}
                          />
                        </button>
                      </span>
                    </label>
                  )}
                  {authView === "login" && (
                    <button
                      type="button"
                      className="forgot-link"
                      onClick={() => {
                        setForgotPasswordMode(true);
                        setAuthMessage("");
                      }}
                    >
                      Lupa kata sandi?
                    </button>
                  )}
                </>
              )}
              <button
                className="button button-primary button-wide"
                disabled={authLoading}
              >
                {authLoading
                  ? "Memproses..."
                  : resetPasswordMode
                    ? "Simpan kata sandi baru"
                    : forgotPasswordMode
                      ? "Kirim tautan reset"
                      : authView === "register"
                        ? "Buat akun"
                        : "Login"}

                <Icon name="arrow" size={17} />
              </button>
            </form>
            {!forgotPasswordMode && (
              <>
                <div className="auth-divider">
                  <span>atau</span>
                </div>
                <button
                  className="button button-google button-wide"
                  type="button"
                  disabled={authLoading}
                  onClick={() => void signInWithGoogle()}
                >
                  <GoogleIcon size={20} /> Lanjutkan dengan Google
                </button>
              </>
            )}

            {!forgotPasswordMode && (
              <p className="auth-switch">
                {authView === "register"
                  ? "Sudah punya akun?"
                  : "Belum punya akun?"}{" "}
                <button
                  className="text-button"
                  onClick={() => {
                    setAuthView(authView === "register" ? "login" : "register");
                    setAuthMessage("");
                    setConfirmPassword("");
                  }}
                >
                  {authView === "register" ? "Login" : "Daftar gratis"}
                </button>
              </p>
            )}
            <button
              className="back-link"
              onClick={() => {
                setForgotPasswordMode(false);
                setAuthView("landing");
                setAuthMessage("");
              }}
            >
              ← Kembali ke beranda
            </button>
          </section>
        </main>
      );
    return (
      <main className="landing">
        <nav className="landing-nav">
          <Link className="brand" href="#top">
            <span className="brand-icon">
              <Icon name="logo" />
            </span>
            <span>
              DocuMind <b>ID</b>
            </span>
          </Link>
          <div className="landing-nav-actions">
            <button
              className="button button-ghost"
              onClick={() => setAuthView("login")}
            >
              Login
            </button>
            <button
              className="button button-primary"
              onClick={() => setAuthView("register")}
            >
              Mulai Gratis <Icon name="arrow" size={16} />
            </button>
          </div>
        </nav>
        <section className="landing-hero" id="top">
          <div className="hero-copy">
            <h1>
              Temukan jawaban di dalam <span>dokumenmu.</span>
            </h1>
            <p>
              Unggah PDF, ajukan pertanyaan dengan bahasa sehari-hari, dan
              telusuri jawaban yang disertai sumber halaman dari dokumenmu.
            </p>
            <div className="hero-actions">
              <button
                className="button button-primary button-large"
                onClick={() => setAuthView("register")}
              >
                Mulai Gratis <Icon name="arrow" />
              </button>
              <button
                className="button button-ghost button-large"
                onClick={() => setAuthView("login")}
              >
                Login ke akun
              </button>
            </div>
            <div className="hero-proof">
              <span>
                <i />
                PDF hingga 10 MB
              </span>
              <span>
                <i />
                Sumber halaman
              </span>
              <span>
                <i />
                Ruang dokumen pribadi
              </span>
            </div>
          </div>
          <div className="hero-preview">
            <div className="preview-window">
              <div className="preview-top">
                <div className="window-dots">
                  <i />
                  <i />
                  <i />
                </div>
                <span>DocuMind Workspace</span>
                <span className="preview-status">● Siap</span>
              </div>
              <div className="preview-body">
                <aside className="preview-sidebar">
                  <span className="preview-nav active">
                    <Icon name="dashboard" size={15} /> Dashboard
                  </span>
                  <span className="preview-nav">
                    <Icon name="search" size={15} /> Cari dokumen
                  </span>
                  <span className="preview-nav">
                    <Icon name="chat" size={15} /> Chat AI
                  </span>
                </aside>
                <div className="preview-content">
                  <h3>Selamat datang 👋</h3>
                  <div className="preview-upload">
                    <Icon name="upload" size={22} />
                    <b>Unggah dokumen PDF</b>
                    <small>Tarik file atau pilih dari perangkat</small>
                  </div>
                  <div className="preview-doc">
                    <span className="pdf-icon">PDF</span>
                    <span>
                      <b>Pedoman Pengguna.pdf</b>
                      <small>8 halaman · Siap dicari</small>
                    </span>
                    <span className="mini-check">✓</span>
                  </div>
                  <div className="preview-question">
                    <span className="avatar-ai">
                      <Icon name="spark" size={14} />
                    </span>
                    <div>
                      <small>Jawaban</small>
                      <p>
                        Bagian ini menjelaskan langkah utama berdasarkan isi
                        dokumen...
                      </p>
                      <em>↳ Sumber: halaman 3</em>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="floating-note note-top">
              <span className="note-icon">
                <Icon name="search" size={17} />
              </span>
              <span>
                <b>Cari lebih cepat</b>
                <small>Berbasis isi PDF</small>
              </span>
            </div>
            <div className="floating-note note-bottom">
              <span className="note-icon note-check">✓</span>
              <span>
                <b>Jawaban bersumber</b>
                <small>Rujukan halaman jelas</small>
              </span>
            </div>
          </div>
        </section>
        <section className="landing-features">
          <div className="section-heading">
            <div className="eyebrow">CARA KERJA</div>
            <h2>Dari dokumen panjang menjadi jawaban yang jelas.</h2>
            <p>
              Alur kerja sederhana untuk memahami informasi tanpa harus mencari
              halaman satu per satu.
            </p>
          </div>
          <div className="feature-grid">
            <article className="feature-card">
              <span className="feature-icon">
                <Icon name="upload" />
              </span>
              <h3>1. Unggah PDF</h3>
              <p>
                Simpan dokumen di ruang kerja pribadimu. DocuMind memproses isi
                dokumen agar dapat dicari.
              </p>
            </article>
            <article className="feature-card">
              <span className="feature-icon">
                <Icon name="search" />
              </span>
              <h3>2. Cari atau bertanya</h3>
              <p>
                Gunakan kata kunci untuk menemukan bagian dokumen atau tanyakan
                sesuatu dengan bahasa sehari-hari.
              </p>
            </article>
            <article className="feature-card">
              <span className="feature-icon">
                <Icon name="book" />
              </span>
              <h3>3. Periksa sumber</h3>
              <p>
                Baca kutipan dan nomor halaman yang relevan untuk memeriksa
                konteks jawaban AI.
              </p>
            </article>
          </div>
        </section>
        <section className="landing-cta">
          <div>
            <div className="eyebrow">MULAI SEKARANG</div>
            <h2>Dokumenmu punya jawabannya.</h2>
            <p>
              Mulai gunakan DocuMind ID untuk menelusuri PDF dengan lebih
              terarah.
            </p>
          </div>
          <button
            className="button button-primary button-large"
            onClick={() => setAuthView("register")}
          >
            Buat akun gratis <Icon name="arrow" />
          </button>
        </section>
        <footer className="landing-footer">
          <Link className="brand" href="#top">
            <span className="brand-icon">
              <Icon name="logo" />
            </span>
            <span>
              DocuMind <b>ID</b>
            </span>
          </Link>
          <span>
            © {new Date().getFullYear()} DocuMind ID · Tanya jawab dokumen PDF
          </span>
        </footer>
      </main>
    );
  }

  const nav: { id: View; label: string; icon: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "search", label: "Cari Dokumen", icon: "search" },
    { id: "chat", label: "Chat dengan AI", icon: "chat" },
  ];
  return (
    <main
      className={`workspace ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}
    >
      <aside className="sidebar">
        <div className="sidebar-brand-row">
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setView("dashboard");
            }}
          >
            <span className="brand-icon">
              <Icon name="logo" />
            </span>
            {sidebarOpen && (
              <span>
                DocuMind <b>ID</b>
              </span>
            )}
          </a>
          <button
            className="icon-button sidebar-toggle"
            aria-label={sidebarOpen ? "Ciutkan sidebar" : "Buka sidebar"}
            title={sidebarOpen ? "Ciutkan sidebar" : "Buka sidebar"}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Icon name="menu" />
          </button>
        </div>

        <nav className="sidebar-nav">
          {nav.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? "active" : ""}`}
              onClick={() => setView(item.id)}
              title={!sidebarOpen ? item.label : undefined}
            >
              <Icon name={item.icon} />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div
            className={`account-row ${sidebarOpen ? "" : "account-compact"}`}
          >
            <span className="account-avatar">
              {userEmail.slice(0, 1).toUpperCase()}
            </span>
            {sidebarOpen && (
              <div className="account-info">
                <b>Akun saya</b>
                <span title={userEmail}>{userEmail}</span>
              </div>
            )}
          </div>
          <button
            className="nav-item logout-item"
            onClick={() => void logout()}
            disabled={logoutLoading}
            title={!sidebarOpen ? "Logout" : undefined}
          >
            <Icon name="logout" />
            {sidebarOpen && (
              <span>{logoutLoading ? "Keluar..." : "Logout"}</span>
            )}
          </button>
        </div>
      </aside>
      <section className="workspace-main">
        <div className="page-container">
          {view === "dashboard" && (
            <>
              <div className="page-heading">
                <div>
                  <h1>Selamat datang kembali! 👋</h1>
                  <p>Kelola dokumen dan temukan jawaban dari satu tempat.</p>
                </div>
              </div>
              <section className="upload-panel">
                <div className="upload-panel-copy">
                  <span className="large-feature-icon">
                    <Icon name="upload" size={25} />
                  </span>
                  <div>
                    <h2>Unggah dokumen PDF</h2>
                    <p>
                      Tambahkan dokumen untuk mulai mencari isi dan mengajukan
                      pertanyaan.
                    </p>
                    <small>PDF · Maksimal 10 MB per file</small>
                  </div>
                </div>
                <button
                  className="button button-primary"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  <Icon name="upload" size={17} />
                  {uploading ? "Mengunggah..." : "Pilih PDF"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  hidden
                  onChange={uploadFile}
                />
              </section>
              {uploadMessage && <p className="notice">{uploadMessage}</p>}
              {docError && <p className="notice notice-error">{docError}</p>}
              <section className="section-block">
                <div className="section-title-row">
                  <div>
                    <h2>Dokumen terbaru</h2>
                    <p>Dokumen yang tersimpan di ruang kerjamu.</p>
                  </div>
                  <span className="count-pill">{documents.length} dokumen</span>
                </div>
                {docsLoading ? (
                  <div className="empty-state">Memuat dokumen...</div>
                ) : documents.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon">
                      <Icon name="file" size={25} />
                    </span>
                    <h3>Belum ada dokumen</h3>
                    <p>
                      Unggah PDF pertamamu untuk mulai menggunakan pencarian dan
                      chat AI.
                    </p>
                    <button
                      className="button button-secondary"
                      onClick={() => fileRef.current?.click()}
                    >
                      Unggah PDF
                    </button>
                  </div>
                ) : (
                  <div className="document-list">
                    {documents.map((doc) => (
                      <article className="document-row" key={doc.id}>
                        <span className="pdf-icon">PDF</span>
                        <div className="document-main">
                          <b>{doc.filename}</b>
                          <span>
                            {formatBytes(doc.file_size_bytes)}
                            {doc.page_count
                              ? ` · ${doc.page_count} halaman`
                              : ""}{" "}
                            · {dateLabel(doc.created_at)}
                          </span>
                        </div>
                        <span className={`status-pill status-${doc.status}`}>
                          {doc.status === "ready"
                            ? "Siap dicari"
                            : doc.status === "failed"
                              ? "Gagal diproses"
                              : doc.status === "processing"
                                ? "Diproses"
                                : doc.status === "deleting"
                                  ? "Menghapus"
                                  : "Menunggu"}
                        </span>
                        <div className="document-actions">
                          <button
                            className="button button-small button-secondary"
                            disabled={doc.status !== "ready"}
                            onClick={() => {
                              setSearchDoc(doc.id);
                              setSearchQuery("");
                              setSearchResult(null);
                              setSearchAnswer(null);
                              setView("search");
                            }}
                          >
                            Cari
                          </button>
                          <button
                            className="button button-small button-secondary"
                            disabled={doc.status !== "ready"}
                            onClick={() => {
                              void selectChatDocument(doc.id);
                              setView("chat");
                            }}
                          >
                            Chat
                          </button>
                          <button
                            className="icon-button danger-icon"
                            title={`Hapus ${doc.filename}`}
                            aria-label={`Hapus ${doc.filename}`}
                            onClick={() => void removeDocument(doc)}
                          >
                            <Icon name="trash" size={17} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
          {view === "search" && (
            <>
              <div className="page-heading">
                <div>
                  <h1>Cari dokumen</h1>
                  <p>
                    Gunakan pencarian untuk satu pertanyaan dan lihat jawaban
                    beserta kutipan halaman yang mendukungnya.
                  </p>
                </div>
              </div>
              <section className="content-card">
                <form className="search-form" onSubmit={submitSearch}>
                  <label>
                    Dokumen sumber
                    <select
                      value={searchDoc}
                      onChange={(e) => setSearchDoc(e.target.value)}
                    >
                      <option value="all">Semua dokumen siap dicari</option>
                      {readyDocs.map((d) => (
                        <option value={d.id} key={d.id}>
                          {d.filename}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Pertanyaan atau kata kunci
                    <div className="input-with-icon">
                      <Icon name="search" />
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Contoh: Apa tujuan utama dokumen ini?"
                      />
                    </div>
                  </label>
                  <button
                    className="button button-primary"
                    disabled={searchLoading || readyDocs.length === 0}
                  >
                    {searchLoading ? "Mencari..." : "Cari jawaban"}
                    <Icon name="arrow" size={17} />
                  </button>
                </form>
                {readyDocs.length === 0 && (
                  <p className="muted small-text">
                    Unggah dan proses PDF dari Dashboard terlebih dahulu.
                  </p>
                )}
                {searchError && (
                  <p className="notice notice-error">{searchError}</p>
                )}
              </section>
              {searchAnswer && (
                <section className="answer-panel">
                  <div className="answer-title">
                    <span className="answer-avatar">
                      <Icon name="spark" />
                    </span>
                    <div>
                      <h2>Ringkasan jawaban</h2>
                      <p>Jawaban berdasarkan sumber dokumen yang relevan.</p>
                    </div>
                    <button
                      className="icon-button"
                      title="Salin jawaban"
                      onClick={() => copyText(searchAnswer.answer)}
                    >
                      <Icon name="copy" />
                    </button>
                  </div>
                  <p className="answer-text">{searchAnswer.answer}</p>
                </section>
              )}
              {searchResult && (
                <section className="section-block">
                  <div className="section-title-row">
                    <div>
                      <h2>Sumber relevan</h2>
                      <p>
                        {searchResult.results.length
                          ? `${searchResult.results.length} kutipan yang cocok dengan sumber jawaban.`
                          : "Tidak ditemukan kutipan yang cukup relevan untuk jawaban ini."}
                      </p>
                    </div>
                  </div>
                  {searchResult.results.length > 0 ? (
                    <div className="source-list">
                      {searchResult.results.map((r, i) => (
                        <article
                          className="source-card"
                          key={`${r.chunk_id}-${i}`}
                        >
                          <div className="source-card-head">
                            <span className="source-number">{i + 1}</span>
                            <div>
                              <b>{r.filename}</b>
                              <span>Halaman {r.page_number}</span>
                            </div>
                            <div className="source-card-actions">
                              <button
                                type="button"
                                className="icon-button"
                                title="Salin kutipan"
                                onClick={() => copyText(r.content)}
                              >
                                <Icon name="copy" size={17} />
                              </button>

                              <button
                                type="button"
                                className="ask-ai-link"
                                onClick={() => {
                                  void selectChatDocument(r.document_id);
                                  setChatQuery(
                                    `Jelaskan kutipan dari halaman ${r.page_number} pada dokumen "${r.filename}":\n\n"${r.content}"`,
                                  );
                                  setView("chat");
                                }}
                              >
                                Tanyakan ke AI <Icon name="arrow" size={14} />
                              </button>
                            </div>
                          </div>
                          <p>{r.content}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state compact-empty">
                      <p>
                        Belum ada sumber yang cukup relevan. Coba ubah
                        pertanyaan atau pilih dokumen tertentu.
                      </p>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
          {view === "chat" && (
            <>
              <div className="page-heading">
                <div>
                  <h1>Chat dengan AI</h1>
                  <p>
                    Diskusikan isi satu dokumen secara bertahap. Pertanyaan dan
                    jawaban akan tersimpan dalam riwayat.
                  </p>
                </div>
              </div>
              <div className="chat-layout">
                <aside className="chat-history-panel">
                  <div className="history-heading">
                    <h2>Riwayat chat</h2>
                    <span className="count-pill">{conversations.length}</span>
                  </div>
                  <label className="history-doc-label">
                    Dokumen
                    <select
                      value={chatDoc}
                      onChange={(e) => void selectChatDocument(e.target.value)}
                    >
                      <option value="">Pilih dokumen...</option>
                      {readyDocs.map((d) => (
                        <option value={d.id} key={d.id}>
                          {d.filename}
                        </option>
                      ))}
                    </select>
                  </label>
                  {chatDoc && (
                    <button
                      className="button button-secondary button-wide new-chat-button"
                      onClick={() => {
                        setConversationId("");
                        setMessages([]);
                        setChatQuery("");
                        setChatError("");
                      }}
                    >
                      ＋ Percakapan baru
                    </button>
                  )}
                  {!chatDoc ? (
                    <p className="muted small-text history-hint">
                      Pilih dokumen untuk melihat riwayat chat.
                    </p>
                  ) : chatLoadingHistory ? (
                    <p className="muted small-text">Memuat riwayat...</p>
                  ) : conversations.length === 0 ? (
                    <p className="muted small-text history-hint">
                      Belum ada riwayat untuk dokumen ini.
                    </p>
                  ) : (
                    <div className="history-list">
                      {conversations.map((c) => (
                        <button
                          key={c.id}
                          className={`history-item ${conversationId === c.id ? "active" : ""}`}
                          onClick={() => void openConversation(c.id)}
                        >
                          <span className="history-item-icon">
                            <Icon name="chat" size={16} />
                          </span>
                          <span>
                            <b>{c.title || "Percakapan baru"}</b>
                            <small>{dateLabel(c.updated_at)}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </aside>
                <section className="chat-panel">
                  <div className="chat-panel-head">
                    <span className="answer-avatar">
                      <Icon name="spark" />
                    </span>
                    <div>
                      <b>DocuMind AI</b>
                      <span>
                        {chatDoc
                          ? readyDocs.find((d) => d.id === chatDoc)?.filename
                          : "Pilih dokumen untuk memulai"}
                      </span>
                    </div>
                    <span className="online-dot" title="Asisten siap" />
                  </div>
                  <div className="chat-messages">
                    {chatLoadingHistory ? (
                      <div className="empty-state">Memuat percakapan...</div>
                    ) : messages.length === 0 ? (
                      <div className="chat-empty">
                        <span className="empty-icon">
                          <Icon name="chat" size={26} />
                        </span>
                        <h3>Mulai percakapan</h3>
                        <p>
                          Pilih dokumen di panel kiri, lalu tulis pertanyaanmu.
                          Pesan akan muncul di sini setelah dikirim.
                        </p>
                        <div className="suggestion-row">
                          {[
                            "Apa ringkasan dokumen ini?",
                            "Apa poin-poin pentingnya?",
                          ].map((q) => (
                            <button
                              key={q}
                              className="suggestion-chip"
                              disabled={!chatDoc}
                              onClick={() => setChatQuery(q)}
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      messages.map((m) => (
                        <article
                          className={`message-row ${m.role === "user" ? "message-user" : "message-ai"}`}
                          key={m.id}
                        >
                          <div
                            className={`message-avatar ${m.role === "user" ? "user-avatar" : ""}`}
                          >
                            {m.role === "user" ? (
                              userEmail.slice(0, 1).toUpperCase()
                            ) : (
                              <Icon name="spark" size={16} />
                            )}
                          </div>
                          <div className="message-content">
                            <div className="message-meta">
                              <b>
                                {m.role === "user" ? "Kamu" : "DocuMind AI"}
                              </b>
                              <span>
                                {new Date(m.created_at).toLocaleTimeString(
                                  "id-ID",
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </span>
                              <button
                                className="copy-message"
                                title={`Salin ${m.role === "user" ? "pertanyaan" : "jawaban"}`}
                                onClick={() => copyText(m.content)}
                              >
                                <Icon name="copy" size={15} /> Salin
                              </button>
                            </div>
                            <div className="message-bubble">
                              <p>{m.content}</p>
                            </div>
                            {m.role === "assistant" &&
                              m.sources?.length > 0 && (
                                <div className="message-sources">
                                  <b>Sumber</b>
                                  {m.sources.map((s, i) => (
                                    <div
                                      className="message-source"
                                      key={`${s.chunk_id}-${i}`}
                                    >
                                      <span>Halaman {s.page_number}</span>
                                      <p>{s.quote_text}</p>
                                      <button
                                        className="copy-message"
                                        onClick={() => copyText(s.quote_text)}
                                      >
                                        <Icon name="copy" size={14} /> Salin
                                        kutipan
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                          </div>
                        </article>
                      ))
                    )}
                    {chatLoading && (
                      <div className="typing-indicator">
                        <span />
                        <span />
                        <span /> AI sedang menyiapkan jawaban...
                      </div>
                    )}
                  </div>
                  <form className="chat-compose" onSubmit={sendChat}>
                    <textarea
                      value={chatQuery}
                      onChange={(e) => setChatQuery(e.target.value)}
                      placeholder={
                        chatDoc
                          ? "Tulis pertanyaan tentang dokumen ini..."
                          : "Pilih dokumen terlebih dahulu"
                      }
                      disabled={!chatDoc || chatLoading}
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          e.currentTarget.form?.requestSubmit();
                        }
                      }}
                    />
                    <button
                      className="button button-primary send-button"
                      disabled={!chatDoc || !chatQuery.trim() || chatLoading}
                      aria-label="Kirim pertanyaan"
                    >
                      <Icon name="arrow" />
                    </button>
                  </form>
                  {chatError && (
                    <p className="notice notice-error chat-error">
                      {chatError}
                    </p>
                  )}
                </section>
              </div>
            </>
          )}
        </div>
      </section>
      {confirmDelete && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setConfirmDelete(null);
          }}
        >
          <section
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <span className="modal-icon">
              <Icon name="trash" size={22} />
            </span>
            <h2 id="delete-title">Hapus dokumen?</h2>
            <p>
              Dokumen <b>{confirmDelete.filename}</b> dan seluruh percakapan
              terkait akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="modal-actions">
              <button
                className="button button-secondary"
                onClick={() => setConfirmDelete(null)}
              >
                Batal
              </button>
              <button
                className="button button-danger"
                onClick={() => void confirmRemoveDocument()}
              >
                Ya, hapus dokumen
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
