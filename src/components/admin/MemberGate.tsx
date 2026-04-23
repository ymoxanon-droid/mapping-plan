import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Lock, AlertTriangle, KeyRound, UserCircle2 } from "lucide-react";
import { findMemberByCode, findMemberByName, listMembers, type Member } from "@/lib/members";

const SESSION_KEY = "member_session_v1";

export function getActiveMember(): Member | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { name: string };
    if (!parsed?.name) return null;
    // Revalidate against current storage (in case member was deleted / code rotated).
    return findMemberByName(parsed.name);
  } catch {
    return null;
  }
}

export function setActiveMember(member: Member) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ name: member.name }));
}

export function clearActiveMember() {
  sessionStorage.removeItem(SESSION_KEY);
}

export default function MemberGate({
  children,
  preselectedName
}: {
  children: (member: Member) => ReactNode;
  preselectedName?: string | null;
}) {
  const [member, setMember] = useState<Member | null>(() => getActiveMember());
  const [name, setName] = useState(preselectedName ?? "");
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>(() => listMembers());

  useEffect(() => {
    setMembers(listMembers());
  }, []);

  useEffect(() => {
    if (preselectedName) setName(preselectedName);
  }, [preselectedName]);

  if (member) return <>{children(member)}</>;

  function submit(e: FormEvent) {
    e.preventDefault();
    const found = findMemberByCode(code);
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
    setMember(found);
    setErr(null);
  }

  const hasMembers = members.length > 0;

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

          {!hasMembers && (
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
                    {members.map((m) => (
                      <option key={m.name} value={m.name}>
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
                disabled={!hasMembers}
              />
            </label>

            {err && <div className="text-xs text-late">{err}</div>}

            <button
              type="submit"
              disabled={!code || !hasMembers}
              className="btn btn-accent w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <KeyRound size={14} /> Masuk
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
