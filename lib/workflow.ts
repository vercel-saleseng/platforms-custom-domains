import { generateText } from "ai"
import { v0 } from "./v0-client"
import { updateSiteStatus } from "./sites-store"

// Step 1: Analyze images with AI vision via AI Gateway
export async function analyzeImages(
  siteId: string,
  imageUrls: string[]
): Promise<string> {
  "use step"

  updateSiteStatus(siteId, "analyzing", 1)

  const imageContent = imageUrls.map((url) => ({
    type: "image" as const,
    image: new URL(url),
  }))

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
  "use step"

  updateSiteStatus(siteId, "prompting", 2)

  const result = await generateText({
    model: "openai/gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert web designer and v0 prompt engineer. Your job is to take a user's prompt, their uploaded images, and an analysis of those images, and craft the perfect prompt for v0 to generate an outstanding personalized website.

The prompt should:
- Be specific about layout, sections, and components
- Reference the image URLs directly so v0 can use them
- Include color palette guidance based on the image analysis
- Be comprehensive but concise (under 1000 words)
- Include instructions for responsive design
- Specify where each image should be placed in the design`,
      },
      {
        role: "user",
        content: `User's request: "${userPrompt}"

Image URLs to use in the site:
${imageUrls.map((url, i) => `Image ${i + 1}: ${url}`).join("\n")}

Image Analysis:
${imageAnalysis}

Generate an optimized v0 prompt that will create a stunning, personalized website. The prompt should directly reference the image URLs above so v0 can embed them in the generated site.`,
      },
    ],
  })

  return result.text
}

// Step 3: Create v0 project and chat
export async function createV0Site(
  siteId: string,
  craftedPrompt: string,
  imageUrls: string[]
): Promise<{ chatId: string; projectId: string }> {
  "use step"

  updateSiteStatus(siteId, "generating", 3)

  const chat = await v0.chats.create({
    message: craftedPrompt,
    attachments: imageUrls.map((url) => ({ url })),
  })

  // chat.create returns ChatDetail | ChatsCreateStreamResponse
  // Since we're not streaming, we get ChatDetail which has .id
  const chatData = chat as { id: string; projectId?: string; latestVersion?: { id: string; demoUrl?: string } }
  const chatId = chatData.id
  const projectId = chatData.projectId

  // If no project, try to get it from the chat
  let resolvedProjectId = projectId || ""
  if (!resolvedProjectId && chatId) {
    try {
      const project = await v0.projects.getByChatId({ chatId })
      resolvedProjectId = (project as Record<string, unknown>).id as string || ""
    } catch {
      // Project might not be created yet
    }
  }

  return { chatId, projectId: resolvedProjectId }
}

// Step 4: Poll for v0 generation completion
export async function waitForGeneration(
  siteId: string,
  chatId: string
): Promise<{ versionId: string; previewUrl: string }> {
  "use step"

  const maxAttempts = 60
  let attempts = 0

  while (attempts < maxAttempts) {
    const chat = await v0.chats.getById({ chatId })
    const chatData = chat as Record<string, unknown>

    const latestVersion = chatData.latestVersion as
      | Record<string, unknown>
      | undefined

    if (latestVersion) {
      const demoUrl = (latestVersion.demoUrl as string) || ""
      const versionId = (latestVersion.id as string) || ""

      if (demoUrl) {
        updateSiteStatus(siteId, "deploying", 4, {
          v0VersionId: versionId,
          previewUrl: demoUrl,
        })
        return { versionId, previewUrl: demoUrl }
      }
    }

    attempts++
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }

  throw new Error("Generation timed out after 5 minutes")
}

// Step 5: Assign a unique subdomain via Vercel Domains API
export async function assignDomain(
  siteId: string,
  siteName: string,
  v0ProjectId: string
): Promise<string> {
  "use step"

  updateSiteStatus(siteId, "assigning-domain", 5)

  const rootDomain = process.env.ROOT_DOMAIN
  if (!rootDomain || !v0ProjectId) {
    // Skip domain assignment if not configured
    return ""
  }

  const slug = siteName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  const subdomain = `${slug}-${siteId.slice(0, 8)}.${rootDomain}`

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
      console.error("Domain assignment error:", errorData)
      return ""
    }

    return subdomain
  } catch (error) {
    console.error("Domain assignment failed:", error)
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
  "use workflow"

  try {
    // Step 1: Analyze images
    const imageAnalysis = await analyzeImages(siteId, imageUrls)

    // Step 2: Build optimized prompt
    const craftedPrompt = await buildPrompt(
      siteId,
      prompt,
      imageAnalysis,
      imageUrls
    )

    // Step 3: Create v0 site
    const { chatId, projectId } = await createV0Site(
      siteId,
      craftedPrompt,
      imageUrls
    )

    updateSiteStatus(siteId, "generating", 3, {
      v0ChatId: chatId,
      v0ProjectId: projectId,
      imageAnalysis,
      craftedPrompt,
    })

    // Step 4: Wait for generation to complete
    const { versionId, previewUrl } = await waitForGeneration(siteId, chatId)

    // Step 5: Assign domain
    const domain = await assignDomain(siteId, siteName, projectId)

    // Final: mark complete
    updateSiteStatus(siteId, "complete", 6, {
      v0VersionId: versionId,
      previewUrl,
      deploymentUrl: previewUrl,
      domain: domain || undefined,
    })

    return {
      siteId,
      chatId,
      projectId,
      versionId,
      previewUrl,
      domain,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred"
    updateSiteStatus(siteId, "error", -1, { error: message })
    throw error
  }
}
