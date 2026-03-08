"use workflow"

import {
  getSiteForDeletion,
  deleteBlobs,
  removeDomainFromVercel,
  deleteVercelProject,
  deleteSiteFromDb,
} from "./steps"

export interface SiteDeletionInput {
  siteId: string
}

export interface SiteDeletionOutput {
  success: boolean
  siteId: string
}

export async function siteDeletionWorkflow(
  input: SiteDeletionInput
): Promise<SiteDeletionOutput> {
  const { siteId } = input

  // Get site data first
  const site = await getSiteForDeletion(siteId)
  if (!site) {
    throw new Error("Site not found")
  }

  // Step 1: Delete uploaded images from Blob storage
  if (site.imageUrls && site.imageUrls.length > 0) {
    await deleteBlobs(site.imageUrls)
  }

  // Step 2: Remove subdomain from Vercel
  if (site.vercelProjectId && site.subdomain) {
    const rootDomain = process.env.ROOT_DOMAIN || "vercel.zone"
    const fullSubdomain = `${site.subdomain}.${rootDomain}`
    await removeDomainFromVercel(site.vercelProjectId, fullSubdomain)
  }

  // Step 3: Remove custom domain from Vercel
  if (site.vercelProjectId && site.customDomain) {
    await removeDomainFromVercel(site.vercelProjectId, site.customDomain)
  }

  // Step 4: Delete the Vercel project itself
  if (site.vercelProjectId) {
    await deleteVercelProject(site.vercelProjectId)
  }

  // Step 5: Delete from database
  const deleted = await deleteSiteFromDb(siteId)
  if (!deleted) {
    throw new Error("Failed to delete site from database")
  }

  return {
    success: true,
    siteId,
  }
}
