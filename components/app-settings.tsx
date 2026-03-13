"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { mutate } from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Save,
  Trash2,
} from "lucide-react"
import type { AppRecord } from "@/lib/types"

interface AppSettingsProps {
  app: AppRecord
  onAppUpdated: () => void
}

export function AppSettings({ app, onAppUpdated }: AppSettingsProps) {
  const [name, setName] = useState(app.name || "")
  const [description, setDescription] = useState(app.description || "")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  
  const router = useRouter()

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    
    try {
      const res = await fetch(`/api/apps/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: name.trim() || undefined,
          description: description.trim() || undefined,
        }),
      })
      
      if (!res.ok) throw new Error("Failed to save")
      
      setSuccessMessage("Settings saved successfully")
      setTimeout(() => setSuccessMessage(null), 3000)
      onAppUpdated()
    } catch {
      setError("Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)
    
    try {
      const res = await fetch(`/api/apps/${app.id}`, {
        method: "DELETE",
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete app")
      }
      
      mutate("/api/apps")
      router.push("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete app")
      setIsDeleting(false)
    }
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const getAppUrl = () => {
    if (app.customDomain && app.customDomainVerified) {
      return `https://${app.customDomain}`
    }
    if (app.previewUrl) {
      return app.previewUrl
    }
    if (app.subdomain) {
      return `https://${app.subdomain}.vercel.zone`
    }
    return null
  }

  const appUrl = getAppUrl()

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 md:px-8 md:py-10 animate-fade-up">
      <div className="flex flex-col gap-6">
        {error && (
          <Alert variant="destructive" className="border-destructive/30 bg-destructive/5 animate-scale-in">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {successMessage && (
          <Alert className="border-success/30 bg-success/5 animate-scale-in">
            <Check className="h-4 w-4 text-success" />
            <AlertDescription className="text-success">{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* App Details Card */}
        <Card className="border-border/50 bg-card/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Save className="h-4 w-4 text-primary" />
              </div>
              App Details
            </CardTitle>
            <CardDescription>Configure your app name and description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My App"
                className="bg-background/50 border-border/50 focus:border-primary/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of your app"
                className="bg-background/50 border-border/50 focus:border-primary/50"
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Domain Info Card */}
        {(appUrl || app.subdomain) && (
          <Card className="border-border/50 bg-card/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
                  <Globe className="h-4 w-4 text-success" />
                </div>
                Domain
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">URL</span>
                {app.status === "deployed" && (
                  <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    Live
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-muted/50 border border-border/50 px-4 py-2.5 text-sm font-mono truncate">
                  {appUrl || `${app.subdomain}.vercel.zone`}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(appUrl || `https://${app.subdomain}.vercel.zone`, "url")}
                  className="h-10 w-10 shrink-0 border-border/50 hover:bg-muted"
                >
                  {copiedField === "url" ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                {appUrl && (
                  <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 border-border/50 hover:bg-muted" asChild>
                    <a href={appUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* v0 Project Info */}
        {app.v0ChatId && (
          <Card className="border-border/50 bg-card/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">v0 Project</CardTitle>
              <CardDescription>View and edit your app in v0</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <a
                  href={`https://v0.dev/chat/${app.v0ChatId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in v0
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Danger Zone */}
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              Danger Zone
            </CardTitle>
            <CardDescription>Permanently delete this app and all its data</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting}>
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete App
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your app,
                    including its deployment and custom domain.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
