"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import useSWR, { mutate } from "swr"
import { Layers, Plus, Loader2, ArrowRight, Globe, Clock, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AppRecord } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function Home() {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)

  // Fetch all apps
  const { data: appsData, isLoading } = useSWR<{ apps: AppRecord[] }>(
    "/api/apps",
    fetcher,
    { refreshInterval: 10000 }
  )
  const apps = appsData?.apps || []

  const handleNewApp = useCallback(async () => {
    setIsCreating(true)
    try {
      const response = await fetch("/api/apps", { method: "POST" })
      const data = await response.json()
      if (data.appId) {
        mutate("/api/apps")
        router.push(`/apps/${data.appId}`)
      }
    } catch (error) {
      console.error("Failed to create app:", error)
    } finally {
      setIsCreating(false)
    }
  }, [router])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "deployed":
        return (
          <span className="flex items-center gap-1.5 text-xs text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Live
          </span>
        )
      case "building":
      case "iterating":
        return (
          <span className="flex items-center gap-1.5 text-xs text-chart-4">
            <Loader2 className="h-3 w-3 animate-spin" />
            Building
          </span>
        )
      case "error":
        return (
          <span className="flex items-center gap-1.5 text-xs text-destructive">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
            Error
          </span>
        )
      default:
        return (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
            Draft
          </span>
        )
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Atlas</span>
          </div>
          <Button onClick={handleNewApp} disabled={isCreating} className="gap-2">
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Build an App
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4 animate-fade-up">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading apps...</p>
            </div>
          </div>
        ) : apps.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-20 animate-fade-up">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-3xl bg-primary/20 blur-xl animate-glow-pulse" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-lg">
                <Sparkles className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance text-center">
              Build your first app
            </h1>
            <p className="mt-3 text-muted-foreground text-pretty text-center max-w-md">
              Describe what you want to build and watch it come to life. Each app gets its own subdomain and can be iterated through chat.
            </p>
            <Button onClick={handleNewApp} disabled={isCreating} size="lg" className="mt-6 gap-2">
              {isCreating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  Build an App
                </>
              )}
            </Button>
          </div>
        ) : (
          // Apps list
          <div className="space-y-6 animate-fade-up">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your Apps</h2>
              <span className="text-sm text-muted-foreground">{apps.length} app{apps.length !== 1 ? "s" : ""}</span>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {apps.map((app, index) => (
                <button
                  key={app.id}
                  onClick={() => router.push(`/apps/${app.id}`)}
                  className="group flex flex-col gap-4 rounded-xl border border-border/50 bg-card/50 p-5 text-left transition-all duration-200 hover:bg-card hover:border-border hover:shadow-lg hover:shadow-primary/5 active:scale-[0.99]"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                      <Layers className="h-5 w-5 text-primary" />
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {app.name || "Untitled App"}
                    </h3>
                    {app.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {app.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDate(app.updatedAt)}
                    </div>
                    {app.previewUrl && (
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5" />
                        <span className="truncate max-w-[120px]">{app.subdomain}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground/50 group-hover:text-primary/70 transition-colors">
                    <span>Open app</span>
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
