"use client"

import { useState } from "react"
import { Rocket, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DeployButtonProps {
  appId: string
  onDeployStarted?: () => void
}

export function DeployButton({ appId, onDeployStarted }: DeployButtonProps) {
  const [isDeploying, setIsDeploying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDeploy = async () => {
    setIsDeploying(true)
    setError(null)

    try {
      const res = await fetch(`/api/apps/${appId}/deploy`, {
        method: "POST",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to deploy")
      }

      onDeployStarted?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deploy")
      setIsDeploying(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
      <Button
        onClick={handleDeploy}
        disabled={isDeploying}
        size="sm"
        className="gap-2"
      >
        {isDeploying ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Deploying...
          </>
        ) : (
          <>
            <Rocket className="h-4 w-4" />
            Deploy Changes
          </>
        )}
      </Button>
    </div>
  )
}
