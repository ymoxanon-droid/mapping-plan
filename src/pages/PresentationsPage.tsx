import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  Loader2,
  Presentation as PresentationIcon,
  Settings2,
} from "lucide-react";
import {
  getDeckPublicUrl,
  listMeetings,
  listPresentationsByMeeting,
  type Meeting,
  type Presentation,
  type PresentationStatus,
} from "@/lib/presentations";

interface MeetingWithDecks extends Meeting {
  decks: Presentation[];
}

const STATUS_PILL: Record<PresentationStatus | "default", string> = {
  Selesai:
    "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/30",
  Proses:
    "bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-400/30",
  Pending: "bg-slate-500/15 text-slate-300 ring-1 ring-inset ring-slate-400/30",
  default:
    "bg-slate-500/15 text-slate-300 ring-1 ring-inset ring-slate-400/30",
};

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatMeetingDate(iso: string, isoWeek: number) {
  // meeting_date is stored as YYYY-MM-DD; parse as local midnight to avoid TZ shift.
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return `${iso} — Minggu ke-${isoWeek}`;
  const date = new Date(y, m - 1, d);
  return `${dateFmt.format(date)} — Minggu ke-${isoWeek}`;
}

function deckHref(p: Presentation): string | null {
  if (p.external_url && p.external_url.trim() !== "") return p.external_url;
  if (p.storage_path && p.storage_path.trim() !== "")
    return getDeckPublicUrl(p.storage_path);
  return null;
}

