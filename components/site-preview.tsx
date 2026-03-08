"use client"

import { ExternalLink, Loader2, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { SiteRecord } from "@/lib/types"

interface SitePreviewProps {
  site: SiteRecord
}

export function SitePreview({ site }: SitePreviewProps) {
  // Priority: verified custom domain > subdomain > legacy domain > preview URL
  // Only use custom domain if it's verified
  const getSiteUrl = () => {
    if (site.customDomain && site.customDomainVerified) {
      return `https://${site.customDomain}`
    }
    if (site.subdomain) {
      return `https://${site.subdomain}.vercel.zone`
    }
    if (site.domain) {
      return `https://${site.domain}`
    }
    return site.previewUrl
  }
  const siteUrl = getSiteUrl()
  const isGenerating = !["draft", "complete", "error"].includes(site.status)
  const isComplete = site.status === "complete"
  const isError = site.status === "error"

  // Still generating
  if (isGenerating) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-center">
          <p className="font-medium text-foreground">Generating your site...</p>
          <p className="text-sm text-muted-foreground">{site.stepLabel}</p>
        </div>
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <Globe className="h-6 w-6 text-destructive" />
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground">Generation failed</p>
          <p className="text-sm text-muted-foreground">{site.error || "An error occurred"}</p>
        </div>
      </div>
    )
  }

  // No preview URL yet
  if (!siteUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Globe className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground">No preview available</p>
          <p className="text-sm text-muted-foreground">
            Complete the setup to generate your site
          </p>
        </div>
      </div>
    )
  }

  // Show preview
  return (
    <div className="flex h-full flex-col">
      {/* Preview header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{siteUrl}</p>
        </div>
        <Button size="sm" className="shrink-0 h-9" asChild>
          <a href={siteUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-3.5 w-3.5" />
            Open
          </a>
        </Button>
      </div>

      {/* Preview iframe */}
      <div className="flex-1 bg-muted/30">
        <iframe
          key={`${site.id}-${siteUrl}`}
          src={siteUrl}
          title={`Preview of ${site.name}`}
          className="h-full w-full"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  )
}
