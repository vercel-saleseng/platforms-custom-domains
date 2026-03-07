import { NextResponse } from "next/server"
import { getSiteById, updateSite } from "@/lib/sites-store"
import { v0 } from "@/lib/v0-client"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const site = await getSiteById(id)

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 })
    }

    // Check we have the required v0 IDs
    if (!site.v0ProjectId || !site.v0ChatId || !site.v0VersionId) {
      return NextResponse.json(
        { error: "Site is missing v0 project information" },
        { status: 400 }
      )
    }

    // Attempt to deploy
    const deployment = await v0.deployments.create({
      projectId: site.v0ProjectId,
      chatId: site.v0ChatId,
      versionId: site.v0VersionId,
    })

    const deploymentUrl = deployment.webUrl || ""

    // Fetch project to get Vercel project ID
    let vercelProjectId = ""
    try {
      const projectDetails = await v0.projects.getById({ projectId: site.v0ProjectId })
      vercelProjectId = projectDetails.vercelProjectId || ""
    } catch {
      // Ignore error
    }

    // Update site with deployment info
    await updateSite(id, {
      vercelProjectId: vercelProjectId || undefined,
      previewUrl: deploymentUrl || site.previewUrl,
    })

    return NextResponse.json({
      success: true,
      deploymentUrl,
      vercelProjectId,
    })
  } catch (error) {
    console.error("Deploy error:", error)
    const message = error instanceof Error ? error.message : "Deployment failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
