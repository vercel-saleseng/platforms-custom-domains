"use workflow"

import {
  deployApp,
  disableDeploymentProtection,
  getAppForWorkflow,
  updateAppStatusStep,
  clearPendingChangesStep,
  markAppError,
} from "./app-steps"

export interface AppIterationDeployInput {
  appId: string
}

export interface AppIterationDeployOutput {
  appId: string
  deploymentUrl: string
  previewUrl: string
}

// Workflow to deploy pending changes from iteration messages
export async function appIterationDeployWorkflow(
  input: AppIterationDeployInput
): Promise<AppIterationDeployOutput> {
  const { appId } = input

  try {
    // Get the app to access its v0 IDs
    const app = await getAppForWorkflow(appId)
    if (!app) {
      throw new Error("App not found")
    }

    if (!app.v0ProjectId || !app.v0ChatId || !app.v0VersionId) {
      throw new Error("App has not been built yet")
    }

    await updateAppStatusStep(appId, "building", 3)

    // Deploy the latest version
    const { deploymentUrl, vercelProjectId } = await deployApp(
      appId,
      app.v0ProjectId,
      app.v0ChatId,
      app.v0VersionId
    )

    // Disable deployment protection
    await disableDeploymentProtection(vercelProjectId)

    // Clear pending changes
    await clearPendingChangesStep(appId)

    // Update to deployed status
    const finalUrl = app.previewUrl || deploymentUrl
    await updateAppStatusStep(appId, "deployed", 5, {
      previewUrl: finalUrl,
      vercelProjectId: vercelProjectId || app.vercelProjectId,
    })

    return {
      appId,
      deploymentUrl,
      previewUrl: finalUrl,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred"
    await markAppError(appId, errorMessage)
    throw error
  }
}
