import { NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { getAllApps, createApp } from "@/lib/apps-store"

export const dynamic = "force-dynamic"

// GET /api/apps - List all apps
export async function GET() {
  try {
    const apps = await getAllApps()
    return NextResponse.json({ apps })
  } catch (error) {
    console.error("[v0] GET /api/apps: error fetching apps:", error)
    return NextResponse.json(
      { error: "Failed to fetch apps" },
      { status: 500 }
    )
  }
}

// POST /api/apps - Create a new app (instant, no data required)
export async function POST() {
  try {
    const appId = nanoid(12)
    const app = await createApp(appId)

    return NextResponse.json({ appId, app })
  } catch (error) {
    console.error("[v0] POST /api/apps: error creating app:", error)
    return NextResponse.json(
      { error: "Failed to create app" },
      { status: 500 }
    )
  }
}
