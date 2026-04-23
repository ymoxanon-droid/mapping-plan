import { useEffect, useRef, useState } from "react";
import { getAssignees } from "@/lib/snapshots";
import { resolveChat } from "@/lib/chat";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  ArrowRight,
  Users,
  History,
  Briefcase,
  UserCheck,
  Home,
  ChevronRight,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Menu model ───────────────────────────────────────────────

interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  query?: string;
  submenu?: MenuItem[];
  prompt?: string;
}

function perAssigneeActions(a: string): MenuItem[] {
  return [
    { label: "Lihat progres", icon: <TrendingUp size={14} />, query: `sampai mana ${a}` },
    { label: "Lihat aktivitas", icon: <History size={14} />, query: `aktivitas ${a}` }
  ];
}

function buildRootMenu(assignees: string[]): MenuItem[] {
  const hasAssignees = assignees.length > 0;

  const progresSubmenu: MenuItem[] = hasAssignees
    ? assignees.map((a) => ({
        label: a,
        icon: <UserCheck size={14} />,
        query: `sampai mana ${a}`
      }))
    : [{ label: "Belum ada anggota", query: "siapa aja" }];

  const logSubmenu: MenuItem[] = [
    {
      label: "Semua jobdesk",
      icon: <Briefcase size={14} />,
      query: "log aktivitas"
    },
    ...assignees.map((a) => ({
      label: a,
      icon: <UserCheck size={14} />,
      query: `aktivitas ${a}`
    }))
  ];

  const listAnggotaSubmenu: MenuItem[] = hasAssignees
    ? assignees.map((a) => ({
        label: a,
        icon: <UserCheck size={14} />,
        prompt: `Pilih aksi untuk ${a}:`,
        submenu: perAssigneeActions(a)
      }))
    : [{ label: "Belum ada anggota", query: "siapa aja" }];

  return [
    {
      label: "Progres per assignee",
      icon: <Users size={14} />,
      prompt: "Pilih anggota yang mau dilihat progresnya:",
      submenu: progresSubmenu
    },
    {
      label: "Log aktivitas",
      icon: <History size={14} />,
      prompt: "Mau lihat aktivitas siapa?",
      submenu: logSubmenu
    },
    {
      label: "List semua jobdesk",
      icon: <Briefcase size={14} />,
      query: "list job"
    },
    {
      label: "List anggota",
      icon: <Users size={14} />,
      prompt: "Anggota yang aktif — pilih buat lihat detail:",
      submenu: listAnggotaSubmenu
    }
  ];
}

// ─── Chat turns ───────────────────────────────────────────────

type Turn =
  | { role: "user"; text: string }
  | {
      role: "assistant";
      text: string;
      menu?: MenuItem[];
      scrollTo?: string;
      showBackToRoot?: boolean;
    };

const GREETING =
  "Halo 👋 Aku asisten progress tracker.\nAda yang bisa aku bantu hari ini?";

