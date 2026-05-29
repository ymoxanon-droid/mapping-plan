# Project Instructions for Claude

> File ini auto-loaded oleh Claude Code di setiap sesi di project ini. Berisi aturan project yang harus dipatuhi oleh AI manapun yang bekerja di repo ini.

## Bahasa

User berbahasa **Indonesia**. Semua komunikasi (chat, commit message, error message, UI text) pakai Bahasa Indonesia kecuali identifier kode (variable, function name).

---

## 📌 Tentang Project Ini

**Nama**: Workflow Dashboard (mapping-plan)
**Fungsi**: AI-first progress tracker untuk track tugas & revisi dari **semua proyek user** (Domain Archive, SEO, database, dll). Bukan tracker single-project.

**Konsep inti yang WAJIB dipahami:**

1. **Chat dulu, visual menyusul** — entry utama adalah `ChatWidget` dengan parser regex Bahasa Indonesia. Bukan tabel biasa.
2. **Event sourcing** — semua perubahan task dicatat di `task_events` via Postgres trigger. Walau task dihapus, history tetap ada → bisa jawab "tanggal X Y sampai mana?"
3. **3 lensa per card** — Progress ring (% selesai) + Task flow (perkembangan + dependensi) + Activity feed (git-log style: siapa revisi apa kapan)
4. **Multi-project**: tiap task ditandai milik proyek mana (Domain Archive, dll). Dashboard ini "pusat", bukan dedicated ke 1 proyek.

**Dokumen referensi (harus dibaca dulu kalau belum paham):**
- [`KONTEKS-PROYEK.md`](KONTEKS-PROYEK.md) — konsep inti, stack, aturan main
- [`CARA-PAKAI-AI.md`](CARA-PAKAI-AI.md) — prompt template untuk AI sesi baru
- [`REVISI-LOG.md`](REVISI-LOG.md) — log keputusan & revisi historis
- [`presentation/`](presentation/) — slides mingguan + template

---

## 🛠️ Stack

- **Vite** + **React 18** + **TypeScript** + **Tailwind CSS**
- **react-router-dom** (client-side routing)
- **Supabase** (Postgres + RLS, ada di [`supabase/migrations/`](supabase/migrations/))
- **lucide-react** (icons)
- **reactflow** + **dagre** untuk diagram flow task
- **Parser chat regex** di browser ([`src/lib/chat-parser.ts`](src/lib/chat-parser.ts))

---

## 📊 Tugas Rutin: Presentasi Per-Task

User minta dibuatkan **presentasi terpisah untuk tiap task/kerjaan**, BUKAN 1 presentasi merge multi-task per minggu. Alasan: dalam 1 minggu bisa ada 3+ task berbeda di sesi chat berbeda, dan tiap task butuh laporan sendiri.

**Lokasi slide**: `presentations/` (sub-folder di repo ini)

> ✅ **mapping-plan adalah repo PRIVATE**, jadi aman menyimpan slide di sini.
> Repo ini berfungsi sebagai **pusat tracking lintas proyek** — slide presentasi dari semua proyek (Domain Archive, dll) terkumpul di sini.

Struktur:
```
mapping-plan/
├── (source code workflow dashboard)
└── presentations/                     ← Sub-folder presentasi
    ├── _template.html                     ← Master skeleton (BACA INI)
    ├── PROMPT-TEMPLATE.md
    ├── CARA-PAKAI.md
    └── archive/
        ├── domain-archive/                ← Slide untuk project Domain Archive
        │   ├── slide-week-22-2fa-ip-whitelist.html
        │   └── slide-week-NN-<task>.html
        └── mapping-plan/                  ← Slide untuk project ini
            └── slide-week-NN-<task>.html  ← Save output ke sini
```

### Naming convention WAJIB

**Format**: `slide-week-NN-<task-slug>.html`

- `NN` = nomor minggu (2 digit, mis. `22`, `23`)
- `<task-slug>` = nama task dalam kebab-case (lowercase, dash-separated)

