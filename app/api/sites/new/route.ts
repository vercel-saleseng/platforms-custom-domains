import { NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { createDraftSite } from "@/lib/sites-store"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { name } = body as { name?: string }

    const siteId = nanoid(12)
    const site = await createDraftSite(siteId, name)

    return NextResponse.json({ siteId, site })
  } catch (error) {
    console.error("Create draft site error:", error)
    return NextResponse.json(
      { error: "Failed to create site" },
      { status: 500 }
    )
  }
}
