"use workflow"

import {
  createV0App,
  deployApp,
  disableDeploymentProtection,
  assignAppDomain,
  markAppComplete,
  markAppError,
  getAppForWorkflow,
} from "./app-steps"

export interface AppGenerationInput {
  appId: string
  message: string
}

export interface AppGenerationOutput {
  appId: string
  chatId: string
  projectId: string
  versionId: string
  previewUrl: string
  domain: string
}

export async function appGenerationWorkflow(
  input: AppGenerationInput
): Promise<AppGenerationOutput> {
  const { appId, message } = input

  try {
    // Get the app to access its subdomain
    const app = await getAppForWorkflow(appId)
    if (!app) {
      throw new Error("App not found")
    }

    // Step 1: Create v0 project and chat, wait for generation
    const { chatId, projectId, versionId, previewUrl } = await createV0App(
      appId,
      message
    )

    // Step 2: Deploy the app
    const { deploymentUrl, vercelProjectId } = await deployApp(
      appId,
      projectId,
      chatId,
      versionId
    )

    // Step 2b: Disable deployment protection so apps are publicly accessible
    await disableDeploymentProtection(vercelProjectId)

    // Step 3: Assign domain using the app's subdomain
    const { fullDomain } = await assignAppDomain(appId, app.subdomain, vercelProjectId)

    // Step 4: Mark complete
    await markAppComplete(
      appId,
      versionId,
      vercelProjectId,
      previewUrl,
      deploymentUrl,
      fullDomain
    )

    return {
      appId,
      chatId,
      projectId,
      versionId,
      previewUrl: fullDomain ? `https://${fullDomain}` : deploymentUrl || previewUrl,
      domain: fullDomain,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred"
    // Use a step function for the error update
    await markAppError(appId, errorMessage)
    throw error
  }
}
