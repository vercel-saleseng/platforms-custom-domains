"use client"

import { Globe, Loader2, AlertCircle } from "lucide-react"
import type { SiteRecord } from "@/lib/types"

interface SiteCardProps {
  site: SiteRecord
  isActive: boolean
  onClick: () => void
}

function StatusIndicator({ status }: { status: string }) {
  if (status === "complete") {
    return <Globe className="h-3.5 w-3.5 shrink-0 text-success" />
  }
  if (status === "error") {
    return <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
  }
  return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
}

export function SiteCard({ site, isActive, onClick }: SiteCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
      }`}
    >
      {/* Thumbnail */}
      {site.imageUrls[0] ? (
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-sidebar-border">
          <img
            src={site.imageUrls[0]}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-sidebar-accent">
          <Globe className="h-4 w-4 text-sidebar-foreground/50" />
        </div>
      )}

      {/* Text */}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{site.name}</span>
        <span className="truncate text-xs text-sidebar-foreground/50">
          {site.prompt.length > 40
            ? site.prompt.substring(0, 40) + "..."
            : site.prompt}
        </span>
      </div>

      {/* Status */}
      <StatusIndicator status={site.status} />
    </button>
  )
}
