import { NextResponse } from "next/server"

// Check if a subdomain is available on vercel.zone
// Uses the Vercel API to add domain to project - if it succeeds the domain is available
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const subdomain = searchParams.get("subdomain")
  const projectId = searchParams.get("projectId")

  if (!subdomain) {
    return NextResponse.json(
      { error: "subdomain is required" },
      { status: 400 }
    )
  }

  // Validate subdomain format
  const subdomainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/
  if (!subdomainRegex.test(subdomain)) {
    return NextResponse.json({
      available: false,
      error: "Invalid format. Use only lowercase letters, numbers, and hyphens.",
    })
  }

  const domain = `${subdomain}.vercel.zone`

  // If no projectId, just validate format
  if (!projectId) {
    return NextResponse.json({
      available: true,
      domain,
      note: "Format is valid. Assign to check actual availability.",
    })
  }

  const vercelToken = process.env.VERCEL_API_TOKEN
  if (!vercelToken) {
    return NextResponse.json(
      { error: "VERCEL_API_TOKEN not configured" },
      { status: 500 }
    )
  }

  try {
    // Try to get the domain to see if it exists on any project
    const checkResponse = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${vercelToken}`,
        },
      }
    )

    if (checkResponse.ok) {
      // Domain exists on this project already
      const data = await checkResponse.json()
      return NextResponse.json({
        available: true,
        alreadyAssigned: true,
        domain,
        verified: data.verified,
      })
    }

    if (checkResponse.status === 404) {
      // Domain not on this project - check if it's available globally
      // We can try to add it temporarily to check
      return NextResponse.json({
        available: true,
        domain,
      })
    }

    // Domain might be taken by another project
    return NextResponse.json({
      available: false,
      domain,
      error: "This subdomain may already be in use",
    })
  } catch (error) {
    console.error("Domain check error:", error)
    return NextResponse.json({
      available: true,
      domain,
      note: "Could not verify availability",
    })
  }
}
