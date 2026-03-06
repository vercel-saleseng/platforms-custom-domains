"use client"

import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  ExternalLink,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { SiteRecord } from "@/lib/types"

interface GenerationStatusProps {
  site: SiteRecord
  onReset: () => void
  onRetry?: () => void
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

export function GenerationStatus({ site, onReset, onRetry, hideResetButton }: GenerationStatusProps) {
  const isComplete = site.status === "complete"
  const isError = site.status === "error"
  const siteUrl = site.domain
    ? `https://${site.domain}`
    : site.previewUrl || site.deploymentUrl

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground text-balance md:text-lg">
            {isComplete
              ? "Your site is ready!"
              : isError
                ? "Something went wrong"
                : "Generating your site..."}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {site.name}
          </p>
        </div>
        {(isComplete || isError) && !hideResetButton && (
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            New Site
          </Button>
        )}
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-1">
        {WORKFLOW_STEPS.map((ws, index) => {
          const state = getStepState(ws.step, site.currentStep, site.status)
          return (
            <div key={ws.step} className="flex items-start gap-3">
              {/* Step indicator line */}
              <div className="flex flex-col items-center">
                <div className="flex h-6 w-6 items-center justify-center">
                  {state === "done" && (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  )}
                  {state === "active" && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                  {state === "pending" && (
                    <Circle className="h-5 w-5 text-muted-foreground/30" />
                  )}
                  {state === "error" && (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                </div>
                {index < WORKFLOW_STEPS.length - 1 && (
                  <div
                    className={`h-6 w-px ${
                      state === "done"
                        ? "bg-success/40"
                        : "bg-border"
                    }`}
                  />
                )}
              </div>
              {/* Step content */}
              <div className="flex flex-col pb-4">
                <span
                  className={`text-sm font-medium ${
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
                <span className="text-xs text-muted-foreground">
                  {ws.description}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Error message */}
      {isError && (
        <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-sm text-destructive">{site.error || "An unexpected error occurred"}</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="w-fit">
              <RotateCcw className="mr-2 h-3.5 w-3.5" />
              Retry Generation
            </Button>
          )}
        </div>
      )}

      {/* Success - Site Preview */}
      {isComplete && siteUrl && (
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-3 md:p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-0.5 min-w-0">
              <p className="text-sm font-medium text-foreground">Site URL</p>
              <p className="truncate text-xs text-muted-foreground">{siteUrl}</p>
            </div>
            <Button size="sm" className="h-11 md:h-9 shrink-0" asChild>
              <a href={siteUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                Visit Site
              </a>
            </Button>
          </div>
          {/* Preview iframe */}
          <div className="overflow-hidden rounded-lg border border-border">
            <iframe
              src={siteUrl}
              title={`Preview of ${site.name}`}
              className="h-[250px] w-full md:h-[400px]"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  )
}