export default function PresentationsPage() {
  const [meetings, setMeetings] = useState<MeetingWithDecks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("Semua");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const ms = await listMeetings();
        const enriched = await Promise.all(
          ms.map(async (m) => {
            const decks = await listPresentationsByMeeting(m.meeting_date);
            return { ...m, decks };
          })
        );
        if (!cancelled) setMeetings(enriched);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Gagal memuat data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const projects = useMemo(() => {
    const set = new Set<string>();
    meetings.forEach((m) =>
      m.decks.forEach((d) => {
        if (d.project) set.add(d.project);
      })
    );
    return ["Semua", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [meetings]);

  const visibleMeetings = useMemo(() => {
    if (filter === "Semua") return meetings.filter((m) => m.decks.length > 0);
    return meetings
      .map((m) => ({ ...m, decks: m.decks.filter((d) => d.project === filter) }))
      .filter((m) => m.decks.length > 0);
  }, [meetings, filter]);

  return (
    <div
      className="min-h-screen text-slate-100"
      style={{
        background:
          "radial-gradient(1200px 600px at 85% -10%, rgba(99,102,241,0.18), transparent 60%), radial-gradient(900px 500px at -5% 110%, rgba(34,211,238,0.12), transparent 55%), #0b1020",
      }}
    >
      <div className="max-w-6xl mx-auto p-8 pt-[7vh] pb-[12vh]">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-7">
          <div
            className="w-9 h-9 rounded-xl grid place-items-center font-extrabold text-[#06122b]"
            style={{
              background: "linear-gradient(135deg, #6366f1, #22d3ee)",
            }}
          >
            M
          </div>
          <div>
            <div className="font-bold text-slate-100">Mapping Plan</div>
            <div className="text-xs text-slate-400">
              Central revision tracker
            </div>
          </div>
        </div>

        {/* Kicker */}
        <div className="inline-flex items-center gap-2 text-[12.5px] tracking-[0.22em] uppercase font-semibold text-cyan-300 mb-4">
          <span
            className="w-[7px] h-[7px] rounded-full bg-cyan-300"
            style={{ boxShadow: "0 0 10px #22d3ee" }}
          />
          Pusat Presentasi
        </div>

        {/* H1 */}
        <h1 className="text-[clamp(30px,4.4vw,52px)] leading-[1.05] tracking-tight font-extrabold text-slate-50">
          Semua Presentasi
        </h1>
        <p className="text-slate-400 text-base max-w-[64ch] leading-relaxed mt-3.5">
          Tiap revisi/proyek punya deck-nya. Halaman ini auto-update dari
          database — tambah lewat{" "}
          <Link to="/admin" className="text-cyan-300 hover:text-cyan-200">
            /admin
          </Link>
          .
        </p>

        {/* Filter chips */}
        {projects.length > 1 && (
          <div className="flex gap-2.5 flex-wrap mt-8 mb-6">
            {projects.map((p) => {
              const active = filter === p;
              return (
                <button
                  key={p}
                  onClick={() => setFilter(p)}
                  className={
                    "text-[12.5px] px-3.5 py-1.5 rounded-full border transition-all " +
                    (active
                      ? "bg-indigo-500 border-indigo-500 text-white"
                      : "bg-[#121a35] border-[#243056] text-slate-400 hover:border-indigo-500 hover:text-slate-100")
                  }
                >
                  {p}
                </button>
              );
            })}
          </div>
        )}

        {/* Main */}
        <main className="mt-4 space-y-12">
          {loading && (
            <div className="flex items-center justify-center gap-3 py-20 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Memuat presentasi…</span>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200">
              {error}
            </div>
          )}

          {!loading && !error && visibleMeetings.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#243056] text-slate-500 text-center py-16 px-6">
              <PresentationIcon className="w-10 h-10 mx-auto mb-4 opacity-50" />
              <div className="font-semibold text-slate-300 mb-1">
                Belum ada presentasi
              </div>
              <div className="text-sm">
                Tambahkan deck pertama lewat{" "}
                <Link to="/admin" className="text-cyan-300 hover:text-cyan-200">
                  /admin
                </Link>
                .
              </div>
            </div>
          )}

          {!loading &&
            !error &&
            visibleMeetings.map((m) => (
              <section key={m.meeting_date}>
                <div className="flex items-center gap-3 mb-5">
                  <CalendarDays className="w-4 h-4 text-cyan-300" />
                  <h2 className="text-lg md:text-xl font-bold text-slate-100 tracking-tight">
                    {formatMeetingDate(m.meeting_date, m.iso_week)}
                  </h2>
                  <span className="text-xs text-slate-500">
                    · {m.decks.length} deck
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[18px]">
                  {m.decks.map((d) => {
                    const href = deckHref(d);
                    const disabled = !href;
                    const pillCls =
                      STATUS_PILL[d.status as PresentationStatus] ??
                      STATUS_PILL.default;

                    const cardInner = (
                      <>
                        <span
                          className="absolute left-0 top-0 bottom-0 w-1"
                          style={{
                            background:
                              "linear-gradient(180deg, #6366f1, #22d3ee)",
                          }}
                        />
                        <span
                          className={
                            "self-start text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full " +
                            pillCls
                          }
                        >
                          {d.status}
                        </span>
                        <h3 className="text-[18px] font-bold mt-3.5 mb-1.5 tracking-tight leading-snug text-slate-50 line-clamp-2">
                          {d.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 ring-1 ring-inset ring-indigo-400/20">
                            {d.project}
                          </span>
                          {d.topic_order > 0 && (
                            <span className="text-[11px] text-slate-500">
                              #{d.topic_order}
                            </span>
                          )}
                        </div>
                        {d.description && (
                          <p className="mt-3 text-sm text-slate-400 leading-relaxed line-clamp-3">
                            {d.description}
                          </p>
                        )}
                        <div className="text-slate-500 text-[12.5px] flex gap-2 flex-wrap mt-auto pt-3.5">
                          <span>
                            <b className="text-slate-400 font-semibold">
                              Update:
                            </b>{" "}
                            {new Date(d.updated_at).toLocaleDateString("id-ID")}
                          </span>
                        </div>
                        <span
                          className={
                            "inline-flex items-center gap-1.5 mt-4 font-bold text-[13.5px] " +
                            (disabled ? "text-slate-500" : "text-cyan-300")
                          }
                        >
                          {disabled ? (
                            "Belum tersedia"
                          ) : (
                            <>
                              Buka presentasi{" "}
                              <ExternalLink className="w-3.5 h-3.5" />
                            </>
                          )}
                        </span>
                      </>
                    );

                    const baseCardCls =
                      "relative flex flex-col rounded-2xl p-5 pl-6 border overflow-hidden transition-all min-h-[200px]";
                    const cardStyle = {
                      background:
                        "linear-gradient(180deg, #121a35, #0f1730)",
                      boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
                    };

                    if (disabled) {
                      return (
                        <div
                          key={d.id}
                          className={
                            baseCardCls +
                            " border-[#243056] opacity-60 cursor-not-allowed"
                          }
                          style={cardStyle}
                        >
                          {cardInner}
                        </div>
                      );
                    }

                    return (
                      <a
                        key={d.id}
                        href={href!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={
                          baseCardCls +
                          " border-[#243056] hover:border-indigo-500 hover:-translate-y-0.5 no-underline text-inherit"
                        }
                        style={cardStyle}
                      >
                        {cardInner}
                      </a>
                    );
                  })}
                </div>
              </section>
            ))}
        </main>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-[#1a2342] flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
          <Link
            to="/"
            className="inline-flex items-center gap-2 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke dashboard
          </Link>
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 hover:text-cyan-300 transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            Kelola di /admin
          </Link>
        </footer>
      </div>
    </div>
  );
}
