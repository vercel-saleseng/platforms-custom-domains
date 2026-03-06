export type SiteStatus =
  | "draft"
  | "queued"
  | "analyzing"
  | "prompting"
  | "generating"
  | "deploying"
  | "assigning-domain"
  | "complete"
  | "error"

export interface SiteRecord {
  id: string
  name: string
  prompt: string
  imageUrls: string[]
  status: SiteStatus
  currentStep: number
  totalSteps: number
  stepLabel: string
  createdAt: string
  updatedAt: string
  // Populated during workflow
  imageAnalysis?: string
  craftedPrompt?: string
  v0ChatId?: string
  v0ProjectId?: string
  v0VersionId?: string
  vercelProjectId?: string
  deploymentUrl?: string
  domain?: string
  previewUrl?: string
  error?: string
}

export const STEP_LABELS: Record<number, string> = {
  [-1]: "Draft",
  0: "Queued",
  1: "Analyzing images...",
  2: "Crafting generation prompt...",
  3: "Creating site with v0...",
  4: "Deploying site...",
  5: "Assigning domain...",
  6: "Complete!",
}

export interface GenerateRequest {
  prompt: string
  imageUrls: string[]
  siteName?: string
}

export interface UploadResponse {
  urls: string[]
}

