"use client"

import { use, useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import useSWR, { mutate } from "swr"
import { Menu, Sparkles, ArrowLeft } from "lucide-react"
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
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!site) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground">Site not found</p>
        <Button variant="outline" onClick={() => router.push("/")}>
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
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            {sidebarContent}
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-border px-3 py-2 md:px-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-10 w-10 text-muted-foreground hover:text-foreground md:h-8 md:w-8"
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              <Menu className="h-5 w-5 md:h-4 md:w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold truncate max-w-[200px]">
                {site.name}
              </span>
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
              <div className="border-b border-border px-4">
                <TabsList className="h-12 w-full justify-start gap-4 rounded-none border-0 bg-transparent p-0">
                  <TabsTrigger
                    value="preview"
                    className="relative h-12 rounded-none border-0 bg-transparent px-0 pb-3 pt-3 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:text-foreground data-[state=active]:shadow-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:after:bg-primary"
                  >
                    Preview
                  </TabsTrigger>
                  <TabsTrigger
                    value="settings"
                    className="relative h-12 rounded-none border-0 bg-transparent px-0 pb-3 pt-3 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:text-foreground data-[state=active]:shadow-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:after:bg-primary"
                  >
                    Settings
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto">
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
