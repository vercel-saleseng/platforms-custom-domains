import { NextResponse } from "next/server"
import { getApp, updateApp, deleteApp } from "@/lib/apps-store"

// GET /api/apps/[id] - Get app by ID
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const app = await getApp(id)
    
    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 })
    }
    
    return NextResponse.json({ app })
  } catch (error) {
    console.error("[v0] GET /api/apps/[id]: error:", error)
    return NextResponse.json(
      { error: "Failed to fetch app" },
      { status: 500 }
    )
  }
}

// PATCH /api/apps/[id] - Update app
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const app = await updateApp(id, body)
    
    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 })
    }
    
    return NextResponse.json({ app })
  } catch (error) {
    console.error("[v0] PATCH /api/apps/[id]: error:", error)
    return NextResponse.json(
      { error: "Failed to update app" },
      { status: 500 }
    )
  }
}

// DELETE /api/apps/[id] - Delete app
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const deleted = await deleteApp(id)
    
    if (!deleted) {
      return NextResponse.json({ error: "App not found" }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] DELETE /api/apps/[id]: error:", error)
    return NextResponse.json(
      { error: "Failed to delete app" },
      { status: 500 }
    )
  }
}
