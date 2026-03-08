import { NextResponse } from "next/server"
import { getSite, updateSite } from "@/lib/sites-store"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { siteId, domain } = body

    if (!siteId || !domain) {
      return NextResponse.json(
        { error: "siteId and domain are required" },
        { status: 400 }
      )
    }

    const site = await getSite(siteId)
    if (!site) {
      return NextResponse.json(
        { error: "Site not found" },
        { status: 404 }
      )
    }

    const vercelToken = process.env.VERCEL_API_TOKEN
    const projectId = site.vercelProjectId

    if (!vercelToken) {
      return NextResponse.json(
        { error: "VERCEL_API_TOKEN not configured" },
        { status: 500 }
      )
    }

    if (!projectId) {
      return NextResponse.json(
        { error: "No project ID available" },
        { status: 400 }
      )
    }

    // Call Vercel API to verify the domain
    const verifyResponse = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}/verify`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${vercelToken}`,
        },
      }
    )

    const verifyData = await verifyResponse.json()

    if (!verifyResponse.ok) {
      return NextResponse.json({
        verified: false,
        error: verifyData.error?.message || "Verification failed",
        verification: verifyData.verification || null,
      })
    }

    const isVerified = verifyData.verified || false

    // Update the site's custom domain verification status if verified
    if (isVerified && site.customDomain === domain) {
      await updateSite(siteId, { customDomainVerified: true })
    }

    return NextResponse.json({
      verified: isVerified,
      verification: verifyData.verification || null,
    })
  } catch (error) {
    console.error("Domain verification error:", error)
    return NextResponse.json(
      { error: "Failed to verify domain" },
      { status: 500 }
    )
  }
}
