import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AdminClient from "@/components/admin/AdminClient";
import VisualBuilder from "@/components/admin/VisualBuilder";
import MemberGate, { clearActiveMember } from "@/components/admin/MemberGate";
import { getAllSnapshots } from "@/lib/snapshots";
import { isSupabaseReady } from "@/lib/supabase";
import type { JobSnapshot } from "@/lib/types";
import { Loader2, ListChecks, Boxes } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "text" | "visual";

const MODE_KEY = "input_mode_v1";

function readMode(): Mode {
  if (typeof window === "undefined") return "text";
  const v = localStorage.getItem(MODE_KEY);
  return v === "visual" ? "visual" : "text";
}

export default function InputPage() {
  const [snapshots, setSnapshots] = useState<JobSnapshot[] | null>(null);
  const [searchParams] = useSearchParams();
  const preselected = searchParams.get("member");
  const ready = isSupabaseReady();
  const [mode, setMode] = useState<Mode>(() => readMode());

  useEffect(() => {
    localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

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
      {(member) => {
        const tabs = (
          <ModeTabs mode={mode} onChange={setMode} />
        );

        const lock = () => {
          clearActiveMember();
          window.location.href = "/";
        };

        return mode === "text" ? (
          <AdminClient
            snapshots={snapshots}
            supabaseReady={ready}
            reload={load}
            ownerFilter={member.name}
            title={`Input Data — ${member.name}`}
            subtitle="Kelola jobdesk & task milikmu. Task dengan grup sama akan sejajar horizontal di flow."
            backLink={{ to: "/", label: "Kembali ke dashboard" }}
            lockLabel="Keluar"
            onLock={lock}
            headerSlot={tabs}
          />
        ) : (
          <VisualBuilder
            defaultOwner={member.name}
            supabaseReady={ready}
            title={`Visual Builder — ${member.name}`}
            subtitle="Drag node dari sidebar, hubungkan dengan garis untuk dependency. Klik node untuk edit propertinya."
            backLink={{ to: "/", label: "Kembali ke dashboard" }}
            lockLabel="Keluar"
            onLock={lock}
            onSaved={load}
            headerSlot={tabs}
          />
        );
      }}
    </MemberGate>
  );
}

function ModeTabs({
  mode,
  onChange
}: {
  mode: Mode;
  onChange: (next: Mode) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-ink-700 bg-ink-900/60 p-1">
      <TabButton
        active={mode === "text"}
        onClick={() => onChange("text")}
        icon={<ListChecks size={13} />}
        label="Mode Teks"
        hint="Input via form & paste daftar task"
      />
      <TabButton
        active={mode === "visual"}
        onClick={() => onChange("visual")}
        icon={<Boxes size={13} />}
        label="Mode Visual"
        hint="Drag-drop kanvas ala n8n"
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  hint
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      onClick={onClick}
      title={hint}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
        active
          ? "bg-accent/20 text-accent border border-accent/40"
          : "text-muted hover:text-ink-50 border border-transparent"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
