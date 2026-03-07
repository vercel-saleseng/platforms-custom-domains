import { NextResponse } from "next/server"
import { del } from "@vercel/blob"
import { getSite, updateSite, deleteSite } from "@/lib/sites-store"

export const dynamic = "force-dynamic"

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const site = await getSite(id)

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 })
    }

    return NextResponse.json({ site })
  } catch (error) {
    console.error("Error fetching site:", error)
    return NextResponse.json(
      { error: "Failed to fetch site" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name } = body

    const site = await getSite(id)
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 })
    }

    const updatedSite = await updateSite(id, { name })
    return NextResponse.json({ site: updatedSite })
  } catch (error) {
    console.error("Error updating site:", error)
    return NextResponse.json(
      { error: "Failed to update site" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const site = await getSite(id)

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 })
    }

    // 1. Delete uploaded images from Blob storage
    if (site.imageUrls && site.imageUrls.length > 0) {
      try {
        await del(site.imageUrls)
      } catch (error) {
        console.warn("Failed to delete blobs:", error)
      }
    }

    // 2. Remove subdomain from Vercel
    if (site.vercelProjectId && site.subdomain) {
      const rootDomain = process.env.ROOT_DOMAIN || "vercel.zone"
      const fullSubdomain = `${site.subdomain}.${rootDomain}`
      await removeDomainFromVercel(site.vercelProjectId, fullSubdomain)
    }

    // 3. Remove custom domain from Vercel
    if (site.vercelProjectId && site.customDomain) {
      await removeDomainFromVercel(site.vercelProjectId, site.customDomain)
    }

    // 4. Delete from database
    const deleted = await deleteSite(id)

    if (!deleted) {
      return NextResponse.json({ error: "Failed to delete site" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting site:", error)
    return NextResponse.json(
      { error: "Failed to delete site" },
      { status: 500 }
    )
  }
}
