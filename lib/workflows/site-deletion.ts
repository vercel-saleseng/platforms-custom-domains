"use workflow"

import { del } from "@vercel/blob"
import { getSite, deleteSite } from "../sites-store"

export interface SiteDeletionInput {
  siteId: string
}

export interface SiteDeletionOutput {
  success: boolean
  siteId: string
}

// Helper to remove domain from Vercel project
async function removeDomainFromVercel(
  vercelProjectId: string,
  domain: string
): Promise<void> {
  const vercelToken = process.env.VERCEL_API_TOKEN
  if (!vercelToken || !vercelProjectId || !domain) return

  try {
    await fetch(
      `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/${domain}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${vercelToken}`,
        },
      }
    )
  } catch (error) {
    console.warn(`Failed to remove domain ${domain}:`, error)
  }
}

export async function siteDeletionWorkflow(
  input: SiteDeletionInput
): Promise<SiteDeletionOutput> {
  const { siteId } = input

  // Get site data first
  const site = await getSite(siteId)
  if (!site) {
    throw new Error("Site not found")
  }

  // Step 1: Delete uploaded images from Blob storage
  if (site.imageUrls && site.imageUrls.length > 0) {
    try {
      await del(site.imageUrls)
    } catch (error) {
      console.warn("Failed to delete blobs:", error)
      // Continue anyway - blobs can be cleaned up later
    }
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

  // Step 4: Delete from database
  const deleted = await deleteSite(siteId)
  if (!deleted) {
    throw new Error("Failed to delete site from database")
  }

  return {
    success: true,
    siteId,
  }
}
