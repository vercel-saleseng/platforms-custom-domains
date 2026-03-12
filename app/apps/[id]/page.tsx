"use client"

import { use, useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import useSWR, { mutate } from "swr"
import { MessageSquare, Monitor, Settings, Loader2, ArrowLeft, Layers, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AppChat } from "@/components/app-chat"
import { AppPreview } from "@/components/app-preview"
import { AppSettings } from "@/components/app-settings"
import { DeployButton } from "@/components/deploy-button"
import type { AppRecord } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function AppPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("chat")

  // Fetch current app details with status
  const { data: appData, isLoading } = useSWR<{ app: AppRecord & { stepLabel?: string } }>(
    `/api/apps/${id}/status`,
    fetcher,
    {
      refreshInterval: (data) => {
        const status = data?.app?.status
        // Poll while building or iterating
        if (status === "building" || status === "iterating") return 2000
        return 0 // Stop polling when stable
      },
    }
  )
  const app = appData?.app

  // Auto-switch to preview tab when first build completes
  useEffect(() => {
    if (app?.status === "deployed" && activeTab === "chat" && app.previewUrl) {
      // Only switch if we just completed a build (not on initial load)
      const wasBuilding = app.currentStep > 0 && app.currentStep < 5
      if (wasBuilding) {
        setActiveTab("preview")
      }
    }
  }, [app?.status, app?.previewUrl, app?.currentStep, activeTab])

  const handleAppUpdated = useCallback(() => {
    mutate(`/api/apps/${id}/status`)
    mutate("/api/apps")
  }, [id])

  if (isLoading) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-fade-up">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-glow-pulse" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Loading app...</p>
        </div>
      </div>
    )
  }

  if (!app) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-6 bg-background animate-fade-up">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 border border-border/50">
          <Layers className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-foreground">App not found</p>
          <p className="mt-1 text-sm text-muted-foreground">This app may have been deleted or moved</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Home
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/50 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold">{app.name || "Untitled App"}</h1>
              {app.status === "building" && (
                <p className="text-xs text-muted-foreground">{app.stepLabel || "Building..."}</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Show link to v0 chat when app has been built */}
          {app.v0ChatId && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => window.open(`https://v0.dev/chat/${app.v0ChatId}`, "_blank")}
            >
              Open in v0
            </Button>
          )}
          
          {/* Status indicator */}
          {!app.previewUrl && app.status !== "created" && app.status !== "building" && (
            <span className="text-sm text-destructive">App has not been built yet</span>
          )}
          
          {/* Deploy button when there are pending changes */}
          {app.hasPendingChanges && (
            <DeployButton appId={app.id} onDeployStarted={handleAppUpdated} />
          )}
        </div>
      </header>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="border-b border-border/50 px-4 md:px-6">
          <TabsList className="h-14 w-full justify-start gap-1 rounded-none border-0 bg-transparent p-0">
            <TabsTrigger
              value="chat"
              className="relative h-14 gap-2 rounded-none border-0 bg-transparent px-4 pb-4 pt-4 font-medium text-muted-foreground shadow-none transition-all data-[state=active]:text-foreground data-[state=active]:shadow-none after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full data-[state=active]:after:bg-primary hover:text-foreground"
            >
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="relative h-14 gap-2 rounded-none border-0 bg-transparent px-4 pb-4 pt-4 font-medium text-muted-foreground shadow-none transition-all data-[state=active]:text-foreground data-[state=active]:shadow-none after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full data-[state=active]:after:bg-primary hover:text-foreground"
            >
              <Monitor className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="relative h-14 gap-2 rounded-none border-0 bg-transparent px-4 pb-4 pt-4 font-medium text-muted-foreground shadow-none transition-all data-[state=active]:text-foreground data-[state=active]:shadow-none after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full data-[state=active]:after:bg-primary hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="chat" className="mt-0 h-full">
            <AppChat app={app} onAppUpdated={handleAppUpdated} />
          </TabsContent>
          <TabsContent value="preview" className="mt-0 h-full bg-muted/20">
            <AppPreview app={app} />
          </TabsContent>
          <TabsContent value="settings" className="mt-0 h-full overflow-y-auto bg-muted/20">
            <AppSettings app={app} onAppUpdated={handleAppUpdated} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
