"use client"

import { use, useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import useSWR, { mutate } from "swr"
import { Menu, Sparkles, ArrowLeft, Monitor, Settings, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteSetup } from "@/components/site-setup"
import { SitePreview } from "@/components/site-preview"
import { SiteSettings } from "@/components/site-settings"
import { useIsMobile } from "@/hooks/use-mobile"
import type { SiteRecord } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function SitePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("setup")

  // On desktop, default sidebar open
  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(true)
    }
  }, [isMobile])

  // Fetch all sites for sidebar
  const { data: sitesData } = useSWR<{ sites: SiteRecord[] }>(
    "/api/sites",
    fetcher,
    { refreshInterval: 5000 }
  )
  const sites = sitesData?.sites || []

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

  const handleNewSite = useCallback(async () => {
    try {
      const response = await fetch("/api/sites/new", { method: "POST" })
      const data = await response.json()
      if (data.siteId) {
        mutate("/api/sites")
        router.push(`/site/${data.siteId}`)
      }
    } catch (error) {
      console.error("Failed to create site:", error)
    }
    if (isMobile) setSidebarOpen(false)
  }, [router, isMobile])

  const handleSelectSite = useCallback(
    (siteId: string) => {
      if (isMobile) setSidebarOpen(false)
      // Small delay to let sheet close animation start before navigation
      setTimeout(() => {
        router.push(`/site/${siteId}`)
      }, 50)
    },
    [router, isMobile]
  )

  const handleSiteUpdated = useCallback(() => {
    mutate(`/api/sites/${id}/status`)
    mutate("/api/sites")
  }, [id])

  const sidebarContent = (
    <AppSidebar
      sites={sites}
      activeSiteId={id}
      onSelectSite={handleSelectSite}
      onNewSite={handleNewSite}
      onToggle={() => setSidebarOpen(false)}
      isMobile={isMobile}
    />
  )

  if (isLoading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background">
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
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-6 bg-background animate-fade-up">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 border border-border/50">
          <Sparkles className="h-8 w-8 text-muted-foreground" />
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
  const hasPreview = !!site.previewUrl || !!site.domain

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && sidebarOpen && sidebarContent}

      {/* Mobile Sidebar Sheet */}
      {isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-[280px] p-0 border-r border-sidebar-border">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            {sidebarContent}
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-smooth"
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold tracking-tight truncate max-w-[200px]">
                {site.name}
              </span>
              {site.status === "complete" && (
                <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  Live
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {isSetupPhase ? (
            // Setup phase: No tabs, just show the setup screen
            <div className="flex-1 overflow-y-auto">
              <SiteSetup site={site} onSiteUpdated={handleSiteUpdated} />
            </div>
          ) : (
            // Post-setup: Show Preview and Settings tabs
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
          )}
        </div>
      </main>
    </div>
  )
}
