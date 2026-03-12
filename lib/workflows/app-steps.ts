"use step"

import { v0 } from "../v0-client"
import { updateAppStatus, getApp, deleteApp } from "../apps-store"
import type { ChatDetail } from "v0-sdk"

// Step 1: Create v0 project and chat, wait for generation
export async function createV0App(
  appId: string,
  message: string
): Promise<{ chatId: string; projectId: string; versionId: string; previewUrl: string }> {
  await updateAppStatus(appId, "building", 1)

  // Create a new v0 project for this app
  const project = await v0.projects.create({
    name: `App ${appId.substring(0, 8)}`,
  })

  const projectId = project.id

  // Update with project ID
  await updateAppStatus(appId, "building", 2, {
    v0ProjectId: projectId,
  })

  // Create the chat within the project
  const chat = await v0.chats.create({
    message,
    projectId,
  }) as ChatDetail

  const chatId = chat.id
  let versionId = chat.latestVersion?.id || ""
  let previewUrl = chat.latestVersion?.demoUrl || ""

  // Update DB with v0 IDs
  await updateAppStatus(appId, "building", 2, {
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

// Step 2: Deploy app and get Vercel project ID
export async function deployApp(
  appId: string,
  projectId: string,
  chatId: string,
  versionId: string
): Promise<{ deploymentUrl: string; vercelProjectId: string }> {
  await updateAppStatus(appId, "building", 3)

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
    console.warn("[v0] App deployment failed, falling back to preview URL:", error)
  }

  return { deploymentUrl, vercelProjectId }
}

// Step 2b: Disable deployment protection
export async function disableDeploymentProtection(
  vercelProjectId: string
): Promise<void> {
  if (!vercelProjectId) return

  const vercelToken = process.env.VERCEL_API_TOKEN
  if (!vercelToken) return

  try {
    await fetch(
      `https://api.vercel.com/v9/projects/${vercelProjectId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ssoProtection: null,
        }),
      }
    )
  } catch (error) {
    console.warn("[v0] Failed to disable deployment protection:", error)
  }
}

// Step 3: Assign domain
export async function assignAppDomain(
  appId: string,
  subdomain: string,
  vercelProjectId: string
): Promise<{ fullDomain: string }> {
  await updateAppStatus(appId, "building", 4)

  const rootDomain = process.env.ROOT_DOMAIN || "vercel.zone"
  if (!vercelProjectId) {
    return { fullDomain: "" }
  }

  const fullDomain = `${subdomain}.${rootDomain}`

  try {
    const response = await fetch(
      `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: fullDomain }),
      }
    )

    if (!response.ok) {
      console.warn("[v0] Failed to assign domain:", await response.text())
      return { fullDomain: "" }
    }

    return { fullDomain }
  } catch (error) {
    console.warn("[v0] Failed to assign domain:", error)
    return { fullDomain: "" }
  }
}

// Step 4: Mark app complete
export async function markAppComplete(
  appId: string,
  versionId: string,
  vercelProjectId: string,
  previewUrl: string,
  deploymentUrl: string,
  fullDomain: string
): Promise<void> {
  const finalUrl = fullDomain ? `https://${fullDomain}` : deploymentUrl || previewUrl

  await updateAppStatus(appId, "deployed", 5, {
    v0VersionId: versionId,
    vercelProjectId: vercelProjectId || undefined,
    previewUrl: finalUrl,
  })
}

// ============ ITERATION STEPS ============

// Send a follow-up message to existing chat
export async function sendIterationMessage(
  appId: string,
  chatId: string,
  message: string
): Promise<{ versionId: string; previewUrl: string }> {
  await updateAppStatus(appId, "iterating", 2)

  // Send message to existing chat
  const response = await v0.chats.sendMessage({
    chatId,
    message,
  }) as ChatDetail

  let versionId = response.latestVersion?.id || ""
  let previewUrl = response.latestVersion?.demoUrl || ""

  // If already completed, return
  if (previewUrl && response.latestVersion?.status === "completed") {
    return { versionId, previewUrl }
  }

  // Poll for completion
  const maxAttempts = 60
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 5000))

    const updatedChat = await v0.chats.getById({ chatId }) as ChatDetail
    const version = updatedChat.latestVersion

    if (version?.status === "completed" && version.demoUrl) {
      return {
        versionId: version.id,
        previewUrl: version.demoUrl,
      }
    }

    if (version?.status === "failed") {
      throw new Error("v0 iteration failed")
    }
  }

  throw new Error("Iteration timed out after 5 minutes")
}

// Get app for workflow access
export async function getAppForWorkflow(appId: string) {
  return await getApp(appId)
}
