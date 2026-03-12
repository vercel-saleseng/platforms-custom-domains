import { neon } from '@neondatabase/serverless';

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  
  try {
    console.log('Creating apps table...');
    
    // Create the apps table
    await sql`
      CREATE TABLE IF NOT EXISTS apps (
        id TEXT PRIMARY KEY,
        name TEXT,
        description TEXT,
        subdomain TEXT UNIQUE NOT NULL,
        
        -- v0 Integration
        v0_chat_id TEXT,
        v0_project_id TEXT,
        v0_version_id TEXT,
        
        -- Vercel Integration  
        vercel_project_id TEXT,
        vercel_team_id TEXT,
        
        -- Deployment State
        preview_url TEXT,
        custom_domain TEXT,
        custom_domain_verified BOOLEAN DEFAULT FALSE,
        current_deployment_id TEXT,
        
        -- Pending Changes (staged but not deployed)
        has_pending_changes BOOLEAN DEFAULT FALSE,
        pending_message_id TEXT,
        
        -- Workflow tracking
        workflow_run_id TEXT,
        status TEXT DEFAULT 'created',
        current_step INTEGER DEFAULT 0,
        error TEXT,
        
        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    
    console.log('Creating indexes...');
    
    await sql`CREATE INDEX IF NOT EXISTS idx_apps_subdomain ON apps(subdomain)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_apps_v0_chat_id ON apps(v0_chat_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_apps_created_at ON apps(created_at DESC)`;
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
