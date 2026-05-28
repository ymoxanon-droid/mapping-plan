# 📒 Revisi Log — Arsip Detail (semua proyek)

> **Sumber kebenaran** semua poin revisi. `mapping-plan` adalah dashboard pusat
> tempat mencatat tugas & revisi dari SEMUA proyek (SEO, domain, database, dll),
> jadi tiap entri WAJIB menyebut **proyek**-nya.
>
> Tiap judul revisi diuraikan detail di sini, supaya saat presentasi kita bisa
> cerita **apa yang benar-benar dikerjakan**, bukan sekadar "sudah ya".
> Ringkasan per minggu (untuk bos) ada di `PRESENTASI-MINGGU-N.md`.

---

## Cara isi (format wajib tiap entri)

```
## R-XX — Judul revisi
Proyek: <SEO | Domain | Database | ...>   ← milik proyek mana
Minggu: <rentang tgl> · Status: <status> · Waktu: <mis. 2 hari> · Sesi: "<judul chat>"

Permintaan:  kenapa revisi ini ada (siapa minta / masalah apa)
Yang dikerjakan (detail):
  - poin konkret 1
  - poin konkret 2
File/area:   file atau bagian yang disentuh
Hasil:       apa yang sekarang bisa dilakukan / berubah buat user
Sisa:        yang belum / follow-up (kalau ada)
```

**Status:** `✅ Selesai` · `🔄 Proses` · `⏳ Pending` · `🧊 Ditunda`

> `R-XX` = nomor poin di daftarmu (1–50+). Jadi "R-13" = detail poin nomor 13.
> Isi di bawah ini hanya **bahan masuk** dari judul di screenshot — nomor,
> proyek, dan detail masih placeholder, silakan sesuaikan. Kolom detail sengaja
> dikosongkan (_diisi AI dari sesi terkait_) supaya tidak ada yang dikarang.

---

# ✅ Selesai / dikerjakan (dari riwayat sesi)

## R-?? — Aktifkan 2FA (TOTP) + IP whitelist di dashboard
Proyek: Dashboard admin _(sesuaikan)_ · Minggu: _(isi)_ · Status: ✅ Selesai · Waktu: ~2 hari · Sesi: "Add 2FA and IP whitelist to dashboard"
Deck detail: _(link reveal.js bila ada)_

Permintaan:  Dashboard punya 1 super-admin yang diakses dari banyak IP (RDP + laptop + HP)
             dan dulu hanya diproteksi password. Kalau password bocor → siapa pun bisa
             masuk, IP tak dikenal bebas akses. Diminta lapis kedua + kontrol IP.
Yang dikerjakan (detail):
  - Gate 3 lapis: Password → TOTP (authenticator) → IP whitelist, plus recovery fallback.
  - DB: tabel admin_ip_whitelist, ip_bypass_tokens, ip_bypass_requests + RPC functions.
  - Edge Functions: check-access, send-ip-bypass, verify-ip-bypass.
  - Frontend: MfaChallenge, IpGate, IpWhitelistManager, tab Security di admin panel.
  - Tantangan: deploy via RDP (outbound TCP diblok → Management API + PAT + proxy 8803);
    bug schema (STABLE→VOLATILE, ambiguous column, pgcrypto schema); flash dashboard saat
    refresh → optimistic skip pakai flag localStorage.
  - Constraint: full budget gratis (Supabase free + Vercel free).
File/area:   Supabase Auth + Edge Functions + Postgres RPC; React (Vercel)
Hasil:       Admin wajib lewat MFA + IpGate; permintaan IP baru lewat approval (badge merah,
             pending approval). Semua lapis berjalan.
Sisa:        Setup Resend untuk email beneran · audit log · dukungan IPv6
Pelajaran:   Supabase RLS ≠ GRANT · pentingnya hygiene ambiguous-column

## R-?? — Debug timestamp hilang di history
Proyek: _(isi)_ · Minggu: _(isi)_ · Status: ✅ Selesai · Sesi: "Debug missing timestamps in history"
_(detail diisi AI dari sesi terkait)_

## R-?? — Perbaiki warna dark mode di baris filter
Proyek: _(isi)_ · Minggu: _(isi)_ · Status: ✅ Selesai · Sesi: "Fix dark mode colors in filter row"
_(detail diisi AI dari sesi terkait)_

## R-?? — Investigasi lag hover di dashboard (performa)
Proyek: _(isi)_ · Minggu: _(isi)_ · Status: 🔄 Proses · Sesi: "Investigate dashboard hover lag performance"
_(detail diisi AI dari sesi terkait)_

## R-?? — Perbaiki UI/UX halaman configuration
Proyek: _(isi)_ · Minggu: _(isi)_ · Status: ✅ Selesai · Sesi: "Improve UI and UX for configuration page"
_(detail diisi AI dari sesi terkait)_

## R-?? — Perbaiki urutan loading data disavow spam saat refresh
Proyek: _(isi — mis. SEO)_ · Minggu: _(isi)_ · Status: ✅ Selesai · Sesi: "Fix disavow spam data loading order on page refresh"
_(detail diisi AI dari sesi terkait)_

## R-?? — Expand baris domain untuk tampilkan tabel bersarang
Proyek: _(isi — mis. Domain)_ · Minggu: _(isi)_ · Status: ✅ Selesai · Sesi: "Expand domain rows to show nested table data"
_(detail diisi AI dari sesi terkait)_

## R-?? — Perbaikan AdminPage.tsx
Proyek: _(isi)_ · Minggu: _(isi)_ · Status: ✅ Selesai · Sesi: "Fix AdminPage.tsx file"
_(detail diisi AI dari sesi terkait)_

---

# ⏳ Antrian (pending — belum dikerjakan)

## R-43 — Trigger server-side untuk aksi tinggi-risiko
Proyek: _(isi)_ · Status: ⏳ Pending · _(detail diisi saat dikerjakan)_

## R-44 — Tabel `admin_audit_log` jangan dibaca oleh client app
Proyek: _(isi)_ · Status: ⏳ Pending · _(detail diisi saat dikerjakan)_

## R-45 — Promote string literal ke `ACTIONS`
Proyek: _(isi)_ · Status: ⏳ Pending · _(detail diisi saat dikerjakan)_

## R-46 — Warna kategori untuk action baru di dashboard
Proyek: _(isi)_ · Status: ⏳ Pending · _(detail diisi saat dikerjakan)_

## R-47 — `httpsCallable` di `supabaseCompat.ts:1301` tidak dipakai
Proyek: _(isi)_ · Status: ⏳ Pending · _(detail diisi saat dikerjakan)_

## R-48 — Filter "exclude noise"
Proyek: _(isi)_ · Status: ⏳ Pending · _(detail diisi saat dikerjakan)_

## R-49 — Group by session
Proyek: _(isi)_ · Status: ⏳ Pending · _(detail diisi saat dikerjakan)_

## R-50 — Breadcrumb
Proyek: _(isi)_ · Status: ⏳ Pending · _(detail diisi saat dikerjakan)_
