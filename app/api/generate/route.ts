import { NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { createSite, updateSiteStatus } from "@/lib/sites-store"
import type { GenerateRequest } from "@/lib/types"
import { start } from "workflow/api"
import { siteGenerationWorkflow } from "@/lib/workflow"

export const maxDuration = 300

export async function POST(request: Request) {
  try {
    const body: GenerateRequest = await request.json()
    const { prompt, imageUrls, siteName } = body

    if (!prompt || !imageUrls || imageUrls.length === 0) {
      return NextResponse.json(
        { error: "Prompt and at least one image are required" },
        { status: 400 }
      )
    }

    // Create site record
    const siteId = nanoid(12)
    const site = createSite(siteId, prompt, imageUrls, siteName)

    // Start the durable workflow
    try {
      await start(siteGenerationWorkflow, [siteId, prompt, imageUrls, site.name])
    } catch (workflowError) {
      // If workflow infrastructure is not available (dev mode, no Vercel),
      // fall back to direct execution
      console.warn("Workflow start failed, falling back to direct execution:", workflowError)
      siteGenerationWorkflow(siteId, prompt, imageUrls, site.name).catch(
        (error) => {
          console.error(`Workflow failed for site ${siteId}:`, error)
          updateSiteStatus(siteId, "error", -1, {
            error:
              error instanceof Error ? error.message : "Workflow failed",
          })
        }
      )
    }

    return NextResponse.json({ siteId, site })
  } catch (error) {
    console.error("Generate error:", error)
    return NextResponse.json(
      { error: "Failed to start site generation" },
      { status: 500 }
    )
  }
}
