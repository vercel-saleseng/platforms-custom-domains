"use client"

import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  ExternalLink,
  RotateCcw,
  Sparkles,
  PartyPopper,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { SiteRecord } from "@/lib/types"

interface GenerationStatusProps {
  site: SiteRecord
  onReset: () => void
  onRetry?: () => void
  isRetrying?: boolean
  hideResetButton?: boolean
}

const WORKFLOW_STEPS = [
  { step: 1, label: "Analyzing images", description: "Understanding your photos with AI vision" },
  { step: 2, label: "Crafting prompt", description: "Building an optimized site generation prompt" },
  { step: 3, label: "Generating site", description: "Creating your personalized site with v0" },
  { step: 4, label: "Deploying", description: "Building and deploying your site" },
  { step: 5, label: "Assigning domain", description: "Setting up your unique site URL" },
]

function getStepState(
  stepNumber: number,
  currentStep: number,
  status: string
): "done" | "active" | "pending" | "error" {
  if (status === "error") {
    if (stepNumber <= currentStep) return stepNumber === currentStep ? "error" : "done"
    return "pending"
  }
  if (status === "complete") return "done"
  if (stepNumber < currentStep) return "done"
  if (stepNumber === currentStep) return "active"
  return "pending"
}

export function GenerationStatus({ site, onReset, onRetry, isRetrying, hideResetButton }: GenerationStatusProps) {
  const isComplete = site.status === "complete"
  const isError = site.status === "error"
  const siteUrl = site.domain
    ? `https://${site.domain}`
    : site.previewUrl || site.deploymentUrl

  return (
    <div className="flex flex-col gap-8 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
            isComplete 
              ? "bg-success/10 text-success" 
              : isError 
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary"
          }`}>
            {isComplete ? (
              <PartyPopper className="h-6 w-6" />
            ) : isError ? (
              <XCircle className="h-6 w-6" />
            ) : (
              <Sparkles className="h-6 w-6 animate-pulse" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground text-balance">
              {isComplete
                ? "Your site is ready!"
                : isError
                  ? "Something went wrong"
                  : "Generating your site..."}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {site.name}
            </p>
          </div>
        </div>
        {(isComplete || isError) && !hideResetButton && (
          <Button variant="outline" size="sm" onClick={onReset} className="shrink-0 hover:bg-accent/50">
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            New Site
          </Button>
        )}
      </div>

      {/* Steps */}
      <div className="flex flex-col">
        {WORKFLOW_STEPS.map((ws, index) => {
          const state = getStepState(ws.step, site.currentStep, site.status)
          return (
            <div 
              key={ws.step} 
              className={`flex items-start gap-4 animate-fade-up`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Step indicator line */}
              <div className="flex flex-col items-center">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  state === "done" 
                    ? "border-success bg-success/10" 
                    : state === "active"
                      ? "border-primary bg-primary/10 animate-progress-pulse"
                      : state === "error"
                        ? "border-destructive bg-destructive/10"
                        : "border-border/50 bg-muted/30"
                }`}>
                  {state === "done" && (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  )}
                  {state === "active" && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {state === "pending" && (
                    <Circle className="h-3 w-3 text-muted-foreground/30" />
                  )}
                  {state === "error" && (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
                {index < WORKFLOW_STEPS.length - 1 && (
                  <div
                    className={`w-0.5 h-8 rounded-full transition-colors duration-300 ${
                      state === "done"
                        ? "bg-success/30"
                        : "bg-border/50"
                    }`}
                  />
                )}
              </div>
              {/* Step content */}
              <div className="flex flex-col pb-6 pt-1">
                <span
                  className={`text-sm font-medium transition-colors ${
                    state === "done"
                      ? "text-foreground"
                      : state === "active"
                        ? "text-primary"
                        : state === "error"
                          ? "text-destructive"
                          : "text-muted-foreground/50"
                  }`}
                >
                  {ws.label}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">
                  {ws.description}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Error message */}
      {isError && (
        <div className="flex flex-col gap-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-5 animate-scale-in">
          <p className="text-sm text-destructive font-medium">{site.error || "An unexpected error occurred"}</p>
          {onRetry && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRetry} 
              disabled={isRetrying} 
              className="w-fit border-destructive/30 hover:bg-destructive/10"
            >
              {isRetrying ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
              )}
              {isRetrying ? "Retrying..." : "Retry Generation"}
            </Button>
          )}
        </div>
      )}

      {/* Success - Site Preview */}
      {isComplete && siteUrl && (
        <div className="flex flex-col gap-5 rounded-2xl border border-success/20 bg-card/50 p-5 animate-scale-in">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1 min-w-0">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                Site URL
              </p>
              <p className="truncate text-sm text-muted-foreground">{siteUrl}</p>
            </div>
            <Button size="sm" className="h-10 shrink-0 gradient-primary hover:opacity-90 glow-sm" asChild>
              <a href={siteUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Visit Site
              </a>
            </Button>
          </div>
          {/* Preview iframe with browser chrome */}
          <div className="overflow-hidden rounded-xl border border-border/50 bg-background shadow-lg">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b border-border/50">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-destructive/60" />
                <div className="h-3 w-3 rounded-full bg-chart-4/60" />
                <div className="h-3 w-3 rounded-full bg-success/60" />
              </div>
              <div className="flex-1 mx-4">
                <div className="flex items-center justify-center rounded-lg bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground font-mono truncate">
                  {siteUrl}
                </div>
              </div>
            </div>
            <iframe
              src={siteUrl}
              title={`Preview of ${site.name}`}
              className="h-[280px] w-full md:h-[420px]"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  )
}
