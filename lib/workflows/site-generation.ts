"use workflow"

import { updateSiteStatus } from "../sites-store"
import {
  analyzeImages,
  buildPrompt,
  createV0Site,
  deploySite,
  assignDomain,
  markComplete,
} from "./steps"

export interface SiteGenerationInput {
  siteId: string
  prompt: string
  imageUrls: string[]
  siteName: string
}

export interface SiteGenerationOutput {
  siteId: string
  chatId: string
  projectId: string
  versionId: string
  previewUrl: string
  domain: string
}

export async function siteGenerationWorkflow(
  input: SiteGenerationInput
): Promise<SiteGenerationOutput> {
  const { siteId, prompt, imageUrls, siteName } = input

  try {
    // Step 1: Analyze images with AI vision
    const imageAnalysis = await analyzeImages(siteId, imageUrls)

    // Step 2: Build optimized v0 prompt
    const craftedPrompt = await buildPrompt(
      siteId,
      prompt,
      imageAnalysis,
      imageUrls
    )

    // Step 3: Create v0 site and wait for generation
    const { chatId, projectId, versionId, previewUrl } = await createV0Site(
      siteId,
      siteName,
      craftedPrompt,
      imageUrls
    )

    // Step 4: Deploy the site
    const { deploymentUrl, vercelProjectId } = await deploySite(
      siteId,
      projectId,
      chatId,
      versionId
    )

    // Step 5: Assign domain
    const domain = await assignDomain(siteId, siteName, vercelProjectId)

    // Step 6: Mark complete
    await markComplete(
      siteId,
      versionId,
      vercelProjectId,
      previewUrl,
      deploymentUrl,
      domain
    )

    return {
      siteId,
      chatId,
      projectId,
      versionId,
      previewUrl: domain ? `https://${domain}` : deploymentUrl || previewUrl,
      domain,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred"
    await updateSiteStatus(siteId, "error", -1, { error: message })
    throw error
  }
}
