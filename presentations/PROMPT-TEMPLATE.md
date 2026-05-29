# Prompt Template — Presentasi Mingguan Konsisten

> **Cara pakai:** copy-paste **SELURUH** block di bawah ke chat session baru (Claude / ChatGPT / siapa pun), ganti bagian `[…]` dengan info minggu ini.

---

## 🟢 BLOCK 1 — Copy ini ke chat baru

```
Aku butuh kamu bikin presentasi mingguan untuk proyek aku. WAJIB pakai struktur 
dan design system yang aku tetapkan di bawah — JANGAN improvisasi, JANGAN ganti 
warna, JANGAN tambah/kurang section.

═══════════════════════════════════════════════════════════════════════════
KONTEKS PROYEK & MINGGU INI
═══════════════════════════════════════════════════════════════════════════

Proyek            : [nama proyek, misalnya "Domain Archive Dashboard"]
Periode laporan   : Week [NN] · [Tahun] (mis. Week 22 · 2026)
Stack             : [stack utama, mis. "React + Supabase + Vercel"]
Audience          : [pilih: atasan/klien · tim dev · personal · publik]
Bahasa            : Indonesia

Yang dikerjakan minggu ini (bisa 1 fitur besar atau 2-3 fitur kecil):
  - [Item 1: apa yang dikerjain]
  - [Item 2: apa yang dikerjain]
  - [Item 3: apa yang dikerjain]

Masalah utama yang diselesaikan minggu ini:
  - [Masalah 1]
  - [Masalah 2]

Tantangan teknis yang ditemui (bug / blocker / dll):
  - [Tantangan 1 + cara solve]
  - [Tantangan 2 + cara solve]

Hasil konkret (angka kalau bisa):
  - [Hasil 1, mis. "5 migration applied, 3 edge function deployed"]
  - [Hasil 2, mis. "Latency turun dari 2s ke 600ms"]

Pembelajaran (insight / lesson learned):
  - [Insight 1]
  - [Insight 2]

Rencana minggu depan:
  - [Plan 1]
  - [Plan 2]

═══════════════════════════════════════════════════════════════════════════
STRUKTUR WAJIB (5 BABAK · 22 SLIDE)
═══════════════════════════════════════════════════════════════════════════

Struktur HARUS persis 5 babak ini, dengan urutan ini, total ~22 slide:

  BABAK 1: KONTEKS (slide 2-3)
    Slide 2: Section divider "01 · Konteks · Latar Belakang"
    Slide 3: Detail konteks (3-kolom card dengan label-angka-deskripsi)

  BABAK 2: MASALAH (slide 4-7)
    Slide 4: Section divider "02 · Masalah"
    Slide 5: 4 masalah dalam 2x2 grid card merah (dengan emoji icon)
    Slide 6: Goals & Constraints (2 kolom hijau & amber)

  BABAK 3: PENDEKATAN (slide 7-10)
    Slide 7: Section divider "03 · Pendekatan"
    Slide 8: Arsitektur layer-stack (3 layer dengan icon SVG)
    Slide 9: Flow komponen dengan stat metrics di bawah

  BABAK 4: IMPLEMENTASI & TANTANGAN (slide 11-19, porsi paling besar)
    Slide 11: Section divider "04 · Implementasi"
    Slide 12-14: Detail implementasi (database / backend / frontend, 2-kolom card)
    Slide 15: Section divider "05 · Tantangan" (kalau ada, opsional)
    Slide 16-18: Tantangan #1, #2, #3 (pakai before/after column atau timeline)

  BABAK 5: HASIL & REFLEKSI (slide 19-22)
    Slide 19: Section divider "06 · Hasil"
    Slide 20: Stats grid (4+4 angka besar dengan gradient emerald)
    Slide 21: Lessons learned (3 kolom)
    Slide 22: Roadmap next steps (2 kolom: short-term, mid-term)
    Slide 23: Closing "Terima Kasih · Pertanyaan?"

═══════════════════════════════════════════════════════════════════════════
DESIGN SYSTEM (WAJIB TIDAK BERUBAH)
═══════════════════════════════════════════════════════════════════════════

Framework         : Reveal.js v5.1.0 dari CDN (self-contained 1 file HTML)
Theme dasar       : Black dark theme

Color tokens:
  --accent: #10b981         (emerald - 1 accent color utama)
  --amber:  #f59e0b         (untuk warning/tantangan)
  --red:    #ef4444         (untuk masalah)
  --sky:    #38bdf8         (untuk info/arsitektur)
  --bg:     #0a0c12         (near-black background)
  --bg-card:#13151d         (card background)
  --text:   #e5e7eb         (body text)
  --text-muted: #9ca3af     (secondary text)
  --text-faint: #64748b     (tertiary text)

Font: Inter (system fallback)
Code font: JetBrains Mono

Style philosophy:
  - 1 accent color (emerald) + neutrals
  - Restrained, professional (Linear/Stripe/Vercel style)
  - NO neon, NO rainbow, NO overly saturated
  - Subtle borders, gentle shadows, fade transitions

Atom components yang harus dipakai:
  - .eyebrow      : Tag pill kecil di atas judul tiap slide (accent/amber/red/sky)
  - .card         : Card dengan border-left accent
  - .stat         : Angka besar dengan gradient emerald
  - .takeaway     : Box hijau ★ dengan 1 kalimat takeaway di bawah konten
  - .flow         : Horizontal flow diagram (kotak + arrow)
  - .layer-stack  : Vertical layer diagram dengan icon
  - .ba           : Before/After 2-column comparison
  - .timeline     : Numbered timeline rows untuk iteration
  - .section-divider : Big number + title slide untuk separasi babak

═══════════════════════════════════════════════════════════════════════════
OUTPUT YANG DIHARAPKAN
═══════════════════════════════════════════════════════════════════════════

1. SATU file HTML self-contained (Reveal.js + CSS inline)
2. Nama file: slide-week-[NN].html (sesuai periode laporan)
3. Bisa dibuka langsung di browser, navigasi dengan panah/spasi
4. Bisa di-print ke PDF dengan ?print-pdf di URL
5. Tone bahasa Indonesia profesional sesuai audience

REFERENSI:
- Template HTML kosong: presentation/_template.html (struktur skeleton siap isi)
- Contoh presentasi sebelumnya: presentation/index.html (referensi tone & visual)

═══════════════════════════════════════════════════════════════════════════
HAL YANG TIDAK BOLEH DILAKUKAN
═══════════════════════════════════════════════════════════════════════════

❌ Ganti color palette (harus emerald accent)
❌ Skip salah satu babak 5-babak (boleh skip slide di dalam babak, tapi babak harus ada)
❌ Lebih dari 25 slide (target 18-22)
❌ Slide pure text tanpa visual elemen (eyebrow, card, atau diagram)
❌ Tone casual/santai (harus profesional sesuai audience tipe)
❌ Bikin slide pakai code snippet untuk business audience (pakai diagram saja)

Sekarang aku kasih info minggu ini di atas. Bikinkan presentasinya.
```

