import { NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { start } from "workflow/api"
import { createSite, getSite, updateSite } from "@/lib/sites-store"
import type { GenerateRequest } from "@/lib/types"
import { siteGenerationWorkflow } from "@/lib/workflows/site-generation"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { siteId, prompt, imageUrls, siteName } = body as GenerateRequest & { siteId?: string }

    if (!prompt || !imageUrls || imageUrls.length === 0) {
      return NextResponse.json(
        { error: "Prompt and at least one image are required" },
        { status: 400 }
      )
    }

    let site
    let finalSiteId = siteId

    // If siteId provided, update existing site; otherwise create new
    if (siteId) {
      const existingSite = await getSite(siteId)
      if (!existingSite) {
        return NextResponse.json({ error: "Site not found" }, { status: 404 })
      }
      // Update the site with new prompt/images and set to queued
      site = await updateSite(siteId, {
        prompt,
        imageUrls,
        name: siteName || existingSite.name,
        status: "queued",
        currentStep: 0,
      })
    } else {
      // Create new site (backward compatible)
      finalSiteId = nanoid(12)
      site = await createSite(finalSiteId, prompt, imageUrls, siteName)
    }

    // Start the durable workflow using Vercel Workflow DevKit
    // Pass args as an array with a single input object
    const run = await start(siteGenerationWorkflow, [{
      siteId: finalSiteId!,
      prompt,
      imageUrls,
      siteName: site!.name,
    }])

    // Store the workflow run ID for status tracking
    await updateSite(finalSiteId!, {
      workflowRunId: run.runId,
    })

    return NextResponse.json({ 
      siteId: finalSiteId, 
      site,
      workflowRunId: run.runId,
    })
  } catch (error) {
    console.error("Generate error:", error)
    return NextResponse.json(
      { error: "Failed to start site generation" },
      { status: 500 }
    )
  }
}