**Contoh:**
- `slide-week-23-event-sourcing-trigger.html`
- `slide-week-23-chat-parser-upgrade.html`
- `slide-week-23-multi-project-tagging.html`

### Saat user minta presentasi

**Trigger phrase:**
- "bikin presentasi week NN"
- "bikin recap"
- "buatkan slide untuk task <X>"
- "presentasi untuk laporan minggu ini"

**Lakukan IMMEDIATELY:**

1. **Tanya nama task DULU** (kalau belum disebut user):
   - "Task apa yang mau dipresentasiin? (Misal: 'event sourcing trigger', 'chat parser', dll)"
2. Convert ke slug kebab-case untuk file name
3. Baca template dari `presentations/_template.html`
4. Tanya pakai AskUserQuestion untuk konteks **8 hal** (4 narrative + 4 teknis) — supaya slide bisa cerita ke audience awam, bukan cuma dokumentasi teknis. Boleh tanya bertahap (mis. 4 narrative dulu, lalu 4 teknis):

   **Narrative (untuk audience awam — atasan, klien, kolega):**
   - **Origin** — Cerita asal-usul: kenapa kepikiran bikin ini? Kejadian/masalah apa yang mendorong?
   - **Audience** — Untuk siapa terutama: atasan? klien? tim/kolega? diri sendiri (arsip/portofolio)?
   - **Vision** — Tujuan jangka panjang: mau jadi apa sistem ini?
   - **Value** — Apa yang berubah untuk user (before vs after) — pakai bahasa awam, bukan teknis

   **Teknis (untuk dokumentasi engineering):**
   - **Problem** — Masalah konkret yang diselesaikan (boleh teknis)
   - **Approach** — Pendekatan/strategi besar solusi
   - **Result** — Hasil konkret (stats, fitur, file source, biaya)
   - **Next steps** — Pelajaran + roadmap

5. Save output ke `presentations/archive/mapping-plan/slide-week-NN-<task-slug>.html`
6. Commit + push ke origin

### Aturan WAJIB struktur presentasi

**Struktur 5-babak (urutan TIDAK boleh diubah):**

| Babak | Slide | Konten | Sumber konteks |
|---|---|---|---|
| 01 · Konteks | 2-4 | Cerita asal-usul, audience, tujuan jangka panjang, profil sistem | **Origin + Audience + Vision** |
| 02 · Masalah | 5-7 | Pain point konkret (bahasa awam), risiko, goals & constraints | **Problem** |
| 03 · Pendekatan | 8-10 | Strategi besar, arsitektur, komponen | **Approach** |
| 04 · Implementasi | 11-15 | Detail teknis per layer | **Approach detail** |
| (04 · Tantangan) | 16-18 | Before/After, timeline iterasi | **Approach detail** |
| 05 · Hasil & Refleksi | 19-22 | Stats, **value untuk user (before vs after)**, lessons, roadmap, closing | **Value + Result + Next steps** |

**Total: ~22 slide (range 18-25).**

> 💡 **Slide pertama Babak 01 WAJIB** kasih konteks origin story + audience dalam 1-2 slide — bukan langsung profil sistem. Tujuannya: orang awam yang baca pertama kali langsung paham "kenapa ini ada & untuk siapa".

### Aturan WAJIB design system

- **Framework**: Reveal.js v5.1.0 dari CDN (1 file HTML self-contained)
- **Accent color**: emerald `#10b981` SAJA. Jangan ganti ke biru/ungu/dll.
- **Background**: `#0a0c12` (near-black)
- **Font**: Inter + JetBrains Mono untuk code
- **Style**: Linear/Stripe/Vercel restrained — 1 accent + neutrals, NO neon
- **Bahasa**: Indonesia profesional

**Setiap content slide HARUS punya:**
- `.eyebrow` tag pill kecil di atas judul
- Minimal 1 visual elemen (card / diagram / stat / before-after)
- `.takeaway` box hijau ★ di bawah konten (1 kalimat takeaway)

