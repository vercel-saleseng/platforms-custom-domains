"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import useSWR, { mutate } from "swr"
import { Menu, Sparkles, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { AppSidebar } from "@/components/app-sidebar"
import { useIsMobile } from "@/hooks/use-mobile"
import type { SiteRecord } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function Home() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // On desktop, default sidebar open
  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(true)
    }
  }, [isMobile])

  // Fetch all sites
  const { data: sitesData } = useSWR<{ sites: SiteRecord[] }>(
    "/api/sites",
    fetcher,
    { refreshInterval: 5000 }
  )
  const sites = sitesData?.sites || []

  const handleNewSite = useCallback(async () => {
    setIsCreating(true)
    try {
      const response = await fetch("/api/sites/new", { method: "POST" })
      const data = await response.json()
      if (data.siteId) {
        mutate("/api/sites")
        router.push(`/site/${data.siteId}`)
      }
    } catch (error) {
      console.error("Failed to create site:", error)
    } finally {
      setIsCreating(false)
    }
    if (isMobile) setSidebarOpen(false)
  }, [router, isMobile])

  const handleSelectSite = useCallback(
    (id: string) => {
      if (isMobile) setSidebarOpen(false)
      // Small delay to let sheet close animation start before navigation
      setTimeout(() => {
        router.push(`/site/${id}`)
      }, 50)
    },
    [router, isMobile]
  )

  const sidebarContent = (
    <AppSidebar
      sites={sites}
      activeSiteId={null}
      onSelectSite={handleSelectSite}
      onNewSite={handleNewSite}
      onToggle={() => setSidebarOpen(false)}
      isMobile={isMobile}
    />
  )

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
        <div className="flex items-center border-b border-border px-3 py-2 md:px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-10 w-10 text-muted-foreground hover:text-foreground md:h-8 md:w-8"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            <Menu className="h-5 w-5 md:h-4 md:w-4" />
          </Button>
          <div className="ml-2 flex items-center gap-2 md:hidden">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Site Generator</span>
          </div>
        </div>

        {/* Content area */}
        <div className="flex flex-1 items-center justify-center overflow-y-auto">
          <div className="w-full max-w-md px-4 py-6 md:px-6 md:py-12">
            <div className="flex flex-col items-center gap-6 text-center">
              {/* Hero */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance md:text-3xl">
                  AI Site Generator
                </h1>
                <p className="text-base text-muted-foreground text-pretty">
                  Upload your images and describe your vision. Our AI creates a
                  custom, deployable website with a unique domain.
                </p>
              </div>

              {/* CTA */}
              <Button
                size="lg"
                onClick={handleNewSite}
                disabled={isCreating}
                className="h-12 gap-2 px-6"
              >
                {isCreating ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    Create New Site
                  </>
                )}
              </Button>

              {/* Recent sites */}
              {sites.length > 0 && (
                <div className="mt-4 w-full">
                  <p className="mb-3 text-sm font-medium text-muted-foreground">
                    Recent sites
                  </p>
                  <div className="flex flex-col gap-2">
                    {sites.slice(0, 3).map((site) => (
                      <button
                        key={site.id}
                        type="button"
                        onClick={() => router.push(`/site/${site.id}`)}
                        className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent active:bg-accent/80"
                      >
                        {site.imageUrls[0] ? (
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border">
                            <img
                              src={site.imageUrls[0]}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                            <Sparkles className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-sm font-medium text-foreground truncate">
                            {site.name}
                          </span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {site.status === "draft" ? "Not started" : site.status}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
