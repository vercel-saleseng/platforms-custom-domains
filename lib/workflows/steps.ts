"use step"

import { generateText } from "ai"
import { v0 } from "../v0-client"
import { updateSiteStatus } from "../sites-store"
import type { ChatDetail } from "v0-sdk"

// Step 1: Analyze images with AI vision
export async function analyzeImages(
  siteId: string,
  imageUrls: string[]
): Promise<string> {
  await updateSiteStatus(siteId, "analyzing", 1)

  // Fetch images and pass as Uint8Array
  const imageContent = await Promise.all(
    imageUrls.map(async (url) => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      return {
        type: "image" as const,
        image: new Uint8Array(arrayBuffer),
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

  return result.text
}

// Step 2: Build an optimized v0 prompt
export async function buildPrompt(
  siteId: string,
  userPrompt: string,
  imageAnalysis: string,
  imageUrls: string[]
): Promise<string> {
  await updateSiteStatus(siteId, "prompting", 2)

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

  return result.text
}

// Step 3: Create v0 chat and wait for generation
export async function createV0Site(
  siteId: string,
  craftedPrompt: string,
  imageUrls: string[]
): Promise<{ chatId: string; projectId: string; versionId: string; previewUrl: string }> {
  await updateSiteStatus(siteId, "generating", 3)

  // Create the chat
  const chat = await v0.chats.create({
    message: craftedPrompt,
    attachments: imageUrls.map((url) => ({ url })),
  }) as ChatDetail

  const chatId = chat.id
  const projectId = chat.projectId || ""
  let versionId = chat.latestVersion?.id || ""
  let previewUrl = chat.latestVersion?.demoUrl || ""

  // Update DB with v0 IDs
  await updateSiteStatus(siteId, "generating", 3, {
    v0ChatId: chatId,
    v0ProjectId: projectId,
  })

  // If already completed, return
  if (previewUrl && chat.latestVersion?.status === "completed") {
    return { chatId, projectId, versionId, previewUrl }
  }

  // Poll for completion
  const maxAttempts = 60
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 5000))

    const updatedChat = await v0.chats.getById({ chatId }) as ChatDetail
    const version = updatedChat.latestVersion

    if (version?.status === "completed" && version.demoUrl) {
      return {
        chatId,
        projectId,
        versionId: version.id,
        previewUrl: version.demoUrl,
      }
    }

    if (version?.status === "failed") {
      throw new Error("v0 generation failed")
    }
  }

  throw new Error("Generation timed out after 5 minutes")
}

// Step 4: Deploy site and get Vercel project ID
export async function deploySite(
  siteId: string,
  projectId: string,
  chatId: string,
  versionId: string
): Promise<{ deploymentUrl: string; vercelProjectId: string }> {
  await updateSiteStatus(siteId, "deploying", 4)

  if (!projectId || !chatId || !versionId) {
    return { deploymentUrl: "", vercelProjectId: "" }
  }

  let deploymentUrl = ""
  let vercelProjectId = ""

  try {
    const deployment = await v0.deployments.create({
      projectId,
      chatId,
      versionId,
    })
    deploymentUrl = deployment.webUrl || ""

    // Fetch project to get Vercel project ID
    try {
      const projectDetails = await v0.projects.getById({ projectId })
      vercelProjectId = projectDetails.vercelProjectId || ""
    } catch {
      // Ignore error, vercelProjectId will be empty
    }
  } catch (error) {
    // Deployment failed (e.g., "Project has no Vercel project ID")
    // Fall back gracefully - the workflow will use previewUrl instead
    console.warn("Deployment failed, falling back to preview URL:", error)
  }

  return { deploymentUrl, vercelProjectId }
}

// Step 5: Assign domain
export async function assignDomain(
  siteId: string,
  siteName: string,
  vercelProjectId: string
): Promise<string> {
  await updateSiteStatus(siteId, "assigning-domain", 5)

  const rootDomain = process.env.ROOT_DOMAIN
  if (!rootDomain || !vercelProjectId) {
    return ""
  }

  const slug = siteName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  const subdomain = `${slug}-${siteId.slice(0, 8)}.${rootDomain}`

  try {
    const response = await fetch(
      `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`,
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
      return ""
    }

    return subdomain
  } catch {
    return ""
  }
}

// Step 6: Mark site complete
export async function markComplete(
  siteId: string,
  versionId: string,
  vercelProjectId: string,
  previewUrl: string,
  deploymentUrl: string,
  domain: string
): Promise<void> {
  const finalUrl = domain ? `https://${domain}` : deploymentUrl || previewUrl

  await updateSiteStatus(siteId, "complete", 6, {
    v0VersionId: versionId,
    vercelProjectId: vercelProjectId || undefined,
    previewUrl: finalUrl,
    domain: domain || undefined,
  })
}
