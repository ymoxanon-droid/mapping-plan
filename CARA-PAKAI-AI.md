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

## ② DI AKHIR SESI — biar AI merangkum kerjaannya sendiri

Tempel ini sebelum menutup sesi:

```
Sebelum kita tutup, rangkum apa yang kamu kerjakan di sesi ini.
Aturan:
1. Baca PRESENTASI-MINGGU-1.md untuk lihat format & gaya yang sudah ada.
2. Tambahkan ringkasan kerjaan sesi ini ke file presentasi minggu yang
   sesuai (kalau minggu baru, buat PRESENTASI-MINGGU-N.md dengan format sama).
3. Tulis: apa yang berubah, file mana yang disentuh, dan status (selesai/
   setengah jalan/ada yang pending).
4. Bahasa Indonesia, ringkas, fokus hasil bukan proses. Jangan mengarang —
   kalau tidak yakin tanggalnya, kosongkan dan tandai untuk aku isi.
5. Kalau ada konsep baru yang penting buat sesi lain, update juga
   KONTEKS-PROYEK.md bagian yang relevan.
6. Setelah itu, commit & push ke repo (git add -A, commit, git push origin main).
```

---

## Alur singkat tiap sesi

```
AWAL  →  tempel prompt ①  →  AI baca KONTEKS, langsung paham
KERJA →  kerjakan tugasmu seperti biasa
AKHIR →  tempel prompt ②  →  AI tulis ringkasan + push ke repo
```

Dengan pola ini, setiap sesi AI baru otomatis "nyambung" dengan sesi sebelumnya
lewat repo — tanpa kamu jelasin ulang dari nol.
