"use client"

import { useState, useCallback } from "react"
import { Layers, Images, MessageSquare, CheckCircle2 } from "lucide-react"
import { ImageUploader } from "@/components/image-uploader"
import { PromptInput } from "@/components/prompt-input"
import { GenerationStatus } from "@/components/generation-status"
import type { SiteRecord } from "@/lib/types"

interface SiteSetupProps {
  site: SiteRecord
  onSiteUpdated: () => void
}

export function SiteSetup({ site, onSiteUpdated }: SiteSetupProps) {
  const [images, setImages] = useState<string[]>(site.imageUrls || [])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

  const isDraft = site.status === "draft"
  const isError = site.status === "error"

  const startGeneration = useCallback(
    async (prompt: string, imageUrls: string[], siteName: string) => {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: site.id,
          prompt,
          imageUrls,
          siteName,
        }),
      })

      if (!response.ok) throw new Error("Generation failed")
      onSiteUpdated()
    },
    [site.id, onSiteUpdated]
  )

  const handleGenerate = useCallback(
    async (prompt: string) => {
      if (images.length === 0) return
      setIsGenerating(true)

      try {
        const siteName = prompt.split(" ").slice(0, 4).join(" ").substring(0, 30) || site.name
        await startGeneration(prompt, images, siteName)
      } catch (error) {
        console.error("Generation error:", error)
      } finally {
        setIsGenerating(false)
      }
    },
    [images, site.name, startGeneration]
  )

  const handleRetry = useCallback(async () => {
    // Use existing site data to retry
    if (!site.prompt || site.imageUrls.length === 0) return
    setIsRetrying(true)

    try {
      await startGeneration(site.prompt, site.imageUrls, site.name)
    } catch (error) {
      console.error("Retry error:", error)
    } finally {
      setIsRetrying(false)
    }
  }, [site.prompt, site.imageUrls, site.name, startGeneration])

  // Show generation progress if not draft
  if (!isDraft) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-8 md:px-8 md:py-16">
        <GenerationStatus 
          site={site} 
          onReset={() => {}} 
          onRetry={isError ? handleRetry : undefined}
          isRetrying={isRetrying}
          hideResetButton 
        />
      </div>
    )
  }

  // Draft state - show setup form
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8 md:px-8 md:py-16">
      <div className="flex flex-col gap-10">
        {/* Hero */}
        <div className="flex flex-col items-center gap-4 text-center animate-fade-up">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl animate-glow-pulse" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-lg">
              <Layers className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance md:text-3xl">
              Configure your site
            </h1>
            <p className="max-w-md text-base text-muted-foreground text-pretty leading-relaxed">
              Upload your images and describe the site you want. Our AI will
              analyze your photos and generate a custom website.
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-8">
          {/* Step 1: Image Upload */}
          <div className="flex flex-col gap-4 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                images.length > 0 
                  ? "border-success bg-success/10" 
                  : "border-primary/50 bg-primary/5"
              }`}>
                {images.length > 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <Images className="h-4 w-4 text-primary" />
                )}
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground">
                  Upload your images
                </label>
                <p className="text-xs text-muted-foreground">
                  Add photos that represent your brand or content
                </p>
              </div>
            </div>
            <div className="ml-11">
              <ImageUploader
                images={images}
                onImagesChange={setImages}
                disabled={isGenerating}
              />
            </div>
          </div>

          {/* Step 2: Prompt Input */}
          <div className="flex flex-col gap-4 animate-fade-up" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center gap-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                images.length === 0 
                  ? "border-border/50 bg-muted/30 opacity-50" 
                  : "border-primary/50 bg-primary/5"
              }`}>
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground">
                  Describe your site
                </label>
                <p className="text-xs text-muted-foreground">
                  Tell us what kind of website you want to create
                </p>
              </div>
            </div>
            <div className="ml-11">
              <PromptInput
                onSubmit={handleGenerate}
                disabled={isGenerating}
                hasImages={images.length > 0}
                initialValue={site.prompt}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
