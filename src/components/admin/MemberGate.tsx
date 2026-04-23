import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Lock, AlertTriangle, KeyRound, UserCircle2, Loader2 } from "lucide-react";
import { findMemberByCode, listMembers, type Member } from "@/lib/members";

const SESSION_KEY = "member_session_v1";

interface ActiveMemberSession {
  id: string;
  name: string;
}

export function getActiveMember(): ActiveMemberSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ActiveMemberSession;
    if (!parsed?.id || !parsed?.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setActiveMember(member: Member) {
  const payload: ActiveMemberSession = { id: member.id, name: member.name };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
}

export function clearActiveMember() {
  sessionStorage.removeItem(SESSION_KEY);
}

export default function MemberGate({
  children,
  preselectedName
}: {
  children: (member: ActiveMemberSession) => ReactNode;
  preselectedName?: string | null;
}) {
  const [member, setMember] = useState<ActiveMemberSession | null>(() => getActiveMember());
  const [name, setName] = useState(preselectedName ?? "");
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (member) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await listMembers();
        if (!cancelled) setMembers(list);
      } catch (e) {
        if (!cancelled) {
          setErr((e as Error).message);
          setMembers([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [member]);

  useEffect(() => {
    if (preselectedName) setName(preselectedName);
  }, [preselectedName]);

  if (member) return <>{children(member)}</>;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (verifying) return;
    setVerifying(true);
    try {
      const found = await findMemberByCode(code);
      if (!found) {
        setErr("Kode akses tidak dikenali.");
        setCode("");
        return;
      }
      if (name && found.name.toLowerCase() !== name.trim().toLowerCase()) {
        setErr(`Kode akses tidak cocok dengan "${name}". Cek kembali nama atau kode.`);
        setCode("");
        return;
      }
      setActiveMember(found);
      setMember({ id: found.id, name: found.name });
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setVerifying(false);
    }
  }

  const hasMembers = (members?.length ?? 0) > 0;
  const loading = members === null;

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-5">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-muted hover:text-ink-50 transition"
        >
          <ArrowLeft size={16} /> Kembali ke dashboard
        </Link>

        <div className="card space-y-4">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-accent" />
            <h1 className="text-lg font-semibold">Input Data</h1>
          </div>
          <p className="text-sm text-muted">
            Pilih nama dan masukkan kode akses anggota untuk mulai input jobdesk & task.
          </p>

          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted">
              <Loader2 size={12} className="animate-spin text-accent" /> Memuat daftar anggota...
            </div>
          )}

          {!loading && !hasMembers && (
            <div className="flex items-start gap-2 rounded-md border border-late/60 bg-late/10 p-2 text-xs">
              <AlertTriangle size={14} className="text-late shrink-0 mt-0.5" />
              <span className="text-muted">
                Belum ada anggota terdaftar. Admin perlu menambahkan anggota di{" "}
                <Link to="/admin" className="text-accent hover:underline">
                  Admin Panel
                </Link>{" "}
                dulu.
              </span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-3">
            <label className="block">
              <span className="block text-[11px] uppercase tracking-widest text-muted mb-1">
                Nama Anggota
              </span>
              {hasMembers ? (
                <div className="relative">
                  <UserCircle2
                    size={14}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                  />
                  <select
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input w-full pl-7"
                  >
                    <option value="">— pilih anggota —</option>
                    {(members ?? []).map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="nama anggota"
                  className="input w-full"
                  disabled
                />
              )}
            </label>

            <label className="block">
              <span className="block text-[11px] uppercase tracking-widest text-muted mb-1">
                Kode Akses
              </span>
              <input
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
                placeholder="••••••••"
                className="input w-full"
                disabled={!hasMembers || verifying}
              />
            </label>

            {err && <div className="text-xs text-late">{err}</div>}

            <button
              type="submit"
              disabled={!code || !hasMembers || verifying}
              className="btn btn-accent w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verifying ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Memeriksa...
                </>
              ) : (
                <>
                  <KeyRound size={14} /> Masuk
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
