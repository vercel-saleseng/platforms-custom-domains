import { generateText } from "ai"
import { v0 } from "./v0-client"
import { updateSiteStatus } from "./sites-store"
import type { ChatDetail } from "v0-sdk"

// Step 1: Analyze images with AI vision via AI Gateway
async function analyzeImages(
  siteId: string,
  imageUrls: string[]
): Promise<string> {
  await updateSiteStatus(siteId, "analyzing", 1)

  console.log("[v0] analyzeImages: starting with", imageUrls.length, "images")
  console.log("[v0] analyzeImages: image URLs:", imageUrls)

  // Fetch images and pass as Uint8Array - this is most reliable for AI SDK
  const imageContent = await Promise.all(
    imageUrls.map(async (url) => {
      console.log("[v0] analyzeImages: fetching", url)
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      console.log("[v0] analyzeImages: fetched image, size:", uint8Array.length, "bytes")
      return {
        type: "image" as const,
        image: uint8Array,
      }
    })
  )

  const result = await generateText({
    model: "openai/gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          ...imageContent,
          {
            type: "text",
            text: `Analyze these images in detail. For each image describe:
1. The main subject and visual elements
2. Color palette (list dominant colors)
3. Overall mood and aesthetic style
4. Suggested website layout elements these images could work with
5. Content themes and messaging suggestions

Provide a comprehensive analysis that will help create a beautiful, personalized website using these images.`,
          },
        ],
      },
    ],
  })

  console.log(
    "[v0] analyzeImages: completed, analysis length:",
    result.text.length
  )
  return result.text
}

// Step 2: Build an optimized v0 prompt
async function buildPrompt(
  siteId: string,
  userPrompt: string,
  imageAnalysis: string,
  imageUrls: string[]
): Promise<string> {
  await updateSiteStatus(siteId, "prompting", 2)
  console.log("[v0] buildPrompt: starting")

  const result = await generateText({
    model: "openai/gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert web designer and v0 prompt engineer. Your job is to take a user's prompt, their uploaded images, and an analysis of those images, and craft the perfect prompt for v0 to generate an outstanding personalized website.

The prompt should:
- Be specific about layout, sections, and components
- Reference the image URLs directly so v0 can use them in <img> tags
- Include color palette guidance based on the image analysis
- Be comprehensive but concise (under 1000 words)
- Include instructions for responsive design
- Specify where each image should be placed in the design`,
      },
      {
        role: "user",
        content: `User's request: "${userPrompt}"

Image URLs to use in the site (these are publicly accessible):
${imageUrls.map((url, i) => `Image ${i + 1}: ${url}`).join("\n")}

Image Analysis:
${imageAnalysis}

Generate an optimized v0 prompt that will create a stunning, personalized website. The prompt should directly reference the image URLs above so v0 can embed them in <img> tags in the generated site.`,
      },
    ],
  })

  console.log(
    "[v0] buildPrompt: completed, prompt length:",
    result.text.length
  )
  return result.text
}

// Step 3: Create v0 chat and wait for generation
async function createAndWaitForV0Site(
  siteId: string,
  craftedPrompt: string,
  imageUrls: string[]
): Promise<{ chatId: string; projectId: string; versionId: string; previewUrl: string }> {
  await updateSiteStatus(siteId, "generating", 3)
  console.log("[v0] createV0Site: creating chat with v0 SDK")

  // Create the chat -- default responseMode is 'sync', which waits for completion
  const chat = await v0.chats.create({
    message: craftedPrompt,
    attachments: imageUrls.map((url) => ({ url })),
  }) as ChatDetail

  console.log("[v0] createV0Site: chat created:", {
    id: chat.id,
    projectId: chat.projectId,
    hasLatestVersion: !!chat.latestVersion,
    versionStatus: chat.latestVersion?.status,
    demoUrl: chat.latestVersion?.demoUrl,
  })

  const chatId = chat.id
  const projectId = chat.projectId || ""
  let versionId = chat.latestVersion?.id || ""
  let previewUrl = chat.latestVersion?.demoUrl || ""

  // If the sync response already has a completed version with demoUrl, we're done
  if (previewUrl && chat.latestVersion?.status === "completed") {
    console.log("[v0] createV0Site: chat already completed with demoUrl:", previewUrl)
    return { chatId, projectId, versionId, previewUrl }
  }

  // Otherwise poll for completion
  console.log("[v0] createV0Site: polling for completion...")
  await updateSiteStatus(siteId, "generating", 3, {
    v0ChatId: chatId,
    v0ProjectId: projectId,
  })

  const maxAttempts = 60
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 5000))

    const updatedChat = await v0.chats.getById({ chatId }) as ChatDetail
    const version = updatedChat.latestVersion

    console.log(
      "[v0] poll attempt",
      attempt + 1,
      "- status:",
      version?.status,
      "demoUrl:",
      version?.demoUrl
    )

    if (version?.status === "completed" && version.demoUrl) {
      versionId = version.id
      previewUrl = version.demoUrl
      console.log("[v0] createV0Site: generation completed!", previewUrl)
      return { chatId, projectId, versionId, previewUrl }
    }

    if (version?.status === "failed") {
      throw new Error("v0 generation failed")
    }
  }

  throw new Error("Generation timed out after 5 minutes")
}

// Step 4: Deploy the generated site and get Vercel project ID
async function deploySite(
  siteId: string,
  projectId: string,
  chatId: string,
  versionId: string
): Promise<{ deploymentUrl: string; vercelProjectId: string }> {
  await updateSiteStatus(siteId, "deploying", 4)
  console.log("[v0] deploySite: creating deployment", { projectId, chatId, versionId })

  if (!projectId || !chatId || !versionId) {
    console.log("[v0] deploySite: missing required IDs, skipping deployment")
    return { deploymentUrl: "", vercelProjectId: "" }
  }

  try {
    const deployment = await v0.deployments.create({
      projectId,
      chatId,
      versionId,
    })

    console.log("[v0] deploySite: deployment created:", {
      id: deployment.id,
      projectId: deployment.projectId,
      webUrl: deployment.webUrl,
      inspectorUrl: deployment.inspectorUrl,
    })

    // Fetch the project details to get the Vercel project ID
    let vercelProjectId = ""
    try {
      const projectDetails = await v0.projects.getById({ projectId })
      vercelProjectId = projectDetails.vercelProjectId || ""
      console.log("[v0] deploySite: fetched vercelProjectId:", vercelProjectId)
    } catch (err) {
      console.error("[v0] deploySite: failed to fetch project details:", err)
    }

    return { 
      deploymentUrl: deployment.webUrl || "", 
      vercelProjectId 
    }
  } catch (error) {
    console.error("[v0] deploySite: deployment failed:", error)
    return { deploymentUrl: "", vercelProjectId: "" }
  }
}

// Step 5: Assign a unique subdomain via Vercel Domains API
async function assignDomain(
  siteId: string,
  siteName: string,
  v0ProjectId: string
): Promise<string> {
  await updateSiteStatus(siteId, "assigning-domain", 5)

  const rootDomain = process.env.ROOT_DOMAIN
  if (!rootDomain || !v0ProjectId) {
    console.log("[v0] assignDomain: skipping - no ROOT_DOMAIN or projectId")
    return ""
  }

  const slug = siteName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  const subdomain = `${slug}-${siteId.slice(0, 8)}.${rootDomain}`

  console.log("[v0] assignDomain: assigning", subdomain, "to project", v0ProjectId)

  try {
    const response = await fetch(
      `https://api.vercel.com/v10/projects/${v0ProjectId}/domains`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: subdomain }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error("[v0] assignDomain: error:", errorData)
      return ""
    }

    console.log("[v0] assignDomain: success:", subdomain)
    return subdomain
  } catch (error) {
    console.error("[v0] assignDomain: failed:", error)
    return ""
  }
}

