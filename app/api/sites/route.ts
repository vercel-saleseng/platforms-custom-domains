import { NextResponse } from "next/server"
import { getAllSites } from "@/lib/sites-store"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    console.log("[v0] GET /api/sites: fetching all sites from database")
    const sites = await getAllSites()
    console.log("[v0] GET /api/sites: found", sites.length, "sites")
    return NextResponse.json({ sites })
  } catch (error) {
    console.error("[v0] GET /api/sites: error fetching sites:", error)
    return NextResponse.json(
      { error: "Failed to fetch sites" },
      { status: 500 }
    )
  }
}
