"use client"

import { Globe, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import type { SiteRecord } from "@/lib/types"

interface SiteCardProps {
  site: SiteRecord
  isActive: boolean
  onClick: () => void
}

function StatusIndicator({ status }: { status: string }) {
  if (status === "complete") {
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success/10">
        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
      </div>
    )
  }
  if (status === "error") {
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-3.5 w-3.5 text-destructive" />
      </div>
    )
  }
  if (status === "draft") {
    return (
      <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
    )
  }
  return (
    <div className="flex h-5 w-5 items-center justify-center">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
    </div>
  )
}

export function SiteCard({ site, isActive, onClick }: SiteCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-200 ${
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
          : "text-sidebar-foreground hover:bg-sidebar-accent/40"
      }`}
    >
      {/* Active indicator bar */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-sidebar-primary" />
      )}
      
      {/* Thumbnail */}
      {site.imageUrls[0] ? (
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-sidebar-border/50 shadow-sm transition-transform duration-200 group-hover:scale-105">
          <img
            src={site.imageUrls[0]}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent/50 border border-sidebar-border/50">
          <Globe className="h-4 w-4 text-sidebar-foreground/40" />
        </div>
      )}

      {/* Text */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={`truncate text-sm font-medium transition-colors ${isActive ? 'text-sidebar-foreground' : 'group-hover:text-sidebar-foreground'}`}>
          {site.name}
        </span>
        <span className="truncate text-xs text-sidebar-foreground/40">
          {site.subdomain 
            ? `${site.subdomain}.vercel.zone`
            : site.domain || site.previewUrl || "Not deployed"}
        </span>
      </div>

      {/* Status */}
      <StatusIndicator status={site.status} />
    </button>
  )
}