### JANGAN DILAKUKAN

❌ Bikin presentasi dari nol — wajib pakai `_template.html` sebagai skeleton
❌ Ganti color palette
❌ Skip salah satu dari 5 babak (boleh skip slide dalam babak, babak harus ada)
❌ Lebih dari 25 slide
❌ Slide pure text tanpa visual elemen
❌ Tone casual untuk audience atasan/klien

---

## 🗄️ Schema & Conventions Project

- **Schema utama**: `public` (default Supabase)
- **Migration**: `supabase/migrations/NNN_descriptive_name.sql`
- **3 tabel inti**:
  - `jobs` — 1 jobdesk per assignee
  - `tasks` — poin tugas (snapshot terkini)
  - `task_events` — log tiap perubahan (event-sourced via Postgres trigger `fn_log_task_event`)
- **Auth**: belum ada (single-user mode dengan anon key). Roadmap: Supabase Auth + role.

### Common gotchas

1. **Event sourcing**: jangan delete row di `tasks` langsung tanpa cek dampak ke `task_events`. Hard-delete = sah, tapi history orphan.
2. **Trigger `fn_log_task_event`**: auto-fire setiap INSERT/UPDATE di `tasks`. Jangan duplicate logic di app code.
3. **Multi-project tag**: tiap task harus punya field project tag (lihat REVISI-LOG.md untuk konteks).
4. **Chat parser regex** di browser, bukan LLM. Tambah pattern dengan hati-hati supaya gak konflik.

---

## 📂 Project Layout

```
mapping-plan/
├── CLAUDE.md                     ← File ini (auto-loaded Claude)
├── KONTEKS-PROYEK.md             ← Konsep inti, harus baca dulu
├── CARA-PAKAI-AI.md              ← Prompt template AI session baru
├── REVISI-LOG.md                 ← Log keputusan historis
├── presentation/                 ← Slides mingguan
│   ├── _template.html                ← Skeleton WAJIB pakai
│   ├── PROMPT-TEMPLATE.md            ← Format input prompt
│   └── CARA-PAKAI.md                 ← Tutorial user-facing
├── .devcontainer/                ← Docker dev environment
├── src/
│   ├── main.tsx                  ← React root + BrowserRouter
│   ├── App.tsx                   ← Routes (/ dan /admin)
│   ├── pages/                    ← HomePage, AdminPage
│   ├── components/               ← Dashboard, ChatWidget, JobCard, WorkflowFlow
│   ├── data/seed.ts              ← Mock data
│   ├── index.css                 ← Tailwind globals
│   └── lib/                      ← supabase client, api, chat parser, types
├── scripts/
│   ├── seed.ts                   ← CLI seeder ke Supabase
│   └── pub.mjs                   ← Auto-commit + push
└── supabase/migrations/          ← SQL migration (event-sourced schema)
```

---

## 🤝 Komunikasi Style

User suka komunikasi:
- **Ringkas** — gak panjang lebar, langsung ke point
- **Sebelum tool call**, kasih 1 kalimat tujuan
- **Setelah kerjaan besar selesai**, kasih handoff format ✅ done / ⏸️ pending / 💬 trigger besok
- **Saat user mumet**, ekstra ringkas
- Pakai **emoji secukupnya** untuk visual scan (✅ ⏸️ 💬 ⚠️ 📋), bukan dekorasi

User style: **"terima beres"** — kerjain dengan benar, jangan setengah-setengah, jangan tanya konfirmasi terlalu banyak untuk hal teknis yang sudah jelas.

---

## 🔗 Cross-project context

User punya repo lain yang sering disinggung dalam tugas track-tracking:

- **Domain Archive Dashboard** (`supabase-migration-full`) — proyek lain user, security & 2FA implementation. Task dari sini sering muncul di mapping-plan dengan tag project.
