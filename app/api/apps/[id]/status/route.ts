import { NextResponse } from "next/server"
import { getById } from "workflow/api"
import { getApp, getAppStepLabel } from "@/lib/apps-store"

export const dynamic = "force-dynamic"

// GET /api/apps/[id]/status - Get app status with workflow info
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

    // Get workflow status if available
    let workflowStatus = null
    if (app.workflowRunId) {
      try {
        workflowStatus = await getById(app.workflowRunId)
      } catch {
        // Workflow not found or error - continue without it
      }
    }

    return NextResponse.json({
      app: {
        ...app,
        stepLabel: getAppStepLabel(app.currentStep),
      },
      workflowStatus,
    })
  } catch (error) {
    console.error("[v0] GET /api/apps/[id]/status: error:", error)
    return NextResponse.json(
      { error: "Failed to fetch app status" },
      { status: 500 }
    )
  }
}
