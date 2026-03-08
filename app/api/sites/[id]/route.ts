import { NextResponse } from "next/server"
import { start } from "workflow/api"
import { getSite, updateSite } from "@/lib/sites-store"
import { siteDeletionWorkflow } from "@/lib/workflows/site-deletion"

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
    const site = await getSite(id)

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 })
    }

    // Start the deletion workflow
    const run = await start(siteDeletionWorkflow, [{ siteId: id }])

    return NextResponse.json({ success: true, workflowRunId: run.runId })
  } catch (error) {
    console.error("Error starting site deletion:", error)
    return NextResponse.json(
      { error: "Failed to start site deletion" },
      { status: 500 }
    )
  }
}
