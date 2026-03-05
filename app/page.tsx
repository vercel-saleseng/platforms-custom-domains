"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import useSWR, { mutate } from "swr"
import { Menu, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { AppSidebar } from "@/components/app-sidebar"
import { ImageUploader } from "@/components/image-uploader"
import { PromptInput } from "@/components/prompt-input"
import { GenerationStatus } from "@/components/generation-status"
import { useIsMobile } from "@/hooks/use-mobile"
import type { SiteRecord } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function Home() {
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [activeSiteId, setActiveSiteId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

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

  // Fetch active site details (polls every 3s when not complete)
  const { data: activeSiteData } = useSWR<{ site: SiteRecord }>(
    activeSiteId ? `/api/sites/${activeSiteId}` : null,
    fetcher,
    {
      refreshInterval: (data) => {
        const status = data?.site?.status
        if (status === "complete" || status === "error") return 0
        return 3000
      },
    }
  )
  const activeSite = activeSiteData?.site

  // Auto-select newly created site
  const prevSitesLength = useRef(sites.length)
  useEffect(() => {
    if (sites.length > prevSitesLength.current && activeSiteId) {
      // New site was added, already tracked via activeSiteId
    }
    prevSitesLength.current = sites.length
  }, [sites.length, activeSiteId])

  const handleGenerate = useCallback(
    async (prompt: string) => {
      if (images.length === 0) return
      setIsGenerating(true)

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            imageUrls: images,
            siteName:
              prompt.split(" ").slice(0, 4).join(" ").substring(0, 30) ||
              "My Site",
          }),
        })

        if (!response.ok) throw new Error("Generation failed")

        const data = await response.json()
        setActiveSiteId(data.siteId)
        setImages([])

        // Refresh sites list
        mutate("/api/sites")
      } catch (error) {
        console.error("Generation error:", error)
      } finally {
        setIsGenerating(false)
      }
    },
    [images]
  )

  const handleNewSite = useCallback(() => {
    setActiveSiteId(null)
    setImages([])
    if (isMobile) setSidebarOpen(false)
  }, [isMobile])

  const handleSelectSite = useCallback((id: string) => {
    setActiveSiteId(id)
    setImages([])
    if (isMobile) setSidebarOpen(false)
  }, [isMobile])

  const handleReset = useCallback(() => {
    setActiveSiteId(null)
    setImages([])
  }, [])

  const isShowingNewSiteForm = !activeSiteId

  // Sidebar content (shared between mobile Sheet and desktop)
  const sidebarContent = (
    <AppSidebar
      sites={sites}
      activeSiteId={activeSiteId}
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
        {/* Top bar - always visible on mobile, conditional on desktop */}
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
        <div className="flex flex-1 items-start justify-center overflow-y-auto">
          <div className="w-full max-w-2xl px-4 py-6 md:px-6 md:py-12">
            {isShowingNewSiteForm ? (
              <div className="flex flex-col gap-6 md:gap-8">
                {/* Hero */}
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <h1 className="text-xl font-bold tracking-tight text-foreground text-balance md:text-2xl">
                    Create a personalized site
                  </h1>
                  <p className="max-w-md text-sm text-muted-foreground text-pretty">
                    Upload your images and describe the site you want. Our AI
                    will analyze your photos and generate a custom website.
                  </p>
                </div>

                {/* Image Upload */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground">
                    Your images
                  </label>
                  <ImageUploader
                    images={images}
                    onImagesChange={setImages}
                    disabled={isGenerating}
                  />
                </div>

                {/* Prompt Input */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground">
                    Describe your site
                  </label>
                  <PromptInput
                    onSubmit={handleGenerate}
                    disabled={isGenerating}
                    hasImages={images.length > 0}
                  />
                </div>
              </div>
            ) : activeSite ? (
              <GenerationStatus site={activeSite} onReset={handleReset} />
            ) : (
              <div className="flex items-center justify-center py-20">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