// ─── Component ────────────────────────────────────────────────

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAssignees()
      .then((list) => setAssignees(list))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Greeting pertama: hanya sapaan, TANPA menu. Menu baru muncul setelah user
  // mulai interaksi (ngetik apa pun / intent unknown) — hasilnya tampilan awal
  // lebih bersih & lebih natural sebagai pembuka percakapan.
  useEffect(() => {
    if (!loaded) return;
    if (turns.length > 0) return;
    setTurns([{ role: "assistant", text: GREETING }]);
  }, [loaded, turns.length]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, loading, open]);

  async function runQuery(query: string, userLabel: string) {
    setTurns((t) => [...t, { role: "user", text: userLabel }]);
    setLoading(true);
    try {
      const data = await resolveChat(query);
      setTurns((t) => [
        ...t,
        {
          role: "assistant",
          text: data.text ?? "(kosong)",
          scrollTo: data.scrollTo,
          menu: data.unknown ? buildRootMenu(assignees) : undefined,
          showBackToRoot: !data.unknown
        }
      ]);
    } catch {
      setTurns((t) => [
        ...t,
        { role: "assistant", text: "Koneksi error, coba lagi.", showBackToRoot: true }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleMenuClick(item: MenuItem) {
    if (loading) return;
    if (item.submenu) {
      setTurns((t) => [
        ...t,
        { role: "user", text: item.label },
        {
          role: "assistant",
          text: item.prompt ?? "Pilih salah satu:",
          menu: [
            ...item.submenu!,
            { label: "← Kembali ke menu", icon: <Home size={14} />, query: "__menu__" }
          ]
        }
      ]);
    } else if (item.query === "__menu__") {
      setTurns((t) => [
        ...t,
        {
          role: "assistant",
          text: "Silakan pilih:",
          menu: buildRootMenu(assignees)
        }
      ]);
    } else if (item.query) {
      runQuery(item.query, item.label);
    }
  }

  async function handleFreeText(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    await runQuery(text, text);
  }

  function scrollToCard(assignee: string) {
    const el = document.getElementById(`job-${assignee.toLowerCase()}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("ring-2", "ring-accent", "ring-offset-2", "ring-offset-ink-900");
    setTimeout(() => {
      el.classList.remove("ring-2", "ring-accent", "ring-offset-2", "ring-offset-ink-900");
    }, 2200);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-accent hover:bg-accent/90 shadow-xl shadow-accent/30 flex items-center justify-center transition hover:scale-105"
        aria-label="Buka chat"
      >
        <MessageCircle size={22} className="text-white" />
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-ok border-2 border-ink-900" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-[420px] h-[600px] max-h-[85vh] bg-ink-900 border border-ink-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      <header className="flex items-center justify-between p-3 border-b border-ink-700 bg-ink-800">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center">
              <Sparkles size={14} className="text-accent" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-ok border-2 border-ink-800" />
          </div>
          <div>
            <div className="text-sm font-semibold">Tanya Asisten</div>
            <div className="text-[10px] text-ok">Online</div>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-muted hover:text-ink-50 p-1 rounded hover:bg-ink-700 transition"
          aria-label="Tutup"
        >
          <X size={16} />
        </button>
      </header>

      <div ref={bodyRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {!loaded && turns.length === 0 && (
          <div className="flex gap-2">
            <div className="shrink-0 w-7 h-7 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center">
              <Sparkles size={12} className="text-accent animate-pulse" />
            </div>
            <div className="text-xs text-muted pt-1.5">menyiapkan menu...</div>
          </div>
        )}

        {turns.map((t, i) =>
          t.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-accent text-white px-3 py-2 text-sm">
                {t.text}
              </div>
            </div>
          ) : (
            <div key={i} className="flex gap-2">
              <div className="shrink-0 w-7 h-7 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center mt-0.5">
                <Sparkles size={12} className="text-accent" />
              </div>
              <div className="max-w-[85%] flex-1 space-y-2">
                <div className="rounded-2xl rounded-tl-sm bg-ink-800 border border-ink-700 px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed">
                  {t.text}
                </div>

                {t.menu && <MenuButtons items={t.menu} onClick={handleMenuClick} />}

                <div className="flex flex-wrap gap-1.5">
                  {t.scrollTo && (
                    <button
                      onClick={() => scrollToCard(t.scrollTo!)}
                      className="inline-flex items-center gap-1 rounded-full bg-accent/15 text-accent hover:bg-accent/25 px-2.5 py-1 text-[11px] font-medium transition"
                    >
                      Lihat di dashboard <ArrowRight size={11} />
                    </button>
                  )}
                  {t.showBackToRoot && (
                    <button
                      onClick={() =>
                        handleMenuClick({ label: "Menu utama", query: "__menu__" })
                      }
                      className="inline-flex items-center gap-1 rounded-full bg-ink-800 border border-ink-700 hover:bg-ink-700 px-2.5 py-1 text-[11px] text-muted hover:text-ink-50 transition"
                    >
                      <Home size={11} /> Menu utama
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        )}
        {loading && (
          <div className="flex gap-2">
            <div className="shrink-0 w-7 h-7 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center">
              <Sparkles size={12} className="text-accent animate-pulse" />
            </div>
            <div className="text-xs text-muted pt-1.5">mengetik...</div>
          </div>
        )}
      </div>

      <form className="p-3 border-t border-ink-700" onSubmit={handleFreeText}>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Atau ketik langsung..."
            className="flex-1 bg-ink-800 border border-ink-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent/60"
          />
          <button
            type="submit"
            className="btn btn-accent px-3"
            disabled={loading || !input.trim()}
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}

function MenuButtons({
  items,
  onClick
}: {
  items: MenuItem[];
  onClick: (i: MenuItem) => void;
}) {
  let visibleIdx = 0;
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item, idx) => {
        const isBack = item.query === "__menu__";
        const number = isBack ? null : ++visibleIdx;
        return (
          <button
            key={idx}
            onClick={() => onClick(item)}
            className={cn(
              "group flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm text-left transition",
              isBack
                ? "border-ink-700 bg-ink-800/60 text-muted hover:text-ink-50 hover:bg-ink-700"
                : "border-ink-700 bg-ink-800/80 hover:border-accent/60 hover:bg-accent/5"
            )}
          >
            {number && (
              <span
                className={cn(
                  "shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-semibold",
                  "bg-ink-700 text-accent group-hover:bg-accent/20"
                )}
              >
                {number}
              </span>
            )}
            {isBack && <span className="shrink-0 text-muted">{item.icon}</span>}
            {!isBack && item.icon && (
              <span className="shrink-0 text-muted group-hover:text-accent">{item.icon}</span>
            )}
            <span className="flex-1 truncate">{item.label}</span>
            {item.submenu && (
              <ChevronRight
                size={14}
                className="shrink-0 text-muted group-hover:text-accent transition-transform group-hover:translate-x-0.5"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
