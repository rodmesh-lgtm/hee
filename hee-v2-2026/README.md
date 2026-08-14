# HEE V2 2026 Prototype

Standalone Next.js route: `/hee-v2-2026`

It does not replace the current public page, does not touch Prisma/PostgreSQL, and requires no new npm packages.

Install from `/workspaces/hee`:

```bash
unzip -o hee-v2-2026.zip
cd /workspaces/hee/apps/web
mkdir -p app/hee-v2-2026
cp /workspaces/hee/hee-v2-2026/app/hee-v2-2026/page.tsx app/hee-v2-2026/page.tsx
cp /workspaces/hee/hee-v2-2026/app/hee-v2-2026/page.module.css app/hee-v2-2026/page.module.css
rm -rf .next
npm run build
npm run dev
```
