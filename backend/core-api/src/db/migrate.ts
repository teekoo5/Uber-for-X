/**
 * Database Migration Script
 * 
 * Creates all tables and enables Row-Level Security for multi-tenant isolation.
 * Run with: npm run db:migrate
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';

// Load environment variables
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://mobility:mobility_dev@localhost:5432/mobility_db';

async function runMigrations() {
  console.log('Starting database migration...');
  console.log(`Database URL: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);

  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);

  try {
    // Run Drizzle migrations
    console.log('Running Drizzle migrations...');
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Drizzle migrations completed.');

    // Enable Row-Level Security on tenant-isolated tables
    console.log('Setting up Row-Level Security...');
    
    const rlsTables = [
      'users',
      'vehicles', 
      'rides',
      'payments',
      'driver_ratings',
      'taximeter_readings',
    ];

    for (const table of rlsTables) {
      // Enable RLS
      await db.execute(sql.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`));
      
      // Create policy for tenant isolation
      // This policy ensures users can only see rows matching their tenant_id
      await db.execute(sql.raw(`
        DROP POLICY IF EXISTS tenant_isolation_policy ON ${table};
        CREATE POLICY tenant_isolation_policy ON ${table}
          USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
          WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
      `));
      
      console.log(`  ✓ RLS enabled for ${table}`);
    }

    // Create application role for the API
    await db.execute(sql.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mobility_api') THEN
          CREATE ROLE mobility_api LOGIN;
        END IF;
      END
      $$;
    `));

    // Grant necessary permissions
    for (const table of rlsTables) {
      await db.execute(sql.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON ${table} TO mobility_api`));
    }
    await db.execute(sql.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenants TO mobility_api`));

    console.log('Row-Level Security setup completed.');
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
