-- Migration: Add separate fields for subdomain and custom domain
-- This allows both to work simultaneously (like Vercel)

-- Add subdomain field (e.g., "my-site-abc123" for "my-site-abc123.vercel.zone")
ALTER TABLE sites ADD COLUMN IF NOT EXISTS subdomain TEXT;

-- Add custom domain field (e.g., "example.com")
ALTER TABLE sites ADD COLUMN IF NOT EXISTS custom_domain TEXT;

-- Add custom domain verification status
ALTER TABLE sites ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN DEFAULT FALSE;

-- Create index on subdomain for lookups
CREATE INDEX IF NOT EXISTS idx_sites_subdomain ON sites(subdomain);

-- Create index on custom_domain for lookups
CREATE INDEX IF NOT EXISTS idx_sites_custom_domain ON sites(custom_domain);
