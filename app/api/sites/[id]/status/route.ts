import { NextResponse } from "next/server"
import { getRun } from "workflow/api"
import { getSite } from "@/lib/sites-store"

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

    // If there's a workflow run ID, get the run status
    let workflowStatus = null
    if (site.workflowRunId) {
      try {
        const run = getRun(site.workflowRunId)
        const status = await run.status
        const createdAt = await run.createdAt
        
        workflowStatus = {
          runId: run.runId,
          status,
          createdAt: createdAt?.toISOString(),
        }
      } catch (error) {
        // Workflow run might not exist anymore
        console.error("Failed to get workflow run:", error)
      }
    }

    return NextResponse.json({
      site,
      workflowStatus,
    })
  } catch (error) {
    console.error("Error fetching site status:", error)
    return NextResponse.json(
      { error: "Failed to fetch site status" },
      { status: 500 }
    )
  }
}
