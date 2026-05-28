# 🤖 Cara Pakai AI di Proyek Ini

> Buka file ini, **copy-paste** prompt yang sesuai. Tidak perlu mengetik ulang.
> Repo: https://github.com/ymoxanon-droid/mapping-plan

---

## ① DI AWAL SESI — biar AI langsung paham proyek

Tempel ini di pesan pertama ke AI mana pun (ChatGPT, Gemini, Claude, dll):

```
Proyek ini namanya "mapping-plan" (Workflow Dashboard). Sebelum mulai,
baca dulu file ini biar paham konsep, stack, struktur, dan aturan mainnya:

https://github.com/ymoxanon-droid/mapping-plan/blob/main/KONTEKS-PROYEK.md

Kalau mau lihat progres terakhir yang sudah dikerjakan:
https://github.com/ymoxanon-droid/mapping-plan/blob/main/PRESENTASI-MINGGU-1.md

Konfirmasi kalau sudah paham, baru kita lanjut.
```

**Kalau AI-nya tidak bisa buka link** (mode offline), pakai ini:

```
Clone repo ini lalu baca KONTEKS-PROYEK.md di root sebelum mulai:
https://github.com/ymoxanon-droid/mapping-plan
```

Atau ambil teks mentahnya:
`https://raw.githubusercontent.com/ymoxanon-droid/mapping-plan/main/KONTEKS-PROYEK.md`

---

## ② DI AKHIR SESI — biar AI menulis DETAIL revisi yang dikerjakan

> Tujuannya: jangan cuma "OTP sudah ya". Tangkap **detail apa yang benar-benar
> dikerjakan** dari sesi ini, biar saat presentasi ke bos nilai kerjanya kelihatan.

Tempel ini sebelum menutup sesi:

```
Sebelum kita tutup, dokumentasikan revisi yang kamu kerjakan di sesi ini.
Aturan:
1. Buka REVISI-LOG.md. Ikuti PERSIS format entri "## R-XX" yang ada di sana
   (Permintaan / Yang dikerjakan (detail) / File-area / Hasil / Sisa).
2. Untuk revisi yang aku kerjakan di sesi ini: isi/lengkapi entrinya dengan
   DETAIL nyata dari diskusi kita — bukan ringkasan satu baris. Tulis apa yang
   diubah, kenapa, file mana, dan hasil konkretnya buat user.
3. Set Proyek (revisi ini milik proyek mana: SEO / Domain / Database / dll),
   Status (✅ Selesai / 🔄 Proses / ⏳ Pending), Waktu (mis. "2 hari"), dan nama
   Sesi-nya. Kalau ini revisi baru, beri nomor R-XX berikutnya.
4. Update juga PRESENTASI-MINGGU-N.md: tambahkan 1–2 baris sorotan minggu ini
   yang menunjuk ke entri R-XX di log (kalau minggu baru, buat file baru dgn
   format yang sama seperti PRESENTASI-MINGGU-1.md).
5. Bahasa Indonesia, padat-berisi, fokus hasil. JANGAN mengarang — kalau ada
   yang tidak kamu ketahui (tanggal, detail di luar sesi ini), kosongkan dan
   tandai "(isi)".
6. Kalau ada konsep baru yang penting buat sesi lain, update KONTEKS-PROYEK.md.
7. Terakhir: commit & push (git add -A, commit, git push origin main).
```

---

## Alur singkat tiap sesi

```
AWAL  →  tempel prompt ①  →  AI baca KONTEKS, langsung paham
KERJA →  kerjakan revisinya seperti biasa
AKHIR →  tempel prompt ②  →  AI tulis DETAIL ke REVISI-LOG.md
                              + sorotan ke PRESENTASI-MINGGU-N.md + push
```

Dengan pola ini, tiap revisi terdokumentasi detail otomatis. Saat presentasi:
buka `PRESENTASI-MINGGU-N.md` untuk sorotan, dan `REVISI-LOG.md` kalau bos minta
detail — kamu tidak perlu mengingat-ingat apa yang dikerjakan tiap poin.
