# HEE Profile Concept V1

Standalone Next.js route prototype. It does NOT replace the current public business page.

## Install in existing Codespaces project

From `/workspaces/hee/apps/web`:

```bash
mkdir -p app/hee-profile-concept
cp /workspaces/hee/hee-profile-concept-v1/app/hee-profile-concept/page.tsx app/hee-profile-concept/page.tsx
cp /workspaces/hee/hee-profile-concept-v1/app/hee-profile-concept/page.module.css app/hee-profile-concept/page.module.css
rm -rf .next
npm run dev
```

Open:

`/hee-profile-concept`

## Test checklist

- 390px / 430px / 1366px / 1536px.
- Click green verification badge.
- Switch departments under "تواصل مع القسم المناسب".
- Test WhatsApp / phone / email actions.
- Switch website/store choice.
- Confirm it feels like a business profile, not a corporate website/store.

## Safety

- No new packages.
- No PostgreSQL changes.
- No Prisma migration.
- Does not touch `public-business-page.tsx`.
