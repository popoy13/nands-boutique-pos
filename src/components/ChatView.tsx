import { useEffect, useRef, useState } from "react";
import type { Employee } from "../data/types";
import Avatar from "./Avatar";
import { supabase } from "../lib/supabase";

type MessageKind = "text" | "image" | "audio" | "file" | "location";

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_photo?: string | null;
  kind: MessageKind;
  body: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
  deleted_at?: string | null;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));

const icon = (kind: MessageKind) => {
  if (kind === "image") return "Foto";
  if (kind === "audio") return "Voice note";
  if (kind === "file") return "Dokumen";
  if (kind === "location") return "Lokasi";
  return "";
};

export default function ChatView({ currentUser, employees }: { currentUser: Employee; employees: Employee[] }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [busyMessageId, setBusyMessageId] = useState<string | null>(null);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set([currentUser.id]));
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error: loadError } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(500);
      if (cancelled) return;
      if (loadError) setError(`Chat belum siap: ${loadError.message}. Jalankan database/chat.sql di Supabase.`);
      else {
        const { data: deleted, error: deletedError } = await supabase
          .from("chat_message_deletions")
          .select("message_id")
          .eq("employee_id", currentUser.id);
        if (deletedError) setError(`Chat belum siap: ${deletedError.message}. Jalankan database/chat.sql di Supabase.`);
        const deletedIds = new Set((deleted ?? []).map(row => String(row.message_id)));
        setMessages((data ?? []).filter(row => !deletedIds.has(String(row.id))) as ChatMessage[]);
      }
      setLoading(false);
      setTimeout(scrollToBottom, 50);
    };
    void load();

    const channel = supabase.channel("employee-chat", {
      config: { presence: { key: currentUser.id } },
    });
    channelRef.current = channel;
    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, payload => {
        setMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new as ChatMessage]);
        setTimeout(scrollToBottom, 50);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages" }, payload => {
        setMessages(prev => prev.map(message => message.id === payload.new.id ? payload.new as ChatMessage : message));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_message_deletions", filter: `employee_id=eq.${currentUser.id}` }, payload => {
        setMessages(prev => prev.filter(message => message.id !== payload.new.message_id));
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ user_id: string }>();
        setOnlineIds(new Set(Object.values(state).flat().map(p => p.user_id)));
      })
      .subscribe(async status => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: currentUser.id, name: currentUser.name });
        }
      });
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [currentUser.id, currentUser.name]);

  const upload = async (file: File, kind: MessageKind) => {
    if (file.size > MAX_FILE_SIZE) throw new Error("Ukuran file maksimal 25 MB.");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${currentUser.id}/${Date.now()}-${safeName}`;
    const result = await supabase.storage.from("chat-attachments").upload(path, file, { upsert: false });
    if (result.error) throw new Error(`Upload gagal: ${result.error.message}`);
    const publicUrl = supabase.storage.from("chat-attachments").getPublicUrl(path).data.publicUrl;
    return { kind, url: publicUrl, name: file.name, mime: file.type };
  };

  const insertMessage = async (payload: Partial<ChatMessage>) => {
    const { data, error: insertError } = await supabase.from("chat_messages").insert({
      sender_id: currentUser.id,
      sender_name: currentUser.name,
      sender_photo: currentUser.photo ?? null,
      kind: payload.kind ?? "text",
      body: payload.body ?? "",
      attachment_url: payload.attachment_url ?? null,
      attachment_name: payload.attachment_name ?? null,
      attachment_mime: payload.attachment_mime ?? null,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
    }).select().single();
    if (insertError) throw new Error(insertError.message);
    if (data) setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data as ChatMessage]);
  };

  const send = async () => {
    if (sending || (!text.trim() && !selectedFile)) return;
    setSending(true);
    setError("");
    try {
      if (selectedFile) {
        const kind: MessageKind = selectedFile.type.startsWith("image/") ? "image" : "file";
        const uploaded = await upload(selectedFile, kind);
        await insertMessage({ kind, attachment_url: uploaded.url, attachment_name: uploaded.name, attachment_mime: uploaded.mime, body: text.trim() });
      } else {
        await insertMessage({ kind: "text", body: text.trim() });
      }
      setText("");
      setSelectedFile(null);
      setTimeout(scrollToBottom, 50);
    } catch (e) {
      setError((e as Error).message || "Pesan gagal dikirim.");
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Browser ini tidak mendukung perekaman suara.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];
      recorder.ondataavailable = event => { if (event.data.size) audioChunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setSending(true);
        try {
          const uploaded = await upload(new File([blob], `voice-note-${Date.now()}.webm`, { type: "audio/webm" }), "audio");
          await insertMessage({ kind: "audio", attachment_url: uploaded.url, attachment_name: uploaded.name, attachment_mime: uploaded.mime });
          setTimeout(scrollToBottom, 50);
        } catch (e) {
          setError((e as Error).message || "Voice note gagal dikirim.");
        } finally {
          setSending(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Izin mikrofon ditolak atau mikrofon tidak tersedia.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  };

  const shareLocation = () => {
    if (!navigator.geolocation) {
      setError("Perangkat tidak mendukung lokasi.");
      return;
    }
    setSending(true);
    navigator.geolocation.getCurrentPosition(async position => {
      try {
        const { latitude, longitude } = position.coords;
        await insertMessage({ kind: "location", body: "Membagikan lokasi", latitude, longitude });
        setTimeout(scrollToBottom, 50);
      } catch (e) {
        setError((e as Error).message || "Lokasi gagal dikirim.");
      } finally {
        setSending(false);
      }
    }, () => {
      setError("Izin lokasi ditolak atau lokasi tidak tersedia.");
      setSending(false);
    }, { enableHighAccuracy: true, timeout: 10000 });
  };

  const recallMessage = async (message: ChatMessage) => {
    if (message.sender_id !== currentUser.id || message.deleted_at) return;
    if (!window.confirm("Tarik pesan ini untuk semua karyawan?")) return;
    setBusyMessageId(message.id);
    setError("");
    const { data, error: recallError } = await supabase.from("chat_messages").update({
      kind: "text",
      body: "Pesan ditarik",
      attachment_url: null,
      attachment_name: null,
      attachment_mime: null,
      latitude: null,
      longitude: null,
      deleted_at: new Date().toISOString(),
    }).eq("id", message.id).eq("sender_id", currentUser.id).select().single();
    if (recallError) setError(`Pesan gagal ditarik: ${recallError.message}`);
    else if (data) setMessages(prev => prev.map(item => item.id === message.id ? data as ChatMessage : item));
    setBusyMessageId(null);
  };

  const deleteForMe = async (message: ChatMessage) => {
    if (!window.confirm("Hapus pesan ini dari tampilan Anda?")) return;
    setBusyMessageId(message.id);
    setError("");
    const { error: deleteError } = await supabase.from("chat_message_deletions").insert({
      message_id: message.id,
      employee_id: currentUser.id,
    });
    if (deleteError) setError(`Pesan gagal dihapus: ${deleteError.message}`);
    else setMessages(prev => prev.filter(item => item.id !== message.id));
    setBusyMessageId(null);
  };

  const renderAttachment = (message: ChatMessage) => {
    if (!message.attachment_url) return null;
    if (message.kind === "image") return <img src={message.attachment_url} alt={message.attachment_name ?? "Foto"} className="max-w-full max-h-64 rounded-xl object-cover" />;
    if (message.kind === "audio") return <audio controls src={message.attachment_url} className="max-w-full" />;
    return <a href={message.attachment_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm no-underline" style={{ background: "rgba(124,58,237,0.1)", color: "var(--accent)" }}>📎 {message.attachment_name ?? icon(message.kind)}</a>;
  };

  return (
    <div className="h-full flex flex-col min-h-0" style={{ background: "var(--background)" }}>
      <header className="px-5 py-4 md:px-8 shrink-0 border-b" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between gap-3">
          <div><h1 className="text-xl font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>Chat Karyawan</h1><p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>Komunikasi realtime antar karyawan</p></div>
          <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{onlineIds.size} online · {employees.filter(e => e.status === "active").length} karyawan</div>
        </div>
      </header>
      {error && <div className="mx-5 mt-3 rounded-xl px-3 py-2 text-xs" style={{ color: "#b91c1c", background: "#fee2e2" }}>{error}</div>}
      <main className="flex-1 overflow-y-auto px-4 py-4 md:px-8">
        {loading ? <div className="h-full flex items-center justify-center text-sm" style={{ color: "var(--muted-foreground)" }}>Memuat chat...</div> : messages.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-center"><div className="text-4xl mb-3">💬</div><div className="font-semibold">Belum ada pesan</div><div className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>Mulai percakapan dengan tim Anda.</div></div> : messages.map((message, index) => {
          const mine = message.sender_id === currentUser.id;
          const showDate = index === 0 || formatDate(messages[index - 1].created_at) !== formatDate(message.created_at);
          return <div key={message.id}>
            {showDate && <div className="text-center text-[10px] my-3" style={{ color: "var(--muted-foreground)" }}>{formatDate(message.created_at)}</div>}
            <div className={`flex gap-2 mb-3 ${mine ? "justify-end" : "justify-start"}`}>
              {!mine && <Avatar src={message.sender_photo ?? undefined} name={message.sender_name} role="" className="w-8 h-8 text-[10px] shrink-0" />}
              <div className={`max-w-[88%] md:max-w-[65%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                {!mine && <span className="text-[10px] font-semibold mb-1" style={{ color: "var(--muted-foreground)" }}>{message.sender_name}</span>}
                <div className="rounded-2xl px-3 py-2 text-sm" style={{ background: mine ? "var(--accent)" : "var(--card)", color: mine ? "white" : "var(--foreground)", border: mine ? "none" : "1px solid var(--border)", borderBottomRightRadius: mine ? 5 : 18, borderBottomLeftRadius: mine ? 18 : 5 }}>
                  {message.deleted_at ? <div className="italic opacity-75">Pesan ditarik</div> : <>
                    {renderAttachment(message)}
                    {message.body && <div className={message.attachment_url ? "mt-2" : ""}>{message.body}</div>}
                    {message.kind === "location" && message.latitude != null && message.longitude != null && <a href={`https://www.google.com/maps?q=${message.latitude},${message.longitude}`} target="_blank" rel="noreferrer" className="underline text-xs">Buka di Google Maps</a>}
                  </>}
                </div>
                <span className="text-[9px] mt-1" style={{ color: "var(--muted-foreground)" }}>{formatTime(message.created_at)}</span>
                {mine && !message.deleted_at && <div className="flex gap-1 mt-1">
                  <button onClick={() => void recallMessage(message)} disabled={busyMessageId === message.id} className="text-[10px] px-2 py-1 rounded-lg disabled:opacity-50" style={{ color: "var(--accent)", background: "var(--secondary)" }}>Tarik</button>
                  <button onClick={() => void deleteForMe(message)} disabled={busyMessageId === message.id} className="text-[10px] px-2 py-1 rounded-lg disabled:opacity-50" style={{ color: "#dc2626", background: "#fee2e2" }}>Hapus</button>
                </div>}
              </div>
            </div>
          </div>;
        })}
        <div ref={bottomRef} />
      </main>
      <footer className="shrink-0 border-t p-3 md:px-8" style={{ background: "var(--card)", borderColor: "var(--border)", paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
        {selectedFile && <div className="mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs" style={{ background: "var(--secondary)" }}><span className="truncate flex-1">📎 {selectedFile.name}</span><button onClick={() => setSelectedFile(null)} className="font-bold">×</button></div>}
        <div className="flex items-end gap-2">
          <label className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer shrink-0" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }} title="Kirim foto atau dokumen">
            <span className="text-lg">📎</span><input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] ?? null)} />
          </label>
          <button onClick={shareLocation} disabled={sending} className="w-10 h-10 rounded-xl shrink-0 text-lg disabled:opacity-50" style={{ background: "var(--secondary)" }} title="Bagikan lokasi">📍</button>
          <button onClick={recording ? stopRecording : startRecording} disabled={sending} className="w-10 h-10 rounded-xl shrink-0 text-lg disabled:opacity-50" style={{ background: recording ? "#fee2e2" : "var(--secondary)", color: recording ? "#dc2626" : "inherit" }} title={recording ? "Berhenti merekam" : "Voice note"}>{recording ? "⏹" : "🎙️"}</button>
          <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder={recording ? "Sedang merekam voice note..." : "Tulis pesan..."} disabled={recording} rows={1} className="flex-1 resize-none rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: "var(--secondary)", minHeight: 40, maxHeight: 100 }} />
          <button onClick={() => void send()} disabled={sending || recording || (!text.trim() && !selectedFile)} className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40" style={{ background: "var(--accent)" }} title="Kirim">➤</button>
        </div>
      </footer>
    </div>
  );
}
