// scripts/create-owner-vercel.ts
// Run: npx tsx scripts/create-owner-vercel.ts
import { db } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';

async function main() {
  const username = 'NMDDER';
  const password = 'njader-owner-2026';
  const email = 'owner@njader.dev';

  const existing = await db.user.findFirst({ where: { role: 'owner' } });
  if (existing) {
    console.log('⚠️  Owner already exists:', existing.username);
    return;
  }

  await db.user.create({
    data: {
      username,
      email,
      passwordHash: hashPassword(password),
      displayName: 'NMDDER (Owner)',
      role: 'owner',
      trialStartedAt: new Date(),
      trialEndsAt: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000),
      trialUsed: false,
    },
  });

  console.log('✅ Owner account created!');
  console.log('═══════════════════════════════════════════════════');
  console.log('  👑 OWNER ACCOUNT');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Username: ${username}`);
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log('  🔑 Access admin panel at: /admin-secret');
  console.log('═══════════════════════════════════════════════════');

  const defaults = [
    { id: 'price_month', value: '100' },
    { id: 'price_quarter', value: '200' },
    { id: 'price_year', value: '500' },
    { id: 'payment_url', value: 'https://t.me/NMDDER_DEV' },
    { id: 'brand_name', value: 'njader' },
    { id: 'support_contact', value: '@NMDDER_SUPPORT' },
    { id: 'trial_days', value: '3' },
  ];

  for (const setting of defaults) {
    await db.saaSSetting.upsert({
      where: { id: setting.id },
      create: setting,
      update: { value: setting.value },
    });
  }
  console.log('✓ Default SaaS settings initialized');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
