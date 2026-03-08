"use client"

import Link from "next/link"
import { ArrowLeft, ArrowDown, ArrowRight, Database, Cloud, Globe, Layers, Image, MessageSquare, Cpu, Rocket, CheckCircle, Box } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function FlowchartPage() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-12">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Atlas Architecture</h1>
            <p className="text-muted-foreground">How the site generation system works</p>
          </div>
        </div>

        {/* Architecture Overview */}
        <div className="mb-16">
          <h2 className="text-lg font-semibold mb-6 text-muted-foreground uppercase tracking-wider">System Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <TechCard 
              icon={<Layers className="h-5 w-5" />}
              title="Next.js 16"
              description="App Router with Server Components"
            />
            <TechCard 
              icon={<Database className="h-5 w-5" />}
              title="Neon PostgreSQL"
              description="Serverless database for site records"
            />
            <TechCard 
              icon={<Cloud className="h-5 w-5" />}
              title="Vercel Blob"
              description="Image storage for uploads"
            />
            <TechCard 
              icon={<Box className="h-5 w-5" />}
              title="Vercel Workflows"
              description="Durable workflow orchestration"
            />
          </div>
        </div>

        {/* Main Flowchart */}
        <div className="space-y-8">
          <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-wider">Site Generation Flow</h2>
          
          {/* User Input Phase */}
          <FlowSection title="1. User Input" color="blue">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FlowCard 
                step="1a"
                title="Create Draft Site"
                description="User clicks 'New Site' - creates draft record in Neon DB"
                api="POST /api/sites/new"
                details={["Generate unique site ID (nanoid)", "Create DB record with status: draft", "Navigate to /site/[id]"]}
              />
              <FlowCard 
                step="1b"
                title="Upload Images"
                description="User uploads images to Vercel Blob storage"
                api="POST /api/upload"
                details={["Accept up to 5 images", "Upload to Vercel Blob", "Return public URLs"]}
              />
              <FlowCard 
                step="1c"
                title="Enter Prompt"
                description="User describes their desired website"
                details={["Text prompt input", "Example prompts provided", "Combined with images for context"]}
              />
            </div>
          </FlowSection>

          <FlowArrow />

          {/* Workflow Trigger */}
          <FlowSection title="2. Workflow Initiation" color="purple">
            <FlowCard 
              step="2"
              title="Start Durable Workflow"
              description="POST /api/generate triggers the site generation workflow"
              api="POST /api/generate"
              details={[
                "Validate prompt and images exist",
                "Update site status to 'queued'",
                "Start Vercel Workflow (workflow/api)",
                "Store workflowRunId for status tracking"
              ]}
              fullWidth
            />
          </FlowSection>

          <FlowArrow />

          {/* AI Processing */}
          <FlowSection title="3. AI Processing (Workflow Steps)" color="green">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FlowCard 
                step="3a"
                title="Analyze Images"
                description="GPT-4o Vision analyzes uploaded images"
                status="analyzing"
                details={[
                  "Fetch images as Uint8Array",
                  "Send to openai/gpt-4o via AI SDK",
                  "Extract: subjects, colors, mood, layout suggestions",
                  "Returns comprehensive image analysis"
                ]}
              />
              <FlowCard 
                step="3b"
                title="Build v0 Prompt"
                description="GPT-4o crafts optimized prompt for v0"
                status="prompting"
                details={[
                  "Combine user prompt + image analysis",
                  "Include image URLs for embedding",
                  "Specify layout, sections, colors",
                  "Output: comprehensive v0 prompt"
                ]}
              />
            </div>
          </FlowSection>

          <FlowArrow />

          {/* v0 Generation */}
          <FlowSection title="4. v0 Site Generation" color="orange">
            <FlowCard 
              step="4"
              title="Create Site with v0 SDK"
              description="v0 generates the actual website code"
              status="generating"
              details={[
                "v0.projects.create() - Create new v0 project",
                "v0.chats.create() - Send crafted prompt with image attachments",
                "Poll for completion (up to 5 min, every 5s)",
                "Receive: chatId, projectId, versionId, previewUrl"
              ]}
              fullWidth
            />
          </FlowSection>

          <FlowArrow />

          {/* Deployment */}
          <FlowSection title="5. Deployment" color="cyan">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FlowCard 
                step="5a"
                title="Deploy to Vercel"
                description="Deploy generated site to production"
                status="deploying"
                details={[
                  "v0.deployments.create() with projectId, chatId, versionId",
                  "Get Vercel project ID from v0 project",
                  "Disable SSO/deployment protection",
                  "Returns deployment URL"
                ]}
              />
              <FlowCard 
                step="5b"
                title="Assign Domain"
                description="Configure custom subdomain"
                status="assigning-domain"
                details={[
                  "Generate slug from site name + ID",
                  "Create subdomain: {slug}.{ROOT_DOMAIN}",
                  "Add domain via Vercel API",
                  "e.g., my-site-abc123.vercel.zone"
                ]}
              />
            </div>
          </FlowSection>

          <FlowArrow />

          {/* Complete */}
          <FlowSection title="6. Complete" color="emerald">
            <FlowCard 
              step="6"
              title="Mark Complete"
              description="Update database and notify user"
              status="complete"
              details={[
                "Update site status to 'complete'",
                "Store final URLs, domain, project IDs",
                "UI polls /api/sites/[id]/status for updates",
                "User can visit, manage, or add custom domain"
              ]}
              fullWidth
            />
          </FlowSection>
        </div>

        {/* Additional Flows */}
        <div className="mt-20 space-y-12">
          <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-wider">Additional Flows</h2>
          
          {/* Status Polling */}
          <div className="border border-border rounded-xl p-6 bg-card/50">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-muted-foreground" />
              Status Polling (Real-time Updates)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="font-medium mb-1">Client Hook</div>
                <code className="text-xs text-muted-foreground">useSiteStatus(siteId)</code>
                <p className="mt-2 text-muted-foreground">SWR hook polls every 2s while generating</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="font-medium mb-1">API Endpoint</div>
                <code className="text-xs text-muted-foreground">GET /api/sites/[id]/status</code>
                <p className="mt-2 text-muted-foreground">Returns current status, step, progress</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="font-medium mb-1">UI Updates</div>
                <code className="text-xs text-muted-foreground">GenerationStatus component</code>
                <p className="mt-2 text-muted-foreground">Shows progress steps, animations</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="font-medium mb-1">Completion</div>
                <code className="text-xs text-muted-foreground">status === "complete"</code>
                <p className="mt-2 text-muted-foreground">Stops polling, shows site preview</p>
              </div>
            </div>
          </div>

          {/* Custom Domain Flow */}
          <div className="border border-border rounded-xl p-6 bg-card/50">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 text-muted-foreground" />
              Custom Domain Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="font-medium mb-1">1. Check Availability</div>
                <code className="text-xs text-muted-foreground">POST /api/domains/check</code>
                <p className="mt-2 text-muted-foreground">Verify domain format and availability</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="font-medium mb-1">2. Add Domain</div>
                <code className="text-xs text-muted-foreground">POST /api/domains</code>
                <p className="mt-2 text-muted-foreground">Add to Vercel project, get DNS records</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="font-medium mb-1">3. Verify DNS</div>
                <code className="text-xs text-muted-foreground">POST /api/domains/verify</code>
                <p className="mt-2 text-muted-foreground">Check DNS propagation status</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="font-medium mb-1">4. Complete</div>
                <code className="text-xs text-muted-foreground">customDomainVerified: true</code>
                <p className="mt-2 text-muted-foreground">Domain active, SSL provisioned</p>
              </div>
            </div>
          </div>

          {/* Deletion Flow */}
          <div className="border border-border rounded-xl p-6 bg-card/50">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Database className="h-5 w-5 text-muted-foreground" />
              Site Deletion Workflow
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="font-medium mb-1">1. Delete Blobs</div>
                <code className="text-xs text-muted-foreground">deleteBlobs()</code>
                <p className="mt-2 text-muted-foreground">Remove images from Vercel Blob</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="font-medium mb-1">2. Remove Domain</div>
                <code className="text-xs text-muted-foreground">removeDomainFromVercel()</code>
                <p className="mt-2 text-muted-foreground">Delete domain from Vercel project</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="font-medium mb-1">3. Delete Project</div>
                <code className="text-xs text-muted-foreground">deleteVercelProject()</code>
                <p className="mt-2 text-muted-foreground">Remove entire Vercel project</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="font-medium mb-1">4. Delete Record</div>
                <code className="text-xs text-muted-foreground">deleteSiteFromDb()</code>
                <p className="mt-2 text-muted-foreground">Remove from Neon database</p>
              </div>
            </div>
          </div>
        </div>

        {/* Data Model */}
        <div className="mt-20">
          <h2 className="text-lg font-semibold mb-6 text-muted-foreground uppercase tracking-wider">Data Model</h2>
          <div className="border border-border rounded-xl p-6 bg-card/50 overflow-x-auto">
            <h3 className="text-lg font-semibold mb-4">SiteRecord (Neon PostgreSQL)</h3>
            <pre className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg overflow-x-auto">
{`interface SiteRecord {
  id: string              // Unique site ID (nanoid)
  name: string            // User-defined site name
  prompt: string          // User's description prompt
  imageUrls: string[]     // Vercel Blob URLs
  status: SiteStatus      // draft | queued | analyzing | prompting | generating | deploying | assigning-domain | complete | error
  currentStep: number     // 0-6 progress indicator
  
  // Populated during workflow
  imageAnalysis?: string      // GPT-4o vision output
  craftedPrompt?: string      // Optimized v0 prompt
  v0ChatId?: string           // v0 chat identifier
  v0ProjectId?: string        // v0 project identifier
  v0VersionId?: string        // v0 version identifier
  vercelProjectId?: string    // Vercel project ID
  workflowRunId?: string      // Vercel Workflow run ID
  deploymentUrl?: string      // Vercel deployment URL
  subdomain?: string          // Auto-assigned subdomain
  customDomain?: string       // User's custom domain
  customDomainVerified?: bool // DNS verification status
  previewUrl?: string         // Final accessible URL
  error?: string              // Error message if failed
  
  createdAt: string
  updatedAt: string
}`}
            </pre>
          </div>
        </div>

        {/* API Reference */}
        <div className="mt-12 mb-20">
          <h2 className="text-lg font-semibold mb-6 text-muted-foreground uppercase tracking-wider">API Endpoints</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ApiCard method="GET" path="/api/sites" description="List all sites" />
            <ApiCard method="POST" path="/api/sites/new" description="Create draft site" />
            <ApiCard method="GET" path="/api/sites/[id]" description="Get site by ID" />
            <ApiCard method="PATCH" path="/api/sites/[id]" description="Update site" />
            <ApiCard method="DELETE" path="/api/sites/[id]" description="Delete site (triggers workflow)" />
            <ApiCard method="GET" path="/api/sites/[id]/status" description="Get site status (for polling)" />
            <ApiCard method="POST" path="/api/upload" description="Upload images to Blob" />
            <ApiCard method="POST" path="/api/generate" description="Start generation workflow" />
            <ApiCard method="POST" path="/api/domains" description="Add custom domain" />
            <ApiCard method="POST" path="/api/domains/check" description="Check domain availability" />
            <ApiCard method="POST" path="/api/domains/verify" description="Verify DNS records" />
            <ApiCard method="GET" path="/api/domains/info" description="Get domain configuration" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Components

function TechCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card/50">
      <div className="flex items-center gap-3 mb-2">
        <div className="text-muted-foreground">{icon}</div>
        <span className="font-medium">{title}</span>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function FlowSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const colorClasses: Record<string, string> = {
    blue: "border-l-blue-500",
    purple: "border-l-purple-500",
    green: "border-l-green-500",
    orange: "border-l-orange-500",
    cyan: "border-l-cyan-500",
    emerald: "border-l-emerald-500",
  }
  
  return (
    <div className={`border-l-4 ${colorClasses[color]} pl-6`}>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">{title}</h3>
      {children}
    </div>
  )
}

function FlowCard({ 
  step, 
  title, 
  description, 
  api, 
  status,
  details, 
  fullWidth 
}: { 
  step: string
  title: string
  description: string
  api?: string
  status?: string
  details?: string[]
  fullWidth?: boolean
}) {
  return (
    <div className={`p-5 rounded-xl border border-border bg-card/50 ${fullWidth ? 'md:col-span-2' : ''}`}>
      <div className="flex items-start gap-3 mb-3">
        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-xs font-medium text-primary shrink-0">
          {step}
        </span>
        <div>
          <h4 className="font-semibold">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {api && (
        <code className="text-xs bg-muted/50 px-2 py-1 rounded text-muted-foreground block mb-3">
          {api}
        </code>
      )}
      {status && (
        <div className="text-xs bg-muted/50 px-2 py-1 rounded text-muted-foreground inline-block mb-3">
          status: "{status}"
        </div>
      )}
      {details && (
        <ul className="text-sm text-muted-foreground space-y-1 mt-3 border-t border-border/50 pt-3">
          {details.map((detail, i) => (
            <li key={i} className="flex items-start gap-2">
              <ArrowRight className="h-3 w-3 mt-1.5 shrink-0 text-muted-foreground/50" />
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FlowArrow() {
  return (
    <div className="flex justify-center py-2">
      <ArrowDown className="h-6 w-6 text-muted-foreground/30" />
    </div>
  )
}

function ApiCard({ method, path, description }: { method: string; path: string; description: string }) {
  const methodColors: Record<string, string> = {
    GET: "bg-green-500/10 text-green-500",
    POST: "bg-blue-500/10 text-blue-500",
    PATCH: "bg-orange-500/10 text-orange-500",
    DELETE: "bg-red-500/10 text-red-500",
  }
  
  return (
    <div className="p-3 rounded-lg border border-border bg-card/50 flex items-center gap-3">
      <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${methodColors[method]}`}>
        {method}
      </span>
      <code className="text-sm flex-1 text-muted-foreground">{path}</code>
      <span className="text-xs text-muted-foreground hidden md:block">{description}</span>
    </div>
  )
}
