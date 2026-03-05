import { type SiteRecord, type SiteStatus, STEP_LABELS } from "./types"

// In-memory store for MVP. Replace with a database for production.
const sites = new Map<string, SiteRecord>()

export function createSite(
  id: string,
  prompt: string,
  imageUrls: string[],
  name?: string
): SiteRecord {
  const site: SiteRecord = {
    id,
    name: name || `Site ${sites.size + 1}`,
    prompt,
    imageUrls,
    status: "queued",
    currentStep: 0,
    totalSteps: 6,
    stepLabel: STEP_LABELS[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  sites.set(id, site)
  return site
}

export function getSite(id: string): SiteRecord | undefined {
  return sites.get(id)
}

export function getAllSites(): SiteRecord[] {
  return Array.from(sites.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function updateSite(
  id: string,
  updates: Partial<SiteRecord>
): SiteRecord | undefined {
  const site = sites.get(id)
  if (!site) return undefined

  const updated = {
    ...site,
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  // Auto-set step label if step changes
  if (updates.currentStep !== undefined) {
    updated.stepLabel = STEP_LABELS[updates.currentStep] || updated.stepLabel
  }

  sites.set(id, updated)
  return updated
}

export function updateSiteStatus(
  id: string,
  status: SiteStatus,
  step: number,
  extra?: Partial<SiteRecord>
): SiteRecord | undefined {
  return updateSite(id, {
    status,
    currentStep: step,
    stepLabel: STEP_LABELS[step],
    ...extra,
  })
}

export function deleteSite(id: string): boolean {
  return sites.delete(id)
}
