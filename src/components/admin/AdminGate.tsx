import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Lock, AlertTriangle, KeyRound } from "lucide-react";

const STORAGE_KEY = "admin_unlocked_v2";

const DEFAULT_ADMIN_ID = "roket";
const DEFAULT_ADMIN_PASS = "autopilot";

function getAdminCreds() {
  const id = (import.meta.env.VITE_ADMIN_ID as string | undefined) ?? DEFAULT_ADMIN_ID;
  const pass = (import.meta.env.VITE_ADMIN_CODE as string | undefined) ?? DEFAULT_ADMIN_PASS;
  return { id, pass };
}

export function isAdminUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(STORAGE_KEY) === "1";
}

export function lockAdmin() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export default function AdminGate({ children }: { children: ReactNode }) {
  const { id: expectedId, pass: expectedPass } = getAdminCreds();
  const [unlocked, setUnlocked] = useState(isAdminUnlocked);
  const [id, setId] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (unlocked) return <>{children}</>;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!expectedId || !expectedPass) {
      setErr("Kredensial admin belum di-set.");
      return;
    }
    if (id.trim() === expectedId && pass === expectedPass) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      setUnlocked(true);
      setErr(null);
    } else {
      setErr("ID atau password salah.");
      setPass("");
    }
  }

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
            <h1 className="text-lg font-semibold">Admin Panel</h1>
          </div>
          <p className="text-sm text-muted">
            Masukkan ID dan password admin untuk mengelola anggota & kode akses.
          </p>

          {(!expectedId || !expectedPass) && (
            <div className="flex items-start gap-2 rounded-md border border-late/60 bg-late/10 p-2 text-xs">
              <AlertTriangle size={14} className="text-late shrink-0 mt-0.5" />
              <span className="text-muted">
                Kredensial admin belum di-set — akses akan selalu ditolak.
              </span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-3">
            <label className="block">
              <span className="block text-[11px] uppercase tracking-widest text-muted mb-1">
                ID
              </span>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                autoFocus
                autoComplete="username"
                placeholder="admin id"
                className="input w-full"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] uppercase tracking-widest text-muted mb-1">
                Password
              </span>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className="input w-full"
              />
            </label>

            {err && <div className="text-xs text-late">{err}</div>}

            <button
              type="submit"
              disabled={!id || !pass}
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
