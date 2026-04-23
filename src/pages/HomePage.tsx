import { useCallback, useEffect, useState } from "react";
import Dashboard from "@/components/Dashboard";
import ChatWidget from "@/components/ChatWidget";
import { getAllSnapshots } from "@/lib/snapshots";
import { isSupabaseReady } from "@/lib/supabase";
import type { JobSnapshot } from "@/lib/types";
import { AlertTriangle, Loader2 } from "lucide-react";

export default function HomePage() {
  const [snapshots, setSnapshots] = useState<JobSnapshot[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getAllSnapshots();
      setSnapshots(data);
    } catch (e) {
      setError((e as Error).message);
      setSnapshots([]);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseReady()) {
      setError("Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY di .env.local.");
      setSnapshots([]);
      return;
    }
    load();
  }, [load]);

  if (snapshots === null) {
    return (
      <main className="min-h-screen flex items-center justify-center text-muted gap-2 text-sm">
        <Loader2 size={16} className="animate-spin text-accent" /> Memuat snapshot...
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {error && (
        <div className="mx-auto max-w-7xl p-4 md:p-6">
          <div className="card border-late/60 bg-late/10 flex items-start gap-3">
            <AlertTriangle size={18} className="text-late shrink-0 mt-0.5" />
            <div className="text-sm text-late">{error}</div>
          </div>
        </div>
      )}
      <Dashboard snapshots={snapshots} />
      <ChatWidget />
    </main>
  );
}
