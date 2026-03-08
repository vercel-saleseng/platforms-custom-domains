"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import useSWR, { mutate } from "swr"
import { Menu, Layers, Plus, ArrowRight, Globe, Loader2 } from "lucide-react"
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
          <SheetContent side="left" className="w-[280px] p-0 border-r border-sidebar-border">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            {sidebarContent}
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center border-b border-border/50 px-4 py-3 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-smooth"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="ml-3 flex items-center gap-2.5 md:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Atlas</span>
          </div>
        </div>

        {/* Content area */}
        <div className="relative flex flex-1 items-center justify-center overflow-y-auto">
          {/* Background gradient orb */}
          <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl animate-glow-pulse" />
          
          <div className="relative z-10 w-full max-w-lg px-6 py-8 md:px-8 md:py-16">
            <div className="flex flex-col items-center gap-8 text-center animate-fade-up">
              {/* Hero Icon */}
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl bg-primary/20 blur-xl animate-glow-pulse" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-lg">
                  <Layers className="h-10 w-10 text-primary" />
                </div>
              </div>
              
              {/* Hero Text */}
              <div className="flex flex-col gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-foreground text-balance md:text-4xl">
                  Atlas
                </h1>
                <p className="text-base text-muted-foreground text-pretty leading-relaxed max-w-md">
                  Upload your images and describe your vision. Create a
                  custom, deployable website with a unique domain.
                </p>
              </div>

              {/* CTA Button */}
              <Button
                size="lg"
                onClick={handleNewSite}
                disabled={isCreating}
                className="h-13 gap-2.5 px-8 text-base font-medium gradient-primary hover:opacity-90 glow-primary transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    Create New Site
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>

              {/* Recent sites */}
              {sites.length > 0 && (
                <div className="mt-6 w-full animate-fade-up" style={{ animationDelay: '0.1s' }}>
                  <p className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Recent Projects
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {sites.slice(0, 3).map((site, index) => (
                      <button
                        key={site.id}
                        type="button"
                        onClick={() => router.push(`/site/${site.id}`)}
                        className={`group flex items-center gap-4 rounded-xl border border-border/50 bg-card/50 p-4 text-left transition-all duration-200 hover:bg-card hover:border-border hover:shadow-lg hover:shadow-primary/5 active:scale-[0.99] stagger-${index + 1}`}
                        style={{ animationDelay: `${0.15 + index * 0.05}s` }}
                      >
                        {site.imageUrls[0] ? (
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border/50 shadow-sm">
                            <img
                              src={site.imageUrls[0]}
                              alt=""
                              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                            />
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted/50 border border-border/50">
                            <Globe className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <span className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {site.name}
                          </span>
                          <span className="text-xs text-muted-foreground capitalize flex items-center gap-1.5">
                            {site.status === "complete" && (
                              <span className="h-1.5 w-1.5 rounded-full bg-success" />
                            )}
                            {site.status === "draft" ? "Not started" : site.status}
                          </span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/50 transition-all duration-200 group-hover:text-primary group-hover:translate-x-0.5" />
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
