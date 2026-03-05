"use client"

import { useState, useCallback } from "react"
import { Sparkles, Loader2 } from "lucide-react"
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

  const isDraft = site.status === "draft"
  const isProcessing = !["draft", "complete", "error"].includes(site.status)

  const handleGenerate = useCallback(
    async (prompt: string) => {
      if (images.length === 0) return
      setIsGenerating(true)

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            siteId: site.id,
            prompt,
            imageUrls: images,
            siteName: prompt.split(" ").slice(0, 4).join(" ").substring(0, 30) || site.name,
          }),
        })

        if (!response.ok) throw new Error("Generation failed")
        onSiteUpdated()
      } catch (error) {
        console.error("Generation error:", error)
      } finally {
        setIsGenerating(false)
      }
    },
    [images, site.id, site.name, onSiteUpdated]
  )

  // Show generation progress if not draft
  if (!isDraft) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-6 md:py-12">
        <GenerationStatus site={site} onReset={() => {}} hideResetButton />
      </div>
    )
  }

  // Draft state - show setup form
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-6 md:py-12">
      <div className="flex flex-col gap-6 md:gap-8">
        {/* Hero */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground text-balance md:text-2xl">
            Configure your site
          </h1>
          <p className="max-w-md text-sm text-muted-foreground text-pretty">
            Upload your images and describe the site you want. Our AI will
            analyze your photos and generate a custom website.
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
            initialValue={site.prompt}
          />
        </div>
      </div>
    </div>
  )
}