---

## 🟢 BLOCK 2 — Tips supaya AI di sesi baru langsung paham

Kalau AI di sesi baru bingung atau hasilnya tidak sesuai struktur, kasih perintah ini:

```
Tolong baca dulu file presentation/_template.html — itu skeleton struktur
yang WAJIB kamu ikuti. Jangan ubah CSS, jangan ubah class name, hanya isi
placeholder [ISI: ...] dengan konten dari info yang aku kasih.
```

---

## 🟢 BLOCK 3 — Quick reference (kalau buru-buru)

Kalau cuma butuh perintah cepat tanpa baca panjang:

```
Bikin presentasi mingguan untuk proyek [NAMA]. Pakai template di 
presentation/_template.html sebagai skeleton (jangan ubah CSS, jangan ubah 
struktur 5 babak). Isi semua placeholder [ISI: ...] dengan info di bawah, 
lalu save sebagai presentation/slide-week-[NN].html.

Info minggu ini:
- Yang dikerjakan: [...]
- Masalah utama: [...]
- Tantangan: [...]
- Hasil: [...]
- Next steps: [...]

Audience: [atasan / tim dev / personal]
Bahasa: Indonesia profesional
```

---

## 📋 Checklist sebelum kirim prompt

- [ ] Sudah ganti `[NAMA PROYEK]` dengan nama beneran
- [ ] Sudah ganti `[NN]` dengan nomor minggu (mis. 22, 23)
- [ ] Sudah isi minimal 3 item di "Yang dikerjakan"
- [ ] Sudah isi minimal 2 item di "Tantangan + solve"
- [ ] Sudah pilih 1 audience (jangan multi)
- [ ] Punya angka konkret minimal 4 buah untuk stats grid (slide hasil)

---

## 🔍 Cara verify hasilnya benar

Setelah AI selesai, cek:

1. **File tunggal** (1 HTML, tidak multi-file)
2. **22 slide** kira-kira (boleh 18-25, jangan kurang/lebih jauh)
3. **5 section divider** (01, 02, 03, 04, 05 atau 06) — ada nomor besar di kiri
4. **Color palette tetap emerald** (#10b981) — bukan biru, ungu, dll
5. **Tiap slide punya eyebrow tag** di atas judul
6. **Minimal ada**: 1 layer-stack, 1 stats grid (4+4 angka), 1 before/after, 1 timeline
7. **Bisa dibuka di browser tanpa error**, navigasi panah jalan

Kalau salah satu nggak match → suruh AI re-do dengan reference ke template file.
