"use client"

import { ExternalLink, Loader2, Globe, Copy, Check, RefreshCw } from "lucide-react"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import type { SiteRecord } from "@/lib/types"

interface SitePreviewProps {
  site: SiteRecord
}

export function SitePreview({ site }: SitePreviewProps) {
  const [copied, setCopied] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  
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
  
  const copyUrl = useCallback(() => {
    if (siteUrl) {
      navigator.clipboard.writeText(siteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [siteUrl])
  
  const refreshPreview = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  // Still generating
  if (isGenerating) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 p-8 animate-fade-up">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-glow-pulse" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">Generating your site...</p>
          <p className="mt-1 text-sm text-muted-foreground">{site.stepLabel}</p>
        </div>
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 p-8 animate-fade-up">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20">
          <Globe className="h-8 w-8 text-destructive" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">Generation failed</p>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">{site.error || "An error occurred"}</p>
        </div>
      </div>
    )
  }

  // No preview URL yet
  if (!siteUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 p-8 animate-fade-up">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 border border-border/50">
          <Globe className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">No preview available</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete the setup to generate your site
          </p>
        </div>
      </div>
    )
  }

  // Show preview with browser chrome
  return (
    <div className="flex h-full flex-col p-4 md:p-6 animate-fade-up">
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/50 bg-card shadow-lg">
        {/* Browser chrome header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border/50">
          {/* Window controls */}
          <div className="flex gap-1.5 shrink-0">
            <div className="h-3 w-3 rounded-full bg-destructive/60 hover:bg-destructive transition-colors" />
            <div className="h-3 w-3 rounded-full bg-chart-4/60 hover:bg-chart-4 transition-colors" />
            <div className="h-3 w-3 rounded-full bg-success/60 hover:bg-success transition-colors" />
          </div>
          
          {/* URL bar */}
          <div className="flex flex-1 items-center min-w-0">
            <div className="flex flex-1 items-center gap-2 rounded-lg bg-background/80 border border-border/50 px-3 py-1.5 min-w-0">
              <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground font-mono truncate flex-1">
                {siteUrl}
              </span>
              <button
                onClick={copyUrl}
                className="p-1 rounded hover:bg-muted transition-colors shrink-0"
                aria-label="Copy URL"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-success" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshPreview}
              className="h-8 w-8 hover:bg-muted"
              aria-label="Refresh preview"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" className="h-8 gradient-primary hover:opacity-90 glow-sm" asChild>
              <a href={siteUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Open
              </a>
            </Button>
          </div>
        </div>

        {/* Preview iframe */}
        <div className="flex-1 bg-background">
          <iframe
            key={`${site.id}-${siteUrl}-${refreshKey}`}
            src={siteUrl}
            title={`Preview of ${site.name}`}
            className="h-full w-full"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  )
}
