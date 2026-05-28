#!/usr/bin/env bash
# Post-create script — jalan SEKALI saat container pertama dibuat.
# Setup tools + check environment untuk Workflow Dashboard (mapping-plan).
set -e

echo "═══════════════════════════════════════════════════════════════"
echo "  Workflow Dashboard (mapping-plan) — Devcontainer Setup"
echo "═══════════════════════════════════════════════════════════════"
echo

# 1. Install npm dependencies
echo "[1/3] Installing npm dependencies…"
npm install --no-audit --no-fund

# 2. Install Supabase CLI (opsional)
echo "[2/3] Installing Supabase CLI…"
if ! command -v supabase &> /dev/null; then
  npm install -g supabase --no-audit --no-fund || true
fi

# 3. Check .env.local exists (project ini pakai .env.local untuk Vite)
echo "[3/3] Checking .env.local…"
if [ ! -f .env.local ]; then
  if [ -f .env.local.example ]; then
    cp .env.local.example .env.local
    echo "  ⚠️  .env.local dibuat dari .env.local.example — ISI dulu sebelum jalan command"
  else
    echo "  ⚠️  .env.local tidak ada dan .env.local.example juga tidak ada"
  fi
else
  echo "  ✅ .env.local sudah ada"
fi

echo
echo "═══════════════════════════════════════════════════════════════"
echo "  Setup selesai! 🎯"
echo "═══════════════════════════════════════════════════════════════"
echo
echo "Langkah berikutnya:"
echo "  1. Edit .env.local — isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY"
echo "  2. npm run dev          # start Vite dev server di port 3000"
echo "  3. Buka Claude Code     # CLAUDE.md auto-loaded"
echo
echo "Untuk presentasi mingguan:"
echo "  Cukup bilang ke Claude: \"bikin presentasi week NN\""
echo
echo "Untuk konteks proyek:"
echo "  Baca dulu: KONTEKS-PROYEK.md & REVISI-LOG.md"
echo
