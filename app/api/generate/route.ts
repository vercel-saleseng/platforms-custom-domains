import { NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { createSite, getSite, updateSite, updateSiteStatus } from "@/lib/sites-store"
import type { GenerateRequest } from "@/lib/types"
import { siteGenerationWorkflow } from "@/lib/workflow"

export const maxDuration = 300

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

    // Start the generation pipeline in the background (fire-and-forget)
    siteGenerationWorkflow(finalSiteId!, prompt, imageUrls, site!.name).catch(
      async (error) => {
        console.error(`Workflow failed for site ${finalSiteId}:`, error)
        await updateSiteStatus(finalSiteId!, "error", -1, {
          error: error instanceof Error ? error.message : "Workflow failed",
        })
      }
    )

    return NextResponse.json({ siteId: finalSiteId, site })
  } catch (error) {
    console.error("Generate error:", error)
    return NextResponse.json(
      { error: "Failed to start site generation" },
      { status: 500 }
    )
  }
}
