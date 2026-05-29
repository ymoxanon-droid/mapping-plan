# Cara Pakai Template Presentasi Mingguan

Folder `presentation/` ini punya 3 file penting + presentasi pertama (referensi):

```
presentation/
├── index.html              ← Presentasi minggu pertama (referensi visual)
├── _template.html          ← Skeleton kosong, siap diisi
├── PROMPT-TEMPLATE.md      ← Prompt copy-paste untuk AI session baru
└── CARA-PAKAI.md          ← File yang lagi kamu baca
```

---

## 🎯 Pilih 1 dari 3 cara

### Cara 1 (paling cepat) — Minta AI di session chat baru

1. Buka chat baru di Claude / ChatGPT / siapa pun
2. Buka `PROMPT-TEMPLATE.md`, copy **BLOCK 1**
3. Ganti `[…]` dengan info minggu kamu
4. Paste ke AI → tunggu hasil HTML
5. Save sebagai `slide-week-NN.html` di folder ini
6. Double-click HTML → buka di browser → presentasi siap

**Kapan pakai cara ini:** kalau kamu mau cepet & males isi manual.

---

### Cara 2 (lebih kontrol) — Isi template manual

1. Copy `_template.html` → rename jadi `slide-week-NN.html`
2. Buka di text editor (VS Code, Notepad++, dll)
3. Cari semua `[ISI: …]` (pakai Ctrl+F) → ganti satu per satu
4. Hapus slide yang tidak kepake (mis. kalau cuma 1 tantangan, hapus slide tantangan #2 dan #3)
5. Save → buka di browser

**Kapan pakai cara ini:** kalau kamu suka kontrol penuh, ngerti HTML sedikit, dan tidak mau diatur AI.

---

### Cara 3 (campuran) — AI bantu, kamu polish

1. Pakai Cara 1 sampai dapat HTML jadi
2. Buka file di text editor
3. Review tiap slide → revisi konten yang AI salah tulis
4. Tambah/kurang slide kalau perlu

**Kapan pakai cara ini:** kalau kamu mau cepet TAPI tetap quality-check.

---

## 🧭 Navigasi presentasi (saat presentasi)

| Tombol | Aksi |
|---|---|
| `→` / `Space` | Slide berikutnya |
| `←` | Slide sebelumnya |
| `Esc` | Overview semua slide (grid view) |
| `F` | Toggle full screen |
| `S` | Speaker notes view (kalau ada notes) |
| `B` / `.` | Black screen (saat presentasi, biar audience perhatian ke kamu) |
| `?` | Tampilkan semua shortcut |

---

## 📄 Export ke PDF

**Cara 1 — Built-in browser print:**
1. Buka HTML di Chrome / Edge
2. Tambah `?print-pdf` di akhir URL → `slide-week-22.html?print-pdf`
3. `Ctrl+P` → Destination: "Save as PDF"
4. Pilih: **More settings → Background graphics: ✓** (penting biar dark mode ke-print)
5. Save

**Cara 2 — DeckTape (kualitas terbaik, optional install):**
```bash
npm install -g decktape
decktape reveal slide-week-22.html slide-week-22.pdf
```

---

## ✍️ Tips konten yang bagus

Berdasarkan struktur 5-babak, di tiap babak fokus ke:

| Babak | Fokus | Hindari |
|---|---|---|
| **Konteks** | Latar belakang yg audience belum tau | Detail teknis terlalu dalam |
| **Masalah** | Konsekuensi & urgency | Solution disinggung duluan |
| **Pendekatan** | High-level strategi & arsitektur | Bug & detail implementasi |
| **Implementasi** | Diagram + tantangan yg ditemui | Code line-by-line |
| **Hasil & Refleksi** | Angka konkret + insight | Janji-janji ke depan tanpa basis |

**Aturan slide bagus:**
- Tiap slide = 1 ide besar (jangan jejal 2-3 topik)
- Tiap slide minimal 1 visual elemen (bukan pure text)
- Tiap slide ada **takeaway** ★ di bawah (1 kalimat yg harus diingat)
- Body text < 80 kata per slide (kalau lebih, split)

---

## 🚀 Tips presentasi mingguan jadi rutinitas

1. **Tentukan hari tetap** untuk bikin recap (mis. tiap Jumat sore)
2. **Catat sepanjang minggu** apa yang dikerjain di file `weekly-notes.md` (note kasar OK)
3. **Hari recap**: rapikan notes → paste ke template
4. **Backup**: simpan tiap minggu ke folder `presentation/archive/week-NN/`
5. **Tracking**: bikin `presentation/INDEX.md` dengan list semua minggu

Contoh `INDEX.md`:
```markdown
# Index Presentasi Mingguan

| Week | Tanggal | Fokus | Link |
|------|---------|-------|------|
| 22 | 28 Mei 2026 | 2FA + IP Whitelist | [slide-week-22.html](slide-week-22.html) |
| 23 | 4 Jun 2026 | ... | ... |
```

---

## 🆘 Troubleshooting

**Slide tampil tidak rapi / overlap**
→ Cek apakah ada `<section>` yang tidak ditutup atau salah nested.

**Warna tidak muncul saat di-print PDF**
→ Aktifkan "Background graphics" di print dialog.

**Reveal.js tidak load (semua text ke-render polos)**
→ Cek internet (CDN dari jsdelivr.net butuh online). Untuk offline, download Reveal.js manual.

**Font Inter tidak muncul**
→ Browser fallback ke system font, masih OK. Kalau mau force Inter, tambah `<link>` ke Google Fonts.

**Mau ubah accent color**
→ Edit `--accent` di `:root {}` di CSS. Tapi sebaiknya jangan, biar konsistensi mingguan kepake.

---

Selamat presentasi! 🎯
