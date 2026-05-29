# Workflow Dashboard (mapping-plan)

AI-first progress tracker untuk tim kecil. Chat adalah entry utama — tanya "sampai mana leo" → dashboard langsung memunculkan **card** visual berisi progress ring, timeline horizontal, daftar tugas, dan activity log (revisi, penambahan, penghapusan).

---

## 🐳 Setup Cepat (Devcontainer — pindah komputer? 1 klik)

```bash
git clone https://github.com/ymoxanon-droid/mapping-plan.git
cd mapping-plan
code .                       # VS Code auto-detect devcontainer
# Klik "Reopen in Container" di popup
# Tunggu 3-5 menit (sekali aja, build cached)
# Isi .env.local → npm run dev
```

Detail: [`.devcontainer/README.md`](.devcontainer/README.md)

---

## 📊 Recap Mingguan (presentasi otomatis)

Bilang ke Claude Code di project ini:

```
bikin presentasi week NN
```

Claude auto-load aturan dari [`CLAUDE.md`](CLAUDE.md), pakai template dari
**repo presentations terpisah** (`D:\Users\user07\presentations\`), generate slide
dengan struktur 5-babak konsisten (Reveal.js, emerald accent).

> **Penting**: Slide presentasi disimpan di repo **PRIVATE TERPISAH** (`presentations`),
> bukan di repo ini. Source code project bersih dari konten slide pribadi.

**Setup awal repo presentations** (sekali aja):
```bash
git clone https://github.com/ymoxanon-droid/presentations.git
```

---

## 🤖 AI Onboarding (untuk session baru di AI mana pun)

Lihat [`CARA-PAKAI-AI.md`](CARA-PAKAI-AI.md) — prompt copy-paste supaya AI langsung paham konsep mapping-plan tanpa harus dijelaskan dari nol.

Untuk **Claude Code spesifik**: file [`CLAUDE.md`](CLAUDE.md) auto-loaded — tidak perlu prompt manual.

---

## Kenapa begini

Atasan minta bentukannya seperti AI chatbot + visual. Tiga komponen di card saling melengkapi:

- **Progress ring** — status cepat (berapa % selesai).
- **Task timeline** — tiap task jadi titik di garis, warnanya = status. Bagus buat melihat *perkembangan harian*.
- **Activity feed** — seperti git log: siapa merevisi/menambah/menghapus apa dan kapan. Inilah yang membuat revisi di tengah jalan tidak menghapus history.

Data disimpan dengan pola **event sourcing** (`task_events` + trigger PG). Jadi walau task dihapus atau diubah drastis, kita tetap bisa jawab pertanyaan "tanggal 15 Leo sampai mana?" karena setiap perubahan punya timestamp.

## Stack

- **Vite** sebagai build tool / dev server ([package.json](package.json)).
- **React 18 + react-router-dom** untuk routing (client-side).
- **TypeScript** + **Tailwind CSS**.
- **Supabase** — Postgres + RLS. Schema ada di [supabase/migrations/001_initial.sql](supabase/migrations/001_initial.sql).
- **lucide-react** — ikon.
- **Parser chat** regex-based ([src/lib/chat-parser.ts](src/lib/chat-parser.ts)), dijalankan langsung di browser via [src/lib/chat.ts](src/lib/chat.ts).

## Jalankan lokal

```bash
cd workflow-dashboard
npm install
cp .env.local.example .env.local   # isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
npm run dev
# buka http://localhost:3000
```

Coba ketik di chat: `sampai mana claude-staff`, `list job`, `help`.

## Hubungkan ke Supabase

1. Copy `.env.local.example` → `.env.local` lalu isi:
   ```
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...   # hanya untuk seeder CLI
   ```
2. Jalankan migration SQL di Supabase SQL editor: copy isi [supabase/migrations/001_initial.sql](supabase/migrations/001_initial.sql), paste, run.
3. Pastikan RLS policies mengizinkan anon key untuk `select/insert/update/delete` sesuai kebutuhan (app ini single-user tanpa auth).
4. Seed data awal (opsional):
   ```bash
   npm run db:seed
   ```
5. Restart `npm run dev`. Dashboard sekarang pakai data Supabase real-time.

## Deploy ke Vercel

```bash
git init
git add .
git commit -m "init: workflow dashboard"
git remote add origin https://github.com/<user>/workflow-dashboard.git
git push -u origin main
```

Di Vercel:
1. **Import Project** → pilih repo.
2. Framework **Vite** (auto-detected dari [vercel.json](vercel.json)).
3. Tambah env vars `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.
4. Deploy.

## Operasi admin

Semua CRUD jobdesk/task tersedia di `/admin` — tidak perlu curl. Mutasi dilakukan dari browser langsung ke Supabase via anon client (RLS harus tepat).

## Roadmap singkat

- [ ] Auth Supabase + role (read-only vs full-control)
- [ ] Upgrade chat parser → tool-calling Claude API
- [ ] Filter activity log by tanggal
- [ ] Export laporan mingguan (PDF / markdown)

## Struktur folder

```
workflow-dashboard/
├── index.html            # Vite entry
├── src/
│   ├── main.tsx          # React root + BrowserRouter
│   ├── App.tsx           # Routes (/ dan /admin)
│   ├── pages/            # HomePage, AdminPage (client-side data fetch)
│   ├── components/       # Dashboard, ChatWidget, JobCard, WorkflowFlow, admin/
│   ├── data/seed.ts      # Mock data SERP V1
│   ├── index.css         # Tailwind globals
│   └── lib/              # supabase client, api, snapshots, chat, types, utils
├── scripts/seed.ts       # CLI seeder ke Supabase
├── supabase/migrations/  # SQL migration (event-sourced schema)
├── tailwind.config.ts
├── vite.config.ts
└── vercel.json
```
