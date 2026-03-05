-- Create sites table for storing generated site records
CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  current_step INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  v0_chat_id TEXT,
  v0_project_id TEXT,
  v0_version_id TEXT,
  preview_url TEXT,
  domain TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status);

-- Create index on created_at for ordering
CREATE INDEX IF NOT EXISTS idx_sites_created_at ON sites(created_at DESC);
