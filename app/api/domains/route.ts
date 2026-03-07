import { NextResponse } from "next/server"
import { updateSite, getSite } from "@/lib/sites-store"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { siteId, projectId, subdomain, customDomain } = body

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

    const vercelToken = process.env.VERCEL_API_TOKEN
    const vercelProjectId = projectId || site.vercelProjectId

    if (!vercelToken) {
      return NextResponse.json(
        { error: "VERCEL_API_TOKEN not configured" },
        { status: 500 }
      )
    }

    if (!vercelProjectId) {
      return NextResponse.json(
        { error: "Site generation must complete before assigning a domain. Please wait for the site to finish generating." },
        { status: 400 }
      )
    }

    console.log("[v0] domains: assigning domain to project", vercelProjectId)

    let domain: string
    let isCustomDomain = false

    if (subdomain) {
      // Validate subdomain format
      const subdomainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/
      if (!subdomainRegex.test(subdomain)) {
        return NextResponse.json(
          { error: "Invalid subdomain format. Use only lowercase letters, numbers, and hyphens." },
          { status: 400 }
        )
      }
      domain = `${subdomain}.vercel.zone`
    } else {
      // Validate custom domain format
      const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/
      if (!domainRegex.test(customDomain.toLowerCase())) {
        return NextResponse.json(
          { error: "Invalid domain format" },
          { status: 400 }
        )
      }
      domain = customDomain.toLowerCase()
      isCustomDomain = true
    }

    // Add domain to Vercel project using the API
    const addDomainResponse = await fetch(
      `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: domain }),
      }
    )

    const addDomainData = await addDomainResponse.json()
    
    console.log("[v0] domains: Vercel API response", addDomainResponse.status, JSON.stringify(addDomainData))

    if (!addDomainResponse.ok) {
      // Check for specific error codes
      if (addDomainData.error?.code === "domain_already_in_use") {
        return NextResponse.json(
          { error: "This domain is already in use by another project" },
          { status: 409 }
        )
      }
      if (addDomainData.error?.code === "forbidden") {
        return NextResponse.json(
          { error: "You don't have permission to add this domain" },
          { status: 403 }
        )
      }
      if (addDomainData.error?.code === "not_found") {
        return NextResponse.json(
          { error: "The v0 project could not be found. This may be because v0-generated projects require domain management through the v0 dashboard." },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: addDomainData.error?.message || "Failed to add domain" },
        { status: addDomainResponse.status }
      )
    }

    // Update site record with new domain
    await updateSite(siteId, { domain })

    // For custom domains, return verification info
    if (isCustomDomain) {
      return NextResponse.json({
        success: true,
        domain,
        isCustomDomain: true,
        verified: addDomainData.verified || false,
        verification: addDomainData.verification || null,
        // DNS records needed for configuration
        dnsRecords: [
          {
            type: "A",
            name: "@",
            value: "76.76.21.21",
            ttl: 3600,
          },
          {
            type: "CNAME",
            name: "www",
            value: "cname.vercel-dns.com",
            ttl: 3600,
          },
        ],
      })
    }

    return NextResponse.json({
      success: true,
      domain,
      isCustomDomain: false,
      verified: true,
    })
  } catch (error) {
    console.error("Domain assignment error:", error)
    return NextResponse.json(
      { error: "Failed to assign domain" },
      { status: 500 }
    )
  }
}
