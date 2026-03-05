"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import useSWR, { mutate } from "swr"
import { PanelLeft, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppSidebar } from "@/components/app-sidebar"
import { ImageUploader } from "@/components/image-uploader"
import { PromptInput } from "@/components/prompt-input"
import { GenerationStatus } from "@/components/generation-status"
import type { SiteRecord } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [images, setImages] = useState<string[]>([])
  const [activeSiteId, setActiveSiteId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

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
  }, [])

  const handleSelectSite = useCallback((id: string) => {
    setActiveSiteId(id)
    setImages([])
  }, [])

  const handleReset = useCallback(() => {
    setActiveSiteId(null)
    setImages([])
  }, [])

  const isShowingNewSiteForm = !activeSiteId

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      {sidebarOpen && (
        <AppSidebar
          sites={sites}
          activeSiteId={activeSiteId}
          onSelectSite={handleSelectSite}
          onNewSite={handleNewSite}
          onToggle={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        {!sidebarOpen && (
          <div className="flex items-center border-b border-border px-4 py-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Open sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Content area */}
        <div className="flex flex-1 items-start justify-center overflow-y-auto">
          <div className="w-full max-w-2xl px-6 py-12">
            {isShowingNewSiteForm ? (
              <div className="flex flex-col gap-8">
                {/* Hero */}
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
                    Create a personalized site
                  </h1>
                  <p className="max-w-md text-sm text-muted-foreground text-pretty">
                    Upload your images and describe the site you want. Our AI
                    will analyze your photos and generate a custom website
                    tailored to your content.
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
