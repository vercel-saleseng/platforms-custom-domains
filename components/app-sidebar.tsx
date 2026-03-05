"use client"

import { Plus, Sparkles, PanelLeftClose } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SiteCard } from "@/components/site-card"
import type { SiteRecord } from "@/lib/types"

interface AppSidebarProps {
  sites: SiteRecord[]
  activeSiteId: string | null
  onSelectSite: (id: string) => void
  onNewSite: () => void
  onToggle: () => void
  isMobile?: boolean
}

export function AppSidebar({
  sites,
  activeSiteId,
  onSelectSite,
  onNewSite,
  onToggle,
  isMobile,
}: AppSidebarProps) {
  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col bg-sidebar">
      {/* Header - only show on desktop (mobile has header in Sheet) */}
      {!isMobile && (
        <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-sidebar-primary" />
            <span className="text-sm font-semibold text-sidebar-foreground">
              Site Generator
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* New Site CTA */}
      <div className="p-3">
        <Button
          onClick={onNewSite}
          className="h-11 w-full justify-start gap-2 md:h-9"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          New Site
        </Button>
      </div>

      {/* Site list */}
      <ScrollArea className="flex-1 px-2 pb-3">
        {sites.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <p className="text-xs text-sidebar-foreground/40">
              No sites yet. Create your first one!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
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
