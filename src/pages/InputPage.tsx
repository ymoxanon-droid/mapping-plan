import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AdminClient from "@/components/admin/AdminClient";
import MemberGate, { clearActiveMember } from "@/components/admin/MemberGate";
import { getAllSnapshots } from "@/lib/snapshots";
import { isSupabaseReady } from "@/lib/supabase";
import type { JobSnapshot } from "@/lib/types";
import { Loader2 } from "lucide-react";

export default function InputPage() {
  const [snapshots, setSnapshots] = useState<JobSnapshot[] | null>(null);
  const [searchParams] = useSearchParams();
  const preselected = searchParams.get("member");
  const ready = isSupabaseReady();

  const load = useCallback(async () => {
    if (!ready) {
      setSnapshots([]);
      return;
    }
    const data = await getAllSnapshots();
    setSnapshots(data);
  }, [ready]);

  useEffect(() => {
    load();
  }, [load]);

  if (snapshots === null) {
    return (
      <main className="min-h-screen flex items-center justify-center text-muted gap-2 text-sm">
        <Loader2 size={16} className="animate-spin text-accent" /> Memuat input data...
      </main>
    );
  }

  return (
    <MemberGate preselectedName={preselected}>
      {(member) => (
        <AdminClient
          snapshots={snapshots}
          supabaseReady={ready}
          reload={load}
          ownerFilter={member.name}
          title={`Input Data — ${member.name}`}
          subtitle="Kelola jobdesk & task milikmu. Task dengan grup sama akan sejajar horizontal di flow."
          backLink={{ to: "/", label: "Kembali ke dashboard" }}
          lockLabel="Keluar"
          onLock={() => {
            clearActiveMember();
            window.location.href = "/";
          }}
        />
      )}
    </MemberGate>
  );
}
