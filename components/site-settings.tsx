"use client"

import { useState } from "react"
import {
  Globe,
  ExternalLink,
  Copy,
  CheckCircle2,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SiteRecord } from "@/lib/types"

interface SiteSettingsProps {
  site: SiteRecord
  onSiteUpdated: () => void
}

export function SiteSettings({ site, onSiteUpdated }: SiteSettingsProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  
  const currentUrl = site.domain ? `https://${site.domain}` : site.previewUrl
  const v0ProjectUrl = site.v0ProjectId 
    ? `https://v0.dev/chat/${site.v0ChatId}`
    : null
  
  const isGenerating = !site.v0ProjectId || site.status !== "complete"

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Current URL */}
      {currentUrl && (
        <div className="rounded-xl border border-border bg-card p-4">
          <Label className="text-sm font-medium text-foreground">Current Site URL</Label>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
              <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm text-foreground">{currentUrl}</span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(currentUrl, "url")}
              className="shrink-0"
            >
              {copiedField === "url" ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button variant="outline" size="icon" asChild className="shrink-0">
              <a href={currentUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      )}

      {/* Domain Management Info */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="flex flex-col gap-2">
            <h3 className="font-medium text-foreground">Custom Domain Setup</h3>
            <p className="text-sm text-muted-foreground">
              To add a custom domain to your v0-generated site, you need to configure it through the v0 dashboard. 
              This allows you to connect your own domain or choose a subdomain.
            </p>
            {v0ProjectUrl ? (
              <Button variant="default" size="sm" className="mt-2 w-fit" asChild>
                <a href={v0ProjectUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in v0 Dashboard
                </a>
              </Button>
            ) : isGenerating ? (
              <p className="mt-1 text-sm text-amber-500">
                Site generation must complete before domain settings are available.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Site Details */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-4 font-medium text-foreground">Site Details</h3>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Site ID</span>
            <code className="rounded bg-muted px-2 py-1 text-xs text-foreground">{site.id}</code>
          </div>
          {site.v0ChatId && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">v0 Chat ID</span>
              <code className="rounded bg-muted px-2 py-1 text-xs text-foreground">{site.v0ChatId}</code>
            </div>
          )}
          {site.v0ProjectId && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">v0 Project ID</span>
              <code className="rounded bg-muted px-2 py-1 text-xs text-foreground">{site.v0ProjectId}</code>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className={`rounded px-2 py-1 text-xs font-medium ${
              site.status === "complete" 
                ? "bg-green-500/10 text-green-500" 
                : site.status === "error"
                ? "bg-red-500/10 text-red-500"
                : "bg-amber-500/10 text-amber-500"
            }`}>
              {site.status}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Created</span>
            <span className="text-sm text-foreground">
              {new Date(site.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Rename Site */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-4 font-medium text-foreground">Rename Site</h3>
        <form 
          onSubmit={async (e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const newName = formData.get("name") as string
            if (!newName.trim()) return
            
            try {
              const response = await fetch(`/api/sites/${site.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName.trim() }),
              })
              if (response.ok) {
                onSiteUpdated()
              }
            } catch (err) {
              console.error("Failed to rename site:", err)
            }
          }}
          className="flex gap-2"
        >
          <Input
            name="name"
            defaultValue={site.name}
            placeholder="Site name"
            className="flex-1"
          />
          <Button type="submit" variant="outline">
            Save
          </Button>
        </form>
      </div>
    </div>
  )
}
