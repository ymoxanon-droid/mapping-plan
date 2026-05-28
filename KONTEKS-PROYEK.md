# 🧠 Konteks Proyek — Workflow Dashboard

> **Tujuan file ini:** dibaca di awal sesi chat (AI mana pun, kapan pun) supaya langsung paham proyek ini tanpa harus dijelaskan dari nol. Cukup bilang: _"baca KONTEKS-PROYEK.md dulu"_ → AI paham konsep, stack, struktur, dan aturan main.

---

## 1. Satu kalimat

**Progress tracker AI-first untuk tim kecil**, di mana **chat adalah pintu masuk utama**: tanya _"sampai mana si X"_ → muncul card visual berisi progress ring, flow tugas, dan riwayat perubahan.

**Kenapa dibuat begini:** atasan minta bentuknya seperti _AI chatbot + visual_, bukan tabel biasa.

---

## 2. Konsep inti (WAJIB dipahami)

### a. Chat dulu, visual menyusul
Entry utama = `ChatWidget`. Parser Bahasa Indonesia (regex) menerjemahkan kalimat → intent → menampilkan data. Belum pakai LLM; murni regex di browser.

### b. Event sourcing (jantung sistem)
Data tidak cuma "keadaan sekarang", tapi **semua perubahan dicatat**:
- `jobs` → 1 jobdesk per assignee
- `tasks` → poin tugas (snapshot terkini)
- `task_events` → **log tiap perubahan** (created, updated, revised, deleted, completed, reopened, added)

Sebuah **trigger Postgres** (`fn_log_task_event`) otomatis menulis ke `task_events` setiap `tasks` di-insert/update. **Konsekuensi penting:** walau task dihapus/diubah drastis, history tetap ada → bisa jawab _"tanggal 15 Leo sampai mana?"_

### c. 3 lensa di tiap card (saling melengkapi)
| Lensa | Jawab pertanyaan |
|-------|------------------|
| Progress ring | Berapa % selesai? (status cepat) |
| Task timeline / flow | Perkembangan harian + dependensi antar-tugas |
| Activity feed | Siapa merevisi/menambah/menghapus apa, kapan (seperti git log) |

---

## 3. Stack teknis

- **Build:** Vite 5 (bukan Next.js, walau ada folder `.next` sisa) · dev server di `http://localhost:3000`
- **UI:** React 18 + react-router-dom (client-side routing) + TypeScript + Tailwind CSS
- **Flow graph:** `reactflow` + `dagre` (auto-layout dependensi)
- **DB:** Supabase (Postgres + RLS). Akses dari browser pakai **anon key**; app ini single-user-ish tanpa auth penuh.
- **Ikon:** lucide-react
- **Deploy:** Vercel (config di [vercel.json](vercel.json))

---

## 4. Peta file penting

```
src/
├── App.tsx                  # Routes: / , /admin , /input
├── pages/
│   ├── HomePage.tsx         # Dashboard utama + ChatWidget
│   ├── AdminPage.tsx        # Panel admin (CRUD anggota & job)
│   └── InputPage.tsx        # Anggota isi/update jobdesk sendiri
├── components/
│   ├── Dashboard.tsx        # Layout utama: stat, flow, card per anggota, view switcher
│   ├── ChatWidget.tsx       # Kotak chat
│   ├── WorkflowFlow.tsx     # Graph dependensi (reactflow)
│   ├── JobCard.tsx          # Card per jobdesk (ring + tasks + activity)
│   ├── ProgressRing.tsx · ActivityFeed.tsx
│   ├── flow/TaskNode.tsx · flow/TriggerNode.tsx
│   └── admin/AdminClient.tsx · AdminGate.tsx · MemberGate.tsx
└── lib/
    ├── supabase.ts          # Client + isSupabaseReady()
    ├── snapshots.ts         # getAllSnapshots() — gabung job+progress+tasks+events
    ├── chat.ts · chat-parser.ts  # Parser intent Bahasa Indonesia
    ├── members.ts           # CRUD members + verify_access_code (RPC)
    ├── teams.ts             # Pengelompokan anggota ke team (config statis)
    ├── types.ts             # SUMBER KEBENARAN tipe: Job, Task, TaskEvent, dll
    └── flow-layout.ts · flow-colors.ts · task-dates.ts · config.ts · utils.ts

supabase/migrations/
├── 001_initial.sql          # jobs, tasks, task_events, trigger, view v_job_progress, RLS
├── 002_members.sql          # tabel members + kode akses + index unik
├── 003_members_rls.sql      # RLS members
└── 004_members_grants_fix.sql

scripts/seed.ts              # Seeder data awal ke Supabase (npm run db:seed)
```

