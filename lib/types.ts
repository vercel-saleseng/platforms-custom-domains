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
  workflowRunId?: string
  deploymentUrl?: string
  domain?: string // deprecated - use subdomain/customDomain
  subdomain?: string // e.g., "my-site-abc123" for "my-site-abc123.vercel.zone"
  customDomain?: string // e.g., "example.com"
  customDomainVerified?: boolean
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

// App types for the new chat-first platform
export type AppStatus =
  | "created"      // Just created, no messages yet
  | "building"     // First message sent, workflow in progress
  | "deployed"     // Initial deployment complete
  | "iterating"    // Processing iteration message
  | "error"        // Something went wrong

export interface AppRecord {
  id: string
  name?: string
  description?: string
  subdomain: string
  
  // v0 Integration
  v0ChatId?: string
  v0ProjectId?: string
  v0VersionId?: string
  
  // Vercel Integration
  vercelProjectId?: string
  vercelTeamId?: string
  
  // Deployment State
  previewUrl?: string
  customDomain?: string
  customDomainVerified?: boolean
  currentDeploymentId?: string
  
  // Pending Changes
  hasPendingChanges: boolean
  pendingMessageId?: string
  
  // Workflow tracking
  workflowRunId?: string
  status: AppStatus
  currentStep: number
  error?: string
  
  // Timestamps
  createdAt: string
  updatedAt: string
}

export const APP_STEP_LABELS: Record<number, string> = {
  0: "Ready to build",
  1: "Creating v0 project...",
  2: "Generating app...",
  3: "Deploying to Vercel...",
  4: "Assigning domain...",
  5: "Complete!",
}

