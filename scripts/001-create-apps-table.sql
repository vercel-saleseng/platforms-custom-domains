-- Create apps table for the autonomous internal tools platform
-- This replaces the sites table for the new chat-first approach

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
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_apps_subdomain ON apps(subdomain);
CREATE INDEX IF NOT EXISTS idx_apps_v0_chat_id ON apps(v0_chat_id);
CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);
CREATE INDEX IF NOT EXISTS idx_apps_created_at ON apps(created_at DESC);