> Mau cari struktur data? Mulai dari [src/lib/types.ts](src/lib/types.ts).
> Mau ubah skema DB? Lihat [supabase/migrations/001_initial.sql](supabase/migrations/001_initial.sql).

---

## 5. Model data ringkas

```
Job (1 per assignee)
 └── Task[] (status: pending|in_progress|done|cancelled, ada due_date, depends_on, kind, perspective)
      └── TaskEvent[] (history otomatis dari trigger)

Member (name + access_code rahasia) — diverifikasi via RPC verify_access_code
Team — grup anggota, dikonfigurasi manual di lib/teams.ts
```

`Perspective` = 4 sudut pandang ala Balanced Scorecard: financial, customer, internal, capacity.

---

## 6. Aturan main / konvensi

- **Bahasa:** UI, komentar, dan dokumen pakai **Bahasa Indonesia** (campur santai). Pertahankan gaya ini.
- **Keamanan:** `members.access_code` **tidak boleh** dibaca via anon key. Verifikasi HANYA lewat RPC `verify_access_code` (SECURITY DEFINER). Jangan pernah select kolom itu langsung.
- **RLS wajib aktif** di semua tabel — pola dari project `datadomain`.
- **Migration ditulis idempotent** (`create ... if not exists`, `drop policy if exists`). Jalankan manual di Supabase SQL Editor.
- **Tipe** selalu sync dengan skema SQL → kalau ubah kolom, update `src/lib/types.ts` juga.

---

## 7. Cara menjalankan

```bash
npm install
cp .env.local.example .env.local   # isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
npm run dev                         # http://localhost:3000
npm run db:seed                     # (opsional) isi data awal
```

Coba di chat: `sampai mana claude-staff` · `log aktivitas` · `list job` · `help`.

---

## 8. Status & roadmap

**Sudah jalan:** dashboard, event-sourcing, chat parser, flow graph, anggota+kode akses, admin panel, input page, deploy Vercel.

**Belum / berikutnya:**
- [ ] Auth Supabase + role (read-only vs full-control)
- [ ] Chat parser regex → tool-calling **Claude API** (`claude-opus-4-8` / `claude-sonnet-4-6`)
- [ ] Filter activity log per tanggal
- [ ] Export laporan mingguan (PDF / Markdown)

---

## 9. Catatan jujur (jebakan yang gampang bikin bingung)

- Ada folder `.next/` — **sisa, tidak dipakai**. Build sebenarnya pakai Vite, bukan Next.js.
- Belum ada git di folder ini (`git init` belum dijalankan), jadi tidak ada history commit.
- Chat **belum** pakai AI sungguhan — masih regex. Jangan janjikan kemampuan NLP penuh.
- App praktis **single-tenant**: anon key dipakai langsung dari browser, keamanan bertumpu pada RLS + RPC.

---

## 10. Dokumentasi & alur antar-sesi (penting buat AI)

Proyek ini punya 4 dokumen yang saling terhubung:

| File | Fungsi |
|------|--------|
| [CARA-PAKAI-AI.md](CARA-PAKAI-AI.md) | Prompt awal & akhir sesi (pintu masuk manusia) |
| [KONTEKS-PROYEK.md](KONTEKS-PROYEK.md) | Konsep proyek (file ini) |
| [REVISI-LOG.md](REVISI-LOG.md) | **Arsip detail tiap revisi (R-XX)** — sumber kebenaran |
| [PRESENTASI-MINGGU-N.md](PRESENTASI-MINGGU-1.md) | Sorotan mingguan untuk presentasi, menunjuk ke R-XX |

**Aturan untuk AI di akhir sesi:** setiap revisi yang dikerjakan WAJIB
didokumentasikan detail di `REVISI-LOG.md` mengikuti format `## R-XX` di sana —
jangan ringkasan satu baris. Tujuannya: saat presentasi, detail kerja tiap poin
revisi bisa ditelusuri, bukan sekadar status "selesai". Lihat prompt ② di
[CARA-PAKAI-AI.md](CARA-PAKAI-AI.md).
