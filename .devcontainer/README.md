# Devcontainer — Workflow Dashboard

Folder ini berisi konfigurasi Dev Container untuk **Workflow Dashboard (mapping-plan)**. Environment otomatis identik di komputer mana pun (laptop pribadi, RDP, kantor). Cukup 1 klik untuk setup.

---

## 🎯 Yang dijamin sama di semua komputer

- **Node.js v20** (LTS)
- **npm dependencies** auto-install
- **Supabase CLI** (opsional)
- **VS Code extensions** auto-install (Claude Code, Prettier, ESLint, Tailwind, dll)
- **Timezone**: Asia/Jakarta
- **Line endings**: LF
- **Editor settings**: tab 2 spasi, format-on-save off

---

## 🚀 Cara pakai (3 langkah)

### Prerequisite
- **Docker Desktop** ([download](https://www.docker.com/products/docker-desktop/))
- **VS Code** + extension `Dev Containers`

### Setup

1. **Clone repo:**
   ```bash
   git clone https://github.com/ymoxanon-droid/mapping-plan.git
   cd mapping-plan
   ```

2. **Buka di VS Code:**
   ```bash
   code .
   ```

3. **VS Code akan tampilkan popup:**
   > "Folder contains a Dev Container config. Reopen in Container?"

   Klik **"Reopen in Container"**.

   (Manual: `Ctrl+Shift+P` → "Dev Containers: Reopen in Container")

4. **Tunggu setup (~3-5 menit)** — hanya pertama kali, build cached.

5. **Isi `.env.local`** (auto-copy dari `.env.local.example` jika ada):
   ```
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```

6. **Jalankan:**
   ```bash
   npm run dev          # Vite dev server di port 3000 (auto-forwarded)
   ```

---

## 💡 Pakai Claude Code di devcontainer

Memori Claude di-mount dari `~/.claude` (host) ke `/home/node/.claude` (container).
Buka Claude Code di VS Code → langsung baca [`../CLAUDE.md`](../CLAUDE.md) → tahu aturan project.

**Bilang ke Claude:**
- `bikin presentasi week NN` → otomatis pakai template & struktur 5-babak
- `baca KONTEKS-PROYEK.md dulu` → AI paham konsep mapping-plan

---

## 🐳 Pakai Docker langsung (tanpa VS Code)

```bash
docker run -it --rm \
  -v "$(pwd)":/workspace \
  -w /workspace \
  -p 3000:3000 \
  --env-file .env.local \
  mcr.microsoft.com/devcontainers/javascript-node:20-bookworm \
  bash
```

Lalu:
```bash
npm install
npm run dev
```

---

## ⚠️ Catatan untuk RDP (jaringan terbatas)

Devcontainer butuh image dari Microsoft Container Registry. Kalau outbound TCP diblok:

1. Build image di komputer dengan internet → `docker save -o wd.tar <image>`
2. Transfer .tar ke RDP → `docker load -i wd.tar`

Atau pakai workflow tanpa devcontainer — clone + `npm install` langsung di host.

---

## ✅ Verify setup

```bash
node --version    # v20.x.x
npm --version
git --version
supabase --version
npm run build     # harus sukses
```
