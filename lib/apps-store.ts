import { sql } from "./db"
import { type AppRecord, type AppStatus, APP_STEP_LABELS } from "./types"

// Generate a URL-friendly subdomain from an ID
function generateSubdomain(id: string): string {
  // Use first 8 chars of ID as subdomain
  return `app-${id.substring(0, 8)}`
}

// Create a new app (instant, no data required)
export async function createApp(id: string): Promise<AppRecord> {
  const subdomain = generateSubdomain(id)
  const now = new Date().toISOString()
  
  await sql`
    INSERT INTO apps (id, subdomain, status, current_step, has_pending_changes, created_at, updated_at)
    VALUES (${id}, ${subdomain}, 'created', 0, false, ${now}, ${now})
  `
  
  return {
    id,
    subdomain,
    status: "created",
    currentStep: 0,
    hasPendingChanges: false,
    createdAt: now,
    updatedAt: now,
  }
}

// Get an app by ID
export async function getApp(id: string): Promise<AppRecord | undefined> {
  const rows = await sql`SELECT * FROM apps WHERE id = ${id}`
  if (rows.length === 0) return undefined
  return mapRowToApp(rows[0])
}

// Get all apps ordered by creation date (newest first)
export async function getAllApps(): Promise<AppRecord[]> {
  const rows = await sql`SELECT * FROM apps ORDER BY created_at DESC`
  return rows.map(mapRowToApp)
}

// Update app with partial data
export async function updateApp(
  id: string,
  updates: Partial<AppRecord>
): Promise<AppRecord | undefined> {
  const app = await getApp(id)
  if (!app) return undefined

  const now = new Date().toISOString()
  
  await sql`
    UPDATE apps 
    SET 
      name = ${updates.name ?? app.name ?? null},
      description = ${updates.description ?? app.description ?? null},
      v0_chat_id = ${updates.v0ChatId ?? app.v0ChatId ?? null},
      v0_project_id = ${updates.v0ProjectId ?? app.v0ProjectId ?? null},
      v0_version_id = ${updates.v0VersionId ?? app.v0VersionId ?? null},
      vercel_project_id = ${updates.vercelProjectId ?? app.vercelProjectId ?? null},
      vercel_team_id = ${updates.vercelTeamId ?? app.vercelTeamId ?? null},
      preview_url = ${updates.previewUrl ?? app.previewUrl ?? null},
      custom_domain = ${'customDomain' in updates ? (updates.customDomain ?? null) : (app.customDomain ?? null)},
      custom_domain_verified = ${updates.customDomainVerified ?? app.customDomainVerified ?? false},
      current_deployment_id = ${updates.currentDeploymentId ?? app.currentDeploymentId ?? null},
      has_pending_changes = ${updates.hasPendingChanges ?? app.hasPendingChanges},
      pending_message_id = ${updates.pendingMessageId ?? app.pendingMessageId ?? null},
      workflow_run_id = ${updates.workflowRunId ?? app.workflowRunId ?? null},
      status = ${updates.status ?? app.status},
      current_step = ${updates.currentStep ?? app.currentStep},
      error = ${updates.error ?? app.error ?? null},
      updated_at = ${now}
    WHERE id = ${id}
  `

  return {
    ...app,
    ...updates,
    updatedAt: now,
  }
}

// Update app status and current step
export async function updateAppStatus(
  id: string,
  status: AppStatus,
  step: number,
  extra?: Partial<AppRecord>
): Promise<AppRecord | undefined> {
  return updateApp(id, {
    status,
    currentStep: step,
    ...extra,
  })
}

// Mark app as having pending changes
export async function markPendingChanges(
  id: string,
  messageId: string
): Promise<AppRecord | undefined> {
  return updateApp(id, {
    hasPendingChanges: true,
    pendingMessageId: messageId,
  })
}

// Clear pending changes after deploy
export async function clearPendingChanges(
  id: string
): Promise<AppRecord | undefined> {
  return updateApp(id, {
    hasPendingChanges: false,
    pendingMessageId: undefined,
  })
}

// Delete an app
export async function deleteApp(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM apps WHERE id = ${id} RETURNING id`
  return result.length > 0
}

// Helper to map database row to AppRecord
function mapRowToApp(row: Record<string, unknown>): AppRecord {
  return {
    id: row.id as string,
    name: row.name as string | undefined,
    description: row.description as string | undefined,
    subdomain: row.subdomain as string,
    v0ChatId: row.v0_chat_id as string | undefined,
    v0ProjectId: row.v0_project_id as string | undefined,
    v0VersionId: row.v0_version_id as string | undefined,
    vercelProjectId: row.vercel_project_id as string | undefined,
    vercelTeamId: row.vercel_team_id as string | undefined,
    previewUrl: row.preview_url as string | undefined,
    customDomain: row.custom_domain as string | undefined,
    customDomainVerified: row.custom_domain_verified as boolean | undefined,
    currentDeploymentId: row.current_deployment_id as string | undefined,
    hasPendingChanges: row.has_pending_changes as boolean,
    pendingMessageId: row.pending_message_id as string | undefined,
    workflowRunId: row.workflow_run_id as string | undefined,
    status: row.status as AppStatus,
    currentStep: row.current_step as number,
    error: row.error as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// Get step label for current step
export function getAppStepLabel(step: number): string {
  return APP_STEP_LABELS[step] || "Processing..."
}
