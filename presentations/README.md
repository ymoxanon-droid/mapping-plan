# Presentations — Recap Per-Task Lintas Proyek

> **Sub-folder di repo mapping-plan (PRIVATE)**. Berisi slide presentasi terpisah untuk tiap task/kerjaan dari semua proyek pribadi.

Tujuan:
- **1 slide per task** (bukan merge multi-task) — atasan dapat laporan terfokus per kerjaan
- Memisahkan slide presentasi dari source code project (privacy + clean separation)
- Konsisten visual & struktur lintas proyek
- Portable: clone repo mapping-plan = semua slide & template ikut

---

## 📁 Struktur

```
presentations/
├── _template.html                    ← Master template Reveal.js (skeleton)
├── PROMPT-TEMPLATE.md                ← Prompt untuk AI session baru
├── CARA-PAKAI.md                    ← Tutorial format struktur 5-babak
├── README.md                        ← File ini
└── archive/                         ← Slide per project per task
    ├── domain-archive/              ← Project: supabase-migration-full
    │   ├── slide-week-22-2fa-ip-whitelist.html
    │   └── slide-week-NN-<task>.html
    └── mapping-plan/                ← Project: Workflow Dashboard
        └── slide-week-NN-<task>.html
```

---

## 🚀 Cara pakai

### Bikin slide baru untuk task tertentu

**Di sesi Claude Code dari project related** (domain-archive atau mapping-plan):

```
bikin presentasi week 23 untuk task mobile redesign
```

Atau lebih singkat:
```
bikin presentasi week 23
```
(Claude akan tanya nama task-nya kalau belum disebut)

Claude akan:
1. Baca `_template.html` sebagai skeleton
2. Convert nama task → slug kebab-case (mis. "mobile redesign" → `mobile-redesign`)
3. Tanya 5 hal context (apa task, masalah, tantangan, hasil, next steps)
4. Save ke `archive/<project>/slide-week-NN-<task-slug>.html`
5. Commit + push ke mapping-plan

### Naming convention

**Format**: `slide-week-NN-<task-slug>.html`

| Contoh | Penjelasan |
|---|---|
| `slide-week-22-2fa-ip-whitelist.html` | Week 22, task 2FA & IP Whitelist |
| `slide-week-23-mobile-redesign.html` | Week 23, task mobile redesign |
| `slide-week-23-payment-integration.html` | Week 23, task payment integration |

**1 minggu bisa punya banyak slide** — itu fitur, bukan bug.

### Buka slide untuk presentasi

Double-click file HTML di folder `archive/<project>/` → buka di browser.

Navigasi:
- `→` / `Space` — next slide
- `←` — prev slide
- `Esc` — overview grid
- `F` — full screen
- `Ctrl+P` → "Save as PDF" untuk export

---

## 🎨 Design system (jangan diubah)

Semua slide pakai aturan visual sama untuk konsistensi:

- **Framework**: Reveal.js v5.1.0 (dari CDN)
- **Accent**: emerald `#10b981`
- **Background**: `#0a0c12` near-black
- **Font**: Inter
- **Style**: Linear/Stripe restrained — 1 accent + neutrals
- **Struktur**: 5-babak (Konteks → Masalah → Pendekatan → Implementasi → Hasil)
- **Total**: ~22 slide per task

Detail di [`CARA-PAKAI.md`](CARA-PAKAI.md).

---

## 🔗 Project terkait

| Project | Repo | Slide folder |
|---------|------|--------------|
| Domain Archive Dashboard | `ymoxanon-droid/dashboard-domain` | [`archive/domain-archive/`](archive/domain-archive/) |
| Workflow Dashboard | `ymoxanon-droid/mapping-plan` (repo ini) | [`archive/mapping-plan/`](archive/mapping-plan/) |

---

## 📋 Index slide

| Week | Tanggal | Project | Task | File |
|------|---------|---------|------|------|
| 22 | 28 Mei 2026 | Domain Archive | 2FA + IP Whitelist + Approval Flow | [slide-week-22-2fa-ip-whitelist.html](archive/domain-archive/slide-week-22-2fa-ip-whitelist.html) |

> Update tabel ini tiap kali slide baru di-add.

---

## ⚠️ Notes

- Repo mapping-plan **PRIVATE** — slide aman tidak ke-public.
- Tiap task = 1 file slide. Jangan merge multi-task jadi 1 slide.
- Template & instruksi konsisten lintas project supaya brand visual sama.
- Kalau lupa minggu ke berapa: cek file slide terakhir → +1.
