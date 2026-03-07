import { NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { createSite, getSite, updateSite, updateSiteStatus } from "@/lib/sites-store"
import type { GenerateRequest } from "@/lib/types"
import {
  analyzeImages,
  buildPrompt,
  createV0Site,
  deploySite,
  assignDomain,
  markComplete,
} from "@/lib/workflows/steps"

// Run the generation pipeline (fire-and-forget for preview compatibility)
async function runGenerationPipeline(
  siteId: string,
  prompt: string,
  imageUrls: string[],
  siteName: string
) {
  try {
    console.log("[v0] Pipeline starting for site:", siteId)

    // Step 1: Analyze images
    console.log("[v0] Step 1: Analyzing images...")
    const imageAnalysis = await analyzeImages(siteId, imageUrls)
    console.log("[v0] Step 1 complete: Got image analysis")

    // Step 2: Build optimized prompt
    console.log("[v0] Step 2: Building prompt...")
    const craftedPrompt = await buildPrompt(siteId, prompt, imageAnalysis, imageUrls)
    console.log("[v0] Step 2 complete: Built prompt")

    // Step 3: Create v0 site
    console.log("[v0] Step 3: Creating v0 site...")
    const { chatId, projectId, versionId, previewUrl } = await createV0Site(
      siteId,
      craftedPrompt,
      imageUrls
    )
    console.log("[v0] Step 3 complete:", { chatId, projectId, versionId, previewUrl })

    // Step 4: Deploy
    console.log("[v0] Step 4: Deploying...")
    const { deploymentUrl, vercelProjectId } = await deploySite(
      siteId,
      projectId,
      chatId,
      versionId
    )
    console.log("[v0] Step 4 complete:", { deploymentUrl, vercelProjectId })

    // Step 5: Assign domain
    console.log("[v0] Step 5: Assigning domain...")
    const domain = await assignDomain(siteId, siteName, vercelProjectId)
    console.log("[v0] Step 5 complete:", { domain })

    // Step 6: Mark complete
    console.log("[v0] Step 6: Marking complete...")
    await markComplete(siteId, versionId, vercelProjectId, previewUrl, deploymentUrl, domain)
    console.log("[v0] Pipeline complete for site:", siteId)
  } catch (error) {
    console.error("[v0] Pipeline error:", error)
    await updateSiteStatus(siteId, "error", 0, {
      error: error instanceof Error ? error.message : "Generation failed",
    })
  }
}

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
        error: undefined,
      })
    } else {
      // Create new site (backward compatible)
      finalSiteId = nanoid(12)
      site = await createSite(finalSiteId, prompt, imageUrls, siteName)
    }

    // Fire and forget - start the pipeline without awaiting
    // This allows the API to return immediately while generation continues
    runGenerationPipeline(finalSiteId!, prompt, imageUrls, site!.name).catch((err) => {
      console.error("[v0] Background pipeline error:", err)
    })

    return NextResponse.json({ 
      siteId: finalSiteId, 
      site,
    })
  } catch (error) {
    console.error("[v0] Generate error:", error)
    return NextResponse.json(
      { error: "Failed to start site generation" },
      { status: 500 }
    )
  }
}
