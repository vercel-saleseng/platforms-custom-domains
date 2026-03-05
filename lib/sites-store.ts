import { sql } from "./db"
import { type SiteRecord, type SiteStatus, STEP_LABELS } from "./types"

// Create a new draft site (no prompt/images yet)
export async function createDraftSite(
  id: string,
  name?: string
): Promise<SiteRecord> {
  const siteName = name || `Untitled Site`
  const now = new Date().toISOString()
  
  await sql`
    INSERT INTO sites (id, name, prompt, image_urls, status, current_step, created_at, updated_at)
    VALUES (${id}, ${siteName}, '', '{}', 'draft', -1, ${now}, ${now})
  `
  
  return {
    id,
    name: siteName,
    prompt: "",
    imageUrls: [],
    status: "draft",
    currentStep: -1,
    totalSteps: 6,
    stepLabel: STEP_LABELS[-1],
    createdAt: now,
    updatedAt: now,
  }
}

// Create a new site record in the database (for backward compatibility)
export async function createSite(
  id: string,
  prompt: string,
  imageUrls: string[],
  name?: string
): Promise<SiteRecord> {
  const siteName = name || `Site ${Date.now()}`
  const now = new Date().toISOString()
  
  await sql`
    INSERT INTO sites (id, name, prompt, image_urls, status, current_step, created_at, updated_at)
    VALUES (${id}, ${siteName}, ${prompt}, ${imageUrls}, 'queued', 0, ${now}, ${now})
  `
  
  return {
    id,
    name: siteName,
    prompt,
    imageUrls,
    status: "queued",
    currentStep: 0,
    totalSteps: 6,
    stepLabel: STEP_LABELS[0],
    createdAt: now,
    updatedAt: now,
  }
}

// Get a site by ID
export async function getSite(id: string): Promise<SiteRecord | undefined> {
  const rows = await sql`SELECT * FROM sites WHERE id = ${id}`
  if (rows.length === 0) return undefined
  return mapRowToSite(rows[0])
}

// Get all sites ordered by creation date (newest first)
export async function getAllSites(): Promise<SiteRecord[]> {
  const rows = await sql`SELECT * FROM sites ORDER BY created_at DESC`
  return rows.map(mapRowToSite)
}

// Update site with partial data
export async function updateSite(
  id: string,
  updates: Partial<SiteRecord>
): Promise<SiteRecord | undefined> {
  const site = await getSite(id)
  if (!site) return undefined

  const now = new Date().toISOString()
  
  await sql`
    UPDATE sites 
    SET 
      name = ${updates.name ?? site.name},
      prompt = ${updates.prompt ?? site.prompt},
      image_urls = ${updates.imageUrls ?? site.imageUrls},
      status = ${updates.status ?? site.status},
      current_step = ${updates.currentStep ?? site.currentStep},
      error = ${updates.error ?? site.error ?? null},
      v0_chat_id = ${updates.v0ChatId ?? site.v0ChatId ?? null},
      v0_project_id = ${updates.v0ProjectId ?? site.v0ProjectId ?? null},
      v0_version_id = ${updates.v0VersionId ?? site.v0VersionId ?? null},
      preview_url = ${updates.previewUrl ?? site.previewUrl ?? null},
      domain = ${updates.domain ?? site.domain ?? null},
      updated_at = ${now}
    WHERE id = ${id}
  `

  return {
    ...site,
    ...updates,
    updatedAt: now,
    stepLabel: STEP_LABELS[updates.currentStep ?? site.currentStep] || site.stepLabel,
  }
}

// Update site status and current step
export async function updateSiteStatus(
  id: string,
  status: SiteStatus,
  step: number,
  extra?: Partial<SiteRecord>
): Promise<SiteRecord | undefined> {
  return updateSite(id, {
    status,
    currentStep: step,
    stepLabel: STEP_LABELS[step],
    ...extra,
  })
}

// Delete a site
export async function deleteSite(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM sites WHERE id = ${id} RETURNING id`
  return result.length > 0
}

// Helper to map database row to SiteRecord
function mapRowToSite(row: Record<string, unknown>): SiteRecord {
  const currentStep = row.current_step as number
  return {
    id: row.id as string,
    name: row.name as string,
    prompt: row.prompt as string,
    imageUrls: row.image_urls as string[],
    status: row.status as SiteStatus,
    currentStep,
    totalSteps: 6,
    stepLabel: STEP_LABELS[currentStep] || "Processing",
    error: row.error as string | undefined,
    v0ChatId: row.v0_chat_id as string | undefined,
    v0ProjectId: row.v0_project_id as string | undefined,
    v0VersionId: row.v0_version_id as string | undefined,
    previewUrl: row.preview_url as string | undefined,
    domain: row.domain as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}
