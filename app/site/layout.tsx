"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import useSWR, { mutate } from "swr"
import { Menu, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { AppSidebar } from "@/components/app-sidebar"
import type { SiteRecord } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const MOBILE_BREAKPOINT = 768

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState<boolean | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true) // Default open for desktop

  // Extract site ID from pathname
  const siteId = pathname?.split("/site/")[1]?.split("/")[0] || null

  // Detect mobile and set sidebar state
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT
      setIsMobile(mobile)
      if (mobile) setSidebarOpen(false) // Close sidebar on mobile
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch all sites for sidebar
  const { data: sitesData } = useSWR<{ sites: SiteRecord[] }>(
    "/api/sites",
    fetcher,
    { refreshInterval: 5000 }
  )
  const sites = sitesData?.sites || []

  // Get current site name for header
  const currentSite = sites.find(s => s.id === siteId)

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
    (id: string) => {
      if (isMobile) setSidebarOpen(false)
      setTimeout(() => {
        router.push(`/site/${id}`)
      }, 50)
    },
    [router, isMobile]
  )

  const sidebarContent = (
    <AppSidebar
      sites={sites}
      activeSiteId={siteId}
      onSelectSite={handleSelectSite}
      onNewSite={handleNewSite}
    />
  )

  // Don't render until we know if we're on mobile or not
  if (isMobile === null) {
    return (
      <div className="flex h-[100dvh] overflow-hidden bg-background">
        <div className="flex flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    )
  }

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
                <Layers className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold tracking-tight truncate max-w-[200px]">
                {currentSite?.name || "Loading..."}
              </span>
              {currentSite?.status === "complete" && (
                <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  Live
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  )
}
