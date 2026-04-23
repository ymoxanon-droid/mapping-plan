import { useCallback, useEffect, useState } from "react";
import AdminGate from "@/components/admin/AdminGate";
import MemberManager from "@/components/admin/MemberManager";
import { getAllSnapshots } from "@/lib/snapshots";
import { isSupabaseReady } from "@/lib/supabase";
import type { JobSnapshot } from "@/lib/types";
import { Loader2 } from "lucide-react";

export default function AdminPage() {
  const [snapshots, setSnapshots] = useState<JobSnapshot[] | null>(null);
  const ready = isSupabaseReady();

  const load = useCallback(async () => {
    if (!ready) {
      setSnapshots([]);
      return;
    }
    try {
      const data = await getAllSnapshots();
      setSnapshots(data);
    } catch {
      setSnapshots([]);
    }
  }, [ready]);

  useEffect(() => {
    load();
  }, [load]);

  if (snapshots === null) {
    return (
      <main className="min-h-screen flex items-center justify-center text-muted gap-2 text-sm">
        <Loader2 size={16} className="animate-spin text-accent" /> Memuat admin panel...
      </main>
    );
  }

  return (
    <AdminGate>
      <MemberManager snapshots={snapshots} />
    </AdminGate>
  );
}
