"use client"

import { use, useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import useSWR, { mutate } from "swr"
import { Monitor, Settings, Loader2, ArrowLeft, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SiteSetup } from "@/components/site-setup"
import { SitePreview } from "@/components/site-preview"
import { SiteSettings } from "@/components/site-settings"
import type { SiteRecord } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function SitePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("setup")

  // Fetch current site details with workflow status
  const { data: siteData, isLoading } = useSWR<{ site: SiteRecord; workflowStatus?: { status: string } }>(
    `/api/sites/${id}/status`,
    fetcher,
    {
      refreshInterval: (data) => {
        const status = data?.site?.status
        if (status === "complete" || status === "error" || status === "draft") return 0
        return 2000 // Poll every 2 seconds while generating
      },
    }
  )
  const site = siteData?.site

  // Auto-switch to preview tab when generation completes
  useEffect(() => {
    if (site?.status === "complete" && activeTab === "setup") {
      setActiveTab("preview")
    }
  }, [site?.status, activeTab])

  const handleSiteUpdated = useCallback(() => {
    mutate(`/api/sites/${id}/status`)
    mutate("/api/sites")
  }, [id])

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-up">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-glow-pulse" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Loading site...</p>
        </div>
      </div>
    )
  }

  if (!site) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 animate-fade-up">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 border border-border/50">
          <Globe className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-foreground">Site not found</p>
          <p className="mt-1 text-sm text-muted-foreground">This site may have been deleted or moved</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/")} className="mt-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Home
        </Button>
      </div>
    )
  }

  const isDraft = site.status === "draft"
  const isGenerating = !["draft", "complete", "error"].includes(site.status)
  const isSetupPhase = isDraft || isGenerating

  if (isSetupPhase) {
    return (
      <div className="flex-1 overflow-y-auto">
        <SiteSetup site={site} onSiteUpdated={handleSiteUpdated} />
      </div>
    )
  }

  // Post-setup: Show Preview and Settings tabs
  return (
    <Tabs
      value={activeTab === "setup" ? "preview" : activeTab}
      onValueChange={setActiveTab}
      className="flex flex-1 flex-col overflow-hidden"
    >
      <div className="border-b border-border/50 px-4 md:px-6">
        <TabsList className="h-14 w-full justify-start gap-1 rounded-none border-0 bg-transparent p-0">
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

      <div className="flex-1 overflow-y-auto bg-muted/20">
        <TabsContent value="preview" className="mt-0 h-full">
          <SitePreview site={site} />
        </TabsContent>
        <TabsContent value="settings" className="mt-0 h-full">
          <SiteSettings site={site} onSiteUpdated={handleSiteUpdated} />
        </TabsContent>
      </div>
    </Tabs>
  )
}