// Main workflow orchestrator
export async function siteGenerationWorkflow(
  siteId: string,
  prompt: string,
  imageUrls: string[],
  siteName: string
) {
  try {
    console.log("[v0] workflow: starting for site", siteId)

    // Step 1: Analyze images
    const imageAnalysis = await analyzeImages(siteId, imageUrls)

    // Step 2: Build optimized prompt
    const craftedPrompt = await buildPrompt(
      siteId,
      prompt,
      imageAnalysis,
      imageUrls
    )

    // Step 3: Create v0 chat and wait for generation
    const { chatId, projectId, versionId, previewUrl } =
      await createAndWaitForV0Site(siteId, craftedPrompt, imageUrls)

    await updateSiteStatus(siteId, "generating", 3, {
      v0ChatId: chatId,
      v0ProjectId: projectId,
    })

    // Step 4: Deploy and get Vercel project ID
    const { deploymentUrl, vercelProjectId } = await deploySite(siteId, projectId, chatId, versionId)

    // Step 5: Assign domain (using vercelProjectId now)
    const domain = await assignDomain(siteId, siteName, vercelProjectId)

    // Mark complete
    const finalUrl = domain
      ? `https://${domain}`
      : deploymentUrl || previewUrl
    await updateSiteStatus(siteId, "complete", 6, {
      v0VersionId: versionId,
      vercelProjectId: vercelProjectId || undefined,
      previewUrl: finalUrl,
      domain: domain || undefined,
    })

    console.log("[v0] workflow: completed for site", siteId, "url:", finalUrl)
    return { siteId, chatId, projectId, versionId, previewUrl, domain }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred"
    console.error("[v0] workflow: failed for site", siteId, ":", message)
    await updateSiteStatus(siteId, "error", -1, { error: message })
    throw error
  }
}
