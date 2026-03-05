"use client"

import { useState } from "react"
import { Globe, Loader2, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SiteRecord } from "@/lib/types"

interface SiteSettingsProps {
  site: SiteRecord
  onSiteUpdated: () => void
}

export function SiteSettings({ site, onSiteUpdated }: SiteSettingsProps) {
  const [subdomain, setSubdomain] = useState("")
  const [customDomain, setCustomDomain] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const currentUrl = site.domain ? `https://${site.domain}` : site.previewUrl
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "example.com"

  const handleSubdomainSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subdomain.trim() || !site.v0ProjectId) return

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: site.id,
          projectId: site.v0ProjectId,
          subdomain: subdomain.trim().toLowerCase(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to assign domain")
      }

      setSuccess(`Domain assigned: ${data.domain}`)
      setSubdomain("")
      onSiteUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign domain")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCustomDomainSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customDomain.trim() || !site.v0ProjectId) return

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: site.id,
          projectId: site.v0ProjectId,
          customDomain: customDomain.trim().toLowerCase(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to assign domain")
      }

      setSuccess(`Domain assigned: ${data.domain}`)
      setCustomDomain("")
      onSiteUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign domain")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-6 md:py-12">
      <div className="flex flex-col gap-8">
        {/* Current Domain */}
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Domain Settings</h2>
            <p className="text-sm text-muted-foreground">
              Configure how people access your site
            </p>
          </div>

          {currentUrl && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">Current URL</p>
                <p className="text-sm text-muted-foreground truncate">{currentUrl}</p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <a href={currentUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          )}
        </div>

        {/* Feedback messages */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 p-3">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            <p className="text-sm text-green-500">{success}</p>
          </div>
        )}

        {/* Subdomain form */}
        <form onSubmit={handleSubdomainSubmit} className="flex flex-col gap-4">
          <div>
            <h3 className="text-base font-medium text-foreground">Choose a subdomain</h3>
            <p className="text-sm text-muted-foreground">
              Get a free subdomain on {rootDomain}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="subdomain" className="sr-only">Subdomain</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  id="subdomain"
                  type="text"
                  placeholder="my-awesome-site"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.replace(/[^a-z0-9-]/gi, ""))}
                  disabled={isSubmitting || !site.v0ProjectId}
                  className="pr-32 text-base md:text-sm"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  .{rootDomain}
                </span>
              </div>
              <Button
                type="submit"
                disabled={!subdomain.trim() || isSubmitting || !site.v0ProjectId}
                className="h-11 md:h-10 shrink-0"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Assign"
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        {/* Custom domain form */}
        <form onSubmit={handleCustomDomainSubmit} className="flex flex-col gap-4">
          <div>
            <h3 className="text-base font-medium text-foreground">Use a custom domain</h3>
            <p className="text-sm text-muted-foreground">
              Connect your own domain (requires DNS configuration)
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="customDomain" className="sr-only">Custom Domain</Label>
            <div className="flex items-center gap-2">
              <Input
                id="customDomain"
                type="text"
                placeholder="www.yoursite.com"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                disabled={isSubmitting || !site.v0ProjectId}
                className="flex-1 text-base md:text-sm"
              />
              <Button
                type="submit"
                disabled={!customDomain.trim() || isSubmitting || !site.v0ProjectId}
                className="h-11 md:h-10 shrink-0"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Assign"
                )}
              </Button>
            </div>
          </div>
        </form>

        {!site.v0ProjectId && (
          <p className="text-sm text-muted-foreground text-center">
            Complete the site generation to configure domain settings.
          </p>
        )}
      </div>
    </div>
  )
}
