import { NextResponse } from "next/server"
import { getSite, updateSite, deleteSite } from "@/lib/sites-store"

export const dynamic = "force-dynamic"

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
    const deleted = await deleteSite(id)

    if (!deleted) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 })
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
