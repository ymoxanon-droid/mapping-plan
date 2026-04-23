import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Lock, AlertTriangle, KeyRound } from "lucide-react";

const STORAGE_KEY = "admin_unlocked_v1";

export function isAdminUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(STORAGE_KEY) === "1";
}

export function lockAdmin() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export default function AdminGate({ children }: { children: ReactNode }) {
  const expected = import.meta.env.VITE_ADMIN_CODE as string | undefined;
  const [unlocked, setUnlocked] = useState(isAdminUnlocked);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (unlocked) return <>{children}</>;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!expected) {
      setErr("VITE_ADMIN_CODE belum di-set di environment.");
      return;
    }
    if (code === expected) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      setUnlocked(true);
      setErr(null);
    } else {
      setErr("Kode akses salah.");
      setCode("");
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
            Masukkan kode akses untuk mengelola jobdesk & task.
          </p>

          {!expected && (
            <div className="flex items-start gap-2 rounded-md border border-late/60 bg-late/10 p-2 text-xs">
              <AlertTriangle size={14} className="text-late shrink-0 mt-0.5" />
              <span className="text-muted">
                <code className="text-accent">VITE_ADMIN_CODE</code> belum di-set — akses akan selalu ditolak.
              </span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-3">
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
              />
            </label>

            {err && (
              <div className="text-xs text-late">{err}</div>
            )}

            <button
              type="submit"
              disabled={!code}
              className="btn btn-accent w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <KeyRound size={14} /> Buka
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
