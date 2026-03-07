import useSWR from "swr"
import type { SiteRecord } from "@/lib/types"

interface WorkflowStatus {
  id: string
  status: "running" | "completed" | "failed" | "cancelled"
  output?: unknown
  error?: string
  createdAt: string
  updatedAt: string
}

interface SiteStatusResponse {
  site: SiteRecord
  workflowStatus: WorkflowStatus | null
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useSiteStatus(siteId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<SiteStatusResponse>(
    siteId ? `/api/sites/${siteId}/status` : null,
    fetcher,
    {
      // Poll every 2 seconds while workflow is running
      refreshInterval: (data) => {
        if (!data?.site) return 0
        const isProcessing = !["draft", "complete", "error"].includes(data.site.status)
        return isProcessing ? 2000 : 0
      },
      // Revalidate on focus when processing
      revalidateOnFocus: true,
    }
  )

  return {
    site: data?.site,
    workflowStatus: data?.workflowStatus,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  }
}
