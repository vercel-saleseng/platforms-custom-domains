import { NextResponse } from "next/server"
import { updateSite, getSite } from "@/lib/sites-store"

// Note: Full domain management requires the Vercel API
// This endpoint stores the desired domain in the database
// For production, integrate with Vercel's domains API: 
// https://vercel.com/docs/rest-api/endpoints/projects#add-a-domain-to-a-project

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { siteId, subdomain, customDomain } = body

    if (!siteId) {
      return NextResponse.json(
        { error: "siteId is required" },
        { status: 400 }
      )
    }

    if (!subdomain && !customDomain) {
      return NextResponse.json(
        { error: "Either subdomain or customDomain is required" },
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

    let domain: string
    const rootDomain = process.env.ROOT_DOMAIN || "v0.site"

    if (subdomain) {
      // Validate subdomain format
      const subdomainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/
      if (!subdomainRegex.test(subdomain)) {
        return NextResponse.json(
          { error: "Invalid subdomain format. Use only lowercase letters, numbers, and hyphens." },
          { status: 400 }
        )
      }
      domain = `${subdomain}.${rootDomain}`
    } else {
      // Validate custom domain format
      const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/
      if (!domainRegex.test(customDomain)) {
        return NextResponse.json(
          { error: "Invalid domain format" },
          { status: 400 }
        )
      }
      domain = customDomain
    }

    // Update site record with new domain
    await updateSite(siteId, { domain })

    return NextResponse.json({ domain, success: true })
  } catch (error) {
    console.error("Domain assignment error:", error)
    return NextResponse.json(
      { error: "Failed to assign domain" },
      { status: 500 }
    )
  }
}
