import { NextResponse } from "next/server"
import { start } from "workflow/api"
import { getApp, updateApp } from "@/lib/apps-store"
import { appIterationDeployWorkflow } from "@/lib/workflows/app-iteration"

// POST /api/apps/[id]/deploy - Deploy pending changes
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const app = await getApp(id)
    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 })
    }

    if (!app.hasPendingChanges) {
      return NextResponse.json(
        { error: "No pending changes to deploy" },
        { status: 400 }
      )
    }

    if (!app.v0ProjectId || !app.v0ChatId || !app.v0VersionId) {
      return NextResponse.json(
        { error: "App has not been built yet" },
        { status: 400 }
      )
    }

    // Start the deployment workflow
    const run = await start(appIterationDeployWorkflow, [{ appId: id }])

    // Store the workflow run ID
    await updateApp(id, {
      workflowRunId: run.runId,
    })

    return NextResponse.json({
      success: true,
      workflowRunId: run.runId,
      status: "deploying",
    })

  } catch (error) {
    console.error("[v0] POST /api/apps/[id]/deploy: error:", error)
    return NextResponse.json(
      { error: "Failed to start deployment" },
      { status: 500 }
    )
  }
}
