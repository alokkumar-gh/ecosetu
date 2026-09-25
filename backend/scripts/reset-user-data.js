#!/usr/bin/env node
/**
 * EcoSetu — Safe Fresh-User-Data Database Reset Script
 * 
 * Purpose:
 *   Resets ECOSETU to a pristine state for normal users while preserving:
 *   - Database schema, types, and tables
 *   - Prisma migration history (_prisma_migrations)
 *   - Admin accounts (role = 'ADMIN', e.g. admin@ecosetu.org)
 *   - System/service accounts and static configuration
 *   - Reference and master data
 * 
 * Usage:
 *   node scripts/reset-user-data.js --confirm-reset [--no-backup]
 *   npm run reset:user-data -- --confirm-reset
 * 
 * Safety:
 *   - Requires explicit --confirm-reset flag.
 *   - Refuses to drop database, schema, or tables.
 *   - Performs dependency-aware cascading deletion in a safe transaction.
 *   - Exports pre-reset data snapshot before modifying data.
 *   - Verifies post-reset state against business requirements.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ─── Command Line Safety Guard ───────────────────────────────────────────────

const args = process.argv.slice(2);
const hasConfirmFlag = args.includes('--confirm-reset');
const skipBackup = args.includes('--no-backup');

if (!hasConfirmFlag) {
  console.error('\n=================================================================');
  console.error(' [!] SAFETY ERROR: Reset confirmation flag missing.');
  console.error('=================================================================');
  console.error(' This script resets all user-generated data in the database.');
  console.error(' To execute, you MUST explicitly provide the confirmation flag:\n');
  console.error('   node scripts/reset-user-data.js --confirm-reset\n');
  console.error(' Options:');
  console.error('   --confirm-reset   Required confirmation flag to perform reset');
  console.error('   --no-backup       Skip pre-reset JSON data backup (not recommended)');
  console.error('=================================================================\n');
  process.exit(1);
}

// ─── Environment & Target Identification ──────────────────────────────────────

const dbUrl = process.env.DATABASE_URL || '';
if (!dbUrl) {
  console.error('[!] FATAL: DATABASE_URL environment variable is not defined.');
  process.exit(1);
}

let host = 'unknown';
let dbName = 'unknown';
try {
  const urlObj = new URL(dbUrl.replace(/^postgresql:\/\//, 'http://'));
  host = urlObj.hostname;
  dbName = urlObj.pathname.replace(/^\//, '');
} catch {
  // masked URL
}

const env = process.env.NODE_ENV || 'development';
const timestamp = new Date().toISOString();

console.log('\n=================================================================');
console.log('            ECOSETU USER-DATA RESET EXECUTION                   ');
console.log('=================================================================');
console.log(` Target Environment : ${env}`);
console.log(` Target Database    : ${dbName}`);
console.log(` Database Host      : ${host}`);
console.log(` Reset Timestamp    : ${timestamp}`);
console.log(' Mode               : Dependency-aware transaction deletion');
console.log('=================================================================\n');

// ─── Tables to Clean (Reverse Topological Order) ──────────────────────────────

const USER_GENERATED_TABLES = [
  'marketplace_dispute_events',
  'cash_payment_confirmations',
  'marketplace_disputes',
  'razorpay_payment_records',
  'transaction_bills',
  'transactions',
  'handover_photos',
  'handover_records',
  'quotes',
  'sourcing_responses',
  'sourcing_requests',
  'recycler_offered_rates',
  'pickup_batch_lots',
  'pickup_batches',
  'material_lot_photos',
  'material_lot_items',
  'material_lots',
  'material_items',
  'recycling_records',
  'consignment_items',
  'consignments',
  'ai_predictions',
  'pickups',
  'ewaste_items',
  'collection_requests',
  'notifications',
  'device_tokens',
  'verifications',
  'collector_profiles',
  'recycler_profiles',
  '_media_storage',
];

async function main() {
  // Step 1: Pre-reset counts
  console.log('--- Step 1: Auditing pre-reset table counts ---');
  const beforeCounts = {};
  for (const table of USER_GENERATED_TABLES) {
    try {
      const res = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${table}"`);
      beforeCounts[table] = res[0]?.count ?? 0;
    } catch (e) {
      beforeCounts[table] = 0;
    }
  }

  // Count users by role
  const usersBefore = await prisma.$queryRaw`
    SELECT role::text, COUNT(*)::int as count 
    FROM users 
    GROUP BY role;
  `;
  const usersBeforeMap = {};
  usersBefore.forEach(r => { usersBeforeMap[r.role] = r.count; });
  beforeCounts['users (TOTAL)'] = await prisma.user.count();
  beforeCounts['users (ADMIN)'] = usersBeforeMap['ADMIN'] || 0;
  beforeCounts['users (CITIZEN)'] = usersBeforeMap['CITIZEN'] || 0;
  beforeCounts['users (COLLECTOR)'] = usersBeforeMap['INFORMAL_COLLECTOR'] || 0;
  beforeCounts['users (RECYCLER)'] = usersBeforeMap['RECYCLER'] || 0;

  // Migrations count
  const migrationsCount = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM _prisma_migrations`;
  const migrationHistoryBefore = migrationsCount[0]?.count ?? 0;

  console.log(`Total users before reset: ${beforeCounts['users (TOTAL)']} (Admins: ${beforeCounts['users (ADMIN)']})`);
  console.log(`Prisma migrations recorded: ${migrationHistoryBefore}`);

  // Step 2: Backup pre-reset data if not skipped
  if (!skipBackup) {
    console.log('\n--- Step 2: Creating local pre-reset data snapshot ---');
    const backupDir = path.resolve(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const cleanTs = timestamp.replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `ecosetu-reset-backup-${cleanTs}.json`);

    const backupData = {
      timestamp,
      environment: env,
      database: dbName,
      host,
      tableCounts: beforeCounts,
      records: {},
    };

    // Dump sample of tables (up to 2000 records each)
    for (const table of USER_GENERATED_TABLES) {
      if (beforeCounts[table] > 0 && table !== '_media_storage') {
        try {
          const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "${table}" LIMIT 2000`);
          backupData.records[table] = rows;
        } catch (err) {
          backupData.records[table] = `Export error: ${err.message}`;
        }
      }
    }

    // Dump non-admin users
    const nonAdminUsers = await prisma.user.findMany({
      where: { role: { not: 'ADMIN' } },
      select: { id: true, email: true, name: true, phone: true, role: true, status: true, createdAt: true },
    });
    backupData.records['users_non_admin'] = nonAdminUsers;

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');
    console.log(`✔ Pre-reset snapshot saved: ${backupFile}`);
  } else {
    console.log('\n--- Step 2: Skipping backup (--no-backup specified) ---');
  }

  // Step 3: Perform atomic transaction reset
  console.log('\n--- Step 3: Executing dependency-aware reset ---');
  const deletedCounts = {};

  await prisma.$transaction(async (tx) => {
    // 1. Delete user-generated leaf tables first
    for (const table of USER_GENERATED_TABLES) {
      if (table === 'notifications') {
        const delRes = await tx.$executeRawUnsafe(
          `DELETE FROM "${table}" WHERE user_id NOT IN (SELECT id FROM users WHERE role = 'ADMIN')`
        );
        deletedCounts[table] = delRes;
      } else if (table === 'device_tokens') {
        const delRes = await tx.$executeRawUnsafe(
          `DELETE FROM "${table}" WHERE user_id NOT IN (SELECT id FROM users WHERE role = 'ADMIN')`
        );
        deletedCounts[table] = delRes;
      } else {
        const delRes = await tx.$executeRawUnsafe(`DELETE FROM "${table}"`);
        deletedCounts[table] = delRes;
      }
    }

    // 2. Clean user-generated audit logs (preserve admin and system audit logs)
    const delAudit = await tx.$executeRawUnsafe(
      `DELETE FROM audit_logs WHERE actor_id IN (SELECT id FROM users WHERE role != 'ADMIN')`
    );
    deletedCounts['audit_logs (user-generated)'] = delAudit;

    // 3. Delete non-admin users
    const delUsers = await tx.$executeRawUnsafe(
      `DELETE FROM users WHERE role != 'ADMIN'`
    );
    deletedCounts['users (CITIZEN, COLLECTOR, RECYCLER)'] = delUsers;

    // 4. Ensure canonical Admin account exists and is ACTIVE
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@ecosetu.org';
    const defaultPassword = process.env.ADMIN_PASSWORD || process.env.DEMO_USER_PASSWORD || 'Password123!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    
    await tx.user.upsert({
      where: { email: adminEmail },
      update: {
        status: 'ACTIVE',
        role: 'ADMIN',
      },
      create: {
        email: adminEmail,
        passwordHash,
        name: 'EcoSetu System Administrator',
        phone: '+919876543200',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
  }, {
    timeout: 90000,
  });

  console.log('✔ Transaction committed successfully.');

  // Step 4: Storage file cleanup
  console.log('\n--- Step 4: Cleaning local user uploads ---');
  const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
  let deletedFiles = 0;
  if (fs.existsSync(uploadDir)) {
    const entries = fs.readdirSync(uploadDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(uploadDir, entry.name);
      if (entry.isFile() && !entry.name.startsWith('.gitkeep')) {
        try {
          fs.unlinkSync(fullPath);
          deletedFiles++;
        } catch (e) {
          console.warn(`Could not remove ${entry.name}:`, e.message);
        }
      } else if (entry.isDirectory() && entry.name === 'ewaste') {
        const subFiles = fs.readdirSync(fullPath);
        for (const sf of subFiles) {
          if (!sf.startsWith('.gitkeep')) {
            try {
              fs.unlinkSync(path.join(fullPath, sf));
              deletedFiles++;
            } catch (e) {}
          }
        }
      }
    }
  }
  console.log(`✔ Storage files removed: ${deletedFiles}`);

  // Step 5: Post-reset verification
  console.log('\n--- Step 5: Verifying post-reset state ---');
  const afterCounts = {};
  for (const table of USER_GENERATED_TABLES) {
    try {
      const res = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${table}"`);
      afterCounts[table] = res[0]?.count ?? 0;
    } catch (e) {
      afterCounts[table] = 0;
    }
  }

  const usersAfter = await prisma.$queryRaw`
    SELECT role::text, COUNT(*)::int as count 
    FROM users 
    GROUP BY role;
  `;
  const usersAfterMap = {};
  usersAfter.forEach(r => { usersAfterMap[r.role] = r.count; });
  afterCounts['users (TOTAL)'] = await prisma.user.count();
  afterCounts['users (ADMIN)'] = usersAfterMap['ADMIN'] || 0;
  afterCounts['users (CITIZEN)'] = usersAfterMap['CITIZEN'] || 0;
  afterCounts['users (COLLECTOR)'] = usersAfterMap['INFORMAL_COLLECTOR'] || 0;
  afterCounts['users (RECYCLER)'] = usersAfterMap['RECYCLER'] || 0;

  const migrationHistoryAfter = (await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM _prisma_migrations`)[0]?.count ?? 0;

  // Print reconciliation table
  console.log('\n' + '='.repeat(70));
  console.log('Table Name'.padEnd(38) + 'Before'.padStart(10) + 'Deleted'.padStart(10) + 'After'.padStart(10));
  console.log('-'.repeat(70));
  for (const table of USER_GENERATED_TABLES) {
    const b = beforeCounts[table] ?? 0;
    const d = deletedCounts[table] ?? (b - (afterCounts[table] ?? 0));
    const a = afterCounts[table] ?? 0;
    console.log(table.padEnd(38) + String(b).padStart(10) + String(d).padStart(10) + String(a).padStart(10));
  }
  console.log('-'.repeat(70));
  console.log('users (CITIZEN)'.padEnd(38) + String(beforeCounts['users (CITIZEN)']).padStart(10) + String(beforeCounts['users (CITIZEN)']).padStart(10) + String(afterCounts['users (CITIZEN)']).padStart(10));
  console.log('users (COLLECTOR)'.padEnd(38) + String(beforeCounts['users (COLLECTOR)']).padStart(10) + String(beforeCounts['users (COLLECTOR)']).padStart(10) + String(afterCounts['users (COLLECTOR)']).padStart(10));
  console.log('users (RECYCLER)'.padEnd(38) + String(beforeCounts['users (RECYCLER)']).padStart(10) + String(beforeCounts['users (RECYCLER)']).padStart(10) + String(afterCounts['users (RECYCLER)']).padStart(10));
  console.log('users (ADMIN) [PRESERVED]'.padEnd(38) + String(beforeCounts['users (ADMIN)']).padStart(10) + '0'.padStart(10) + String(afterCounts['users (ADMIN)']).padStart(10));
  console.log('_prisma_migrations [PRESERVED]'.padEnd(38) + String(migrationHistoryBefore).padStart(10) + '0'.padStart(10) + String(migrationHistoryAfter).padStart(10));
  console.log('='.repeat(70));

  // Step 6: Validations
  const citizenZero = afterCounts['users (CITIZEN)'] === 0;
  const collectorZero = afterCounts['users (COLLECTOR)'] === 0;
  const recyclerZero = afterCounts['users (RECYCLER)'] === 0;
  const adminPreserved = afterCounts['users (ADMIN)'] >= 1;
  const migrationsIntact = migrationHistoryBefore === migrationHistoryAfter;

  console.log('\n--- Final Verification Checklist ---');
  console.log(`[${citizenZero ? 'PASS' : 'FAIL'}] Citizen accounts = 0 (Actual: ${afterCounts['users (CITIZEN)']})`);
  console.log(`[${collectorZero ? 'PASS' : 'FAIL'}] Collector accounts = 0 (Actual: ${afterCounts['users (COLLECTOR)']})`);
  console.log(`[${recyclerZero ? 'PASS' : 'FAIL'}] Recycler accounts = 0 (Actual: ${afterCounts['users (RECYCLER)']})`);
  console.log(`[${adminPreserved ? 'PASS' : 'FAIL'}] Admin accounts preserved (Actual: ${afterCounts['users (ADMIN)']})`);
  console.log(`[${migrationsIntact ? 'PASS' : 'FAIL'}] Migration history intact (Records: ${migrationHistoryAfter})`);

  if (!citizenZero || !collectorZero || !recyclerZero || !adminPreserved || !migrationsIntact) {
    console.error('\n[!] VERIFICATION WARNING: One or more safety criteria failed.');
    process.exit(1);
  }

  console.log('\n=================================================================');
  console.log(' ✔ DATABASE RESET COMPLETED SUCCESSFULLY');
  console.log('   The application is now in a pristine state for normal users.');
  console.log('=================================================================\n');
}

main()
  .catch((err) => {
    console.error('\n[!] FATAL ERROR DURING RESET:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
