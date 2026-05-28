# 📊 Workflow Dashboard — Progress Minggu 1

> **Periode:** _(isi tanggal, mis. 23–29 Mei)_ · **Status:** MVP jalan & ter-deploy ke Vercel

---

## 🎯 Apa yang dibangun minggu ini

Sebuah **progress tracker AI-first untuk tim kecil**. Bukan dashboard biasa — pintu masuk utamanya adalah **chat**. Ketik _"sampai mana claude-staff"_ → langsung muncul card visual: progress, timeline tugas, dan riwayat perubahan.

---

## ✅ Yang sudah selesai (5 milestone)

| # | Milestone | Hasil |
|---|-----------|-------|
| 1 | **Pondasi app** | Vite + React 18 + TypeScript + Tailwind, ter-deploy ke Vercel |
| 2 | **Database event-sourced** | Skema Supabase: `jobs` → `tasks` → `task_events`. Setiap perubahan otomatis tercatat (trigger PG), jadi history tidak pernah hilang |
| 3 | **Chat widget** | Parser Bahasa Indonesia: tanya progres, log aktivitas, list job, daftar anggota |
| 4 | **Visual dashboard** | Flow dependensi antar-tugas (drag-able) + progress ring + activity feed seperti git log |
| 5 | **Anggota & akses** | Tabel `members` + kode akses (RPC aman), panel `/admin` untuk CRUD, halaman `/input` buat anggota isi data sendiri |

---

## 🧩 Konsep inti yang membedakan

- **Chat dulu, visual menyusul** — sesuai permintaan atasan: "kayak AI chatbot + visual".
- **Event sourcing** — revisi di tengah jalan tidak menghapus jejak. Bisa jawab _"tanggal 15 Leo sampai mana?"_ karena tiap perubahan punya timestamp.
- **3 lensa di tiap card** saling melengkapi: ring (status cepat) · timeline (perkembangan harian) · activity feed (siapa ubah apa).

---

## 🗺️ Halaman yang aktif

| Route | Fungsi |
|-------|--------|
| `/` | Dashboard utama (flow + card per anggota + chat) |
| `/input` | Anggota mengisi/update jobdesk-nya |
| `/admin` | Kelola anggota, jobdesk, task (full CRUD) |

---

## ⏭️ Berikutnya (roadmap singkat)

- [ ] Auth + role (read-only vs full-control)
- [ ] Upgrade chat parser regex → tool-calling Claude API
- [ ] Filter activity log per tanggal
- [ ] Export laporan mingguan (PDF / Markdown)

---

_Detail teknis lengkap untuk siapa pun (atau sesi AI mana pun) yang mau lanjut: baca [KONTEKS-PROYEK.md](KONTEKS-PROYEK.md)._
