import { NextResponse } from "next/server"
import { getSite } from "@/lib/sites-store"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get("siteId")
    const domain = searchParams.get("domain")

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
    const vercelProjectId = site.vercelProjectId

    if (!vercelToken || !vercelProjectId) {
      // Return default DNS records if no Vercel integration
      return NextResponse.json({
        domain,
        verified: false,
        dnsRecords: [
          { type: "A", name: "@", value: "76.76.21.21" },
          { type: "CNAME", name: "www", value: "cname.vercel-dns.com" },
        ],
      })
    }

    // Get domain info from Vercel
    const domainResponse = await fetch(
      `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/${domain}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${vercelToken}`,
        },
      }
    )

    if (!domainResponse.ok) {
      // Domain not found on project, return default records
      return NextResponse.json({
        domain,
        verified: false,
        dnsRecords: [
          { type: "A", name: "@", value: "76.76.21.21" },
          { type: "CNAME", name: "www", value: "cname.vercel-dns.com" },
        ],
      })
    }

    const domainData = await domainResponse.json()

    // Build DNS records based on verification requirements
    const dnsRecords = []

    // Check if there's a verification record needed
    if (domainData.verification && domainData.verification.length > 0) {
      for (const v of domainData.verification) {
        dnsRecords.push({
          type: v.type,
          name: v.domain === domain ? "@" : v.domain.replace(`.${domain}`, ""),
          value: v.value,
        })
      }
    }

    // Add standard A record for apex domain
    if (!domain.startsWith("www.")) {
      dnsRecords.push({
        type: "A",
        name: "@",
        value: "76.76.21.21",
      })
    }

    // Add CNAME for www subdomain
    dnsRecords.push({
      type: "CNAME",
      name: "www",
      value: "cname.vercel-dns.com",
    })

    return NextResponse.json({
      domain,
      verified: domainData.verified || false,
      dnsRecords,
    })
  } catch (error) {
    console.error("Domain info error:", error)
    return NextResponse.json(
      { error: "Failed to fetch domain info" },
      { status: 500 }
    )
  }
}
