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
    // First check if domain is already on this project
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

    // Try to add the domain to check true availability
    // This is the only reliable way to check if a domain is taken globally
    const addResponse = await fetch(
      `https://api.vercel.com/v10/projects/${projectId}/domains`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: domain }),
      }
    )

    if (addResponse.ok) {
      // Domain was added successfully - it's available!
      // Now remove it immediately since this is just a check
      await fetch(
        `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${vercelToken}`,
          },
        }
      )
      
      return NextResponse.json({
        available: true,
        domain,
      })
    }

    // Check the error to see if it's taken
    const errorData = await addResponse.json()
    const errorCode = errorData.error?.code
    const errorMessage = errorData.error?.message || ""

    // Domain is taken by another project
    if (errorCode === "domain_already_in_use" || 
        errorCode === "forbidden" ||
        errorMessage.includes("already") ||
        errorMessage.includes("in use")) {
      return NextResponse.json({
        available: false,
        domain,
        error: "This subdomain is already taken",
      })
    }

    // Some other error
    return NextResponse.json({
      available: false,
      domain,
      error: errorData.error?.message || "Could not verify availability",
    })
  } catch (error) {
    console.error("Domain check error:", error)
    return NextResponse.json({
      available: false,
      domain,
      error: "Could not verify availability",
    })
  }
}
