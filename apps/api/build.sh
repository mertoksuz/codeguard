#!/bin/bash
set -e

echo "🔧 Installing dependencies..."
cd "$(dirname "$0")/../.."
corepack enable || true
npm install -g pnpm@8.15.0 || true
pnpm install --no-frozen-lockfile

echo "🗄️ Generating Prisma client..."
cd packages/db
pnpm exec prisma generate
cd ../..

echo "🏗️ Building API..."
cd apps/api
pnpm run build

echo "✅ Build complete!"
