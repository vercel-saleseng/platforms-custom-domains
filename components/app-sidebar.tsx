"use client"

import Link from "next/link"
import { Plus, Layers, Globe, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SiteCard } from "@/components/site-card"
import type { SiteRecord } from "@/lib/types"

interface AppSidebarProps {
  sites: SiteRecord[]
  activeSiteId: string | null
  onSelectSite: (id: string) => void
  onNewSite: () => void
}

export function AppSidebar({
  sites,
  activeSiteId,
  onSelectSite,
  onNewSite,
}: AppSidebarProps) {
  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col overflow-hidden bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="flex items-center px-4 py-4 border-b border-sidebar-border/50">
        <Link 
          href="/" 
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary/10 border border-sidebar-primary/20">
            <Layers className="h-4 w-4 text-sidebar-primary" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            Atlas
          </span>
        </Link>
      </div>

      {/* Actions */}
      <div className="p-3 flex flex-col gap-1.5">
        <Button
          onClick={onNewSite}
          className="h-10 w-full justify-start gap-2.5 font-medium"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          New Site
        </Button>
        <Button
          variant="ghost"
          className="h-10 w-full justify-start gap-2.5 font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          size="sm"
          asChild
        >
          <Link href="/">
            <Home className="h-4 w-4" />
            Home
          </Link>
        </Button>
      </div>

      {/* Site list */}
      <ScrollArea className="flex-1 min-h-0 px-2 pb-4">
        {sites.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sidebar-accent/50 mb-4">
              <Globe className="h-6 w-6 text-sidebar-foreground/30" />
            </div>
            <p className="text-sm text-sidebar-foreground/50 font-medium">
              No sites yet
            </p>
            <p className="text-xs text-sidebar-foreground/30 mt-1">
              Create your first one to get started
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {sites.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                isActive={site.id === activeSiteId}
                onClick={() => onSelectSite(site.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </aside>
  )
}
