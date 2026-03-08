"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { mutate } from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  RefreshCw,
  Rocket,
  Save,
  Trash2,
  X,
} from "lucide-react"
import type { SiteRecord } from "@/lib/types"

interface SiteSettingsProps {
  site: SiteRecord
  onSiteUpdated: () => void
}

export function SiteSettings({ site, onSiteUpdated }: SiteSettingsProps) {
  const [name, setName] = useState(site.name)
  const [isSavingName, setIsSavingName] = useState(false)
  
  // Subdomain state - initialize with saved subdomain
  const [subdomain, setSubdomain] = useState(site.subdomain || "")
  const [subdomainStatus, setSubdomainStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle")
  const [isAssigningSubdomain, setIsAssigningSubdomain] = useState(false)
  
  // Custom domain state - initialize with existing custom domain if set
  const [customDomain, setCustomDomain] = useState(site.customDomain || "")
  const [isAddingCustomDomain, setIsAddingCustomDomain] = useState(false)
  const [customDomainResult, setCustomDomainResult] = useState<{
    success: boolean
    verified: boolean
    dnsRecords?: Array<{ type: string; name: string; value: string }>
    error?: string
  } | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isRemovingCustomDomain, setIsRemovingCustomDomain] = useState(false)
  const [isFetchingDnsInfo, setIsFetchingDnsInfo] = useState(false)
  
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const router = useRouter()
  const hasVercelProject = !!site.vercelProjectId
  const isGenerating = site.status !== "complete" && site.status !== "error" && site.status !== "draft"

  // Fetch DNS info for existing unverified custom domain
  useEffect(() => {
    if (site.customDomain && !site.customDomainVerified && !customDomainResult) {
      setIsFetchingDnsInfo(true)
      fetch(`/api/domains/info?siteId=${site.id}&domain=${encodeURIComponent(site.customDomain)}`)
        .then(res => res.json())
        .then(data => {
          if (data.dnsRecords) {
            setCustomDomainResult({
              success: true,
              verified: data.verified || false,
              dnsRecords: data.dnsRecords,
            })
          }
        })
        .catch(() => {
          // Fallback to default DNS records if fetch fails
          setCustomDomainResult({
            success: true,
            verified: false,
            dnsRecords: [
              { type: "A", name: "@", value: "76.76.21.21" },
              { type: "CNAME", name: "www", value: "cname.vercel-dns.com" },
            ],
          })
        })
        .finally(() => setIsFetchingDnsInfo(false))
    }
  }, [site.customDomain, site.customDomainVerified, site.id, customDomainResult])

  // Debounced subdomain availability check
  useEffect(() => {
    if (!subdomain || !hasVercelProject) {
      setSubdomainStatus("idle")
      return
    }

    // Validate format first
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/
    if (!subdomainRegex.test(subdomain)) {
      setSubdomainStatus("invalid")
      return
    }

    setSubdomainStatus("checking")
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/domains/check?subdomain=${encodeURIComponent(subdomain)}&projectId=${site.vercelProjectId}`
        )
        const data = await res.json()
        
        if (data.available) {
          setSubdomainStatus("available")
        } else {
          setSubdomainStatus("taken")
        }
      } catch {
        setSubdomainStatus("idle")
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [subdomain, hasVercelProject, site.vercelProjectId])

  const handleSaveName = async () => {
    if (!name.trim() || name === site.name) return
    
    setIsSavingName(true)
    setError(null)
    
    try {
      const res = await fetch(`/api/sites/${site.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      
      if (!res.ok) throw new Error("Failed to save name")
      
      setSuccessMessage("Name updated successfully")
      setTimeout(() => setSuccessMessage(null), 3000)
      onSiteUpdated()
    } catch {
      setError("Failed to save name")
    } finally {
      setIsSavingName(false)
    }
  }

  const handleAssignSubdomain = async () => {
    if (!subdomain || subdomainStatus !== "available") return
    
    setIsAssigningSubdomain(true)
    setError(null)
    
    try {
      const res = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: site.id,
          subdomain,
        }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to assign subdomain")
      }
      
      setSuccessMessage(`Domain ${data.domain} assigned successfully!`)
      setSubdomain("")
      setSubdomainStatus("idle")
      onSiteUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign subdomain")
    } finally {
      setIsAssigningSubdomain(false)
    }
  }

  const handleAddCustomDomain = async () => {
    if (!customDomain) return
    
    setIsAddingCustomDomain(true)
    setError(null)
    setCustomDomainResult(null)
    
    try {
      const res = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: site.id,
          customDomain,
        }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to add domain")
      }
      
      setCustomDomainResult({
        success: true,
        verified: data.verified,
        dnsRecords: data.dnsRecords,
      })
      
      if (data.verified) {
        setSuccessMessage(`Domain ${data.domain} added and verified!`)
        setCustomDomain("")
        onSiteUpdated()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add domain")
    } finally {
      setIsAddingCustomDomain(false)
    }
  }

  const handleVerifyDomain = async () => {
    const domainToVerify = site.customDomain || customDomain
    if (!domainToVerify) return
    
    setIsVerifying(true)
    setError(null)
    
    try {
      const res = await fetch("/api/domains/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: site.id,
          domain: domainToVerify,
        }),
      })
      
      const data = await res.json()
      
      if (data.verified) {
        setSuccessMessage("Domain verified successfully!")
        setCustomDomainResult(null)
        onSiteUpdated()
      } else {
        setError("Domain not yet verified. Please check your DNS settings.")
      }
    } catch {
      setError("Failed to verify domain")
    } finally {
      setIsVerifying(false)
    }
  }

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
  }, [])

  const handleRemoveCustomDomain = async () => {
    if (!site.customDomain) return
    
    setIsRemovingCustomDomain(true)
    setError(null)
    
    try {
      const res = await fetch(
        `/api/domains?siteId=${site.id}&domain=${encodeURIComponent(site.customDomain)}`,
        { method: "DELETE" }
      )
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to remove domain")
      }
      
      setSuccessMessage("Custom domain removed successfully")
      setCustomDomainResult(null)
      onSiteUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove domain")
    } finally {
      setIsRemovingCustomDomain(false)
    }
  }

  const handleDeleteSite = async () => {
    setIsDeleting(true)
    setError(null)
    
    try {
      const res = await fetch(`/api/sites/${site.id}`, {
        method: "DELETE",
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete site")
      }
      
      // Invalidate the sites cache
      mutate("/api/sites")
      
      // Redirect to home
      router.push("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete site")
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {successMessage && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <Check className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-500">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Site Name Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Site Name</CardTitle>
          <CardDescription>Change the display name for your site</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Site name"
              className="flex-1"
            />
            <Button
              onClick={handleSaveName}
              disabled={isSavingName || !name.trim() || name === site.name}
            >
              {isSavingName ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Domains Card */}
      {(site.subdomain || site.customDomain) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Active Domains
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Subdomain */}
            {site.subdomain && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Subdomain</span>
                  <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-500">
                    Active
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <code className="flex-1 rounded bg-muted px-3 py-2 text-sm">
                    {site.subdomain}.vercel.zone
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(`https://${site.subdomain}.vercel.zone`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <a href={`https://${site.subdomain}.vercel.zone`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            )}
            
            {/* Custom Domain */}
            {site.customDomain && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Custom Domain</span>
                  {site.customDomainVerified ? (
                    <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-500">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-500">
                      <AlertCircle className="h-3 w-3" />
                      Pending Verification
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <code className="flex-1 rounded bg-muted px-3 py-2 text-sm">
                    {site.customDomain}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(`https://${site.customDomain}`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <a href={`https://${site.customDomain}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRemoveCustomDomain}
                    disabled={isRemovingCustomDomain}
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    {isRemovingCustomDomain ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Domain Configuration */}
      {!hasVercelProject ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Custom Domain</CardTitle>
            <CardDescription>
              {isGenerating 
                ? "Domain settings will be available after your site finishes generating."
                : "Deploy your site to Vercel to enable custom domains."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {isGenerating ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating site...</span>
                </div>
              ) : site.v0ProjectId && site.v0ChatId ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span>Your site is using the v0 preview URL</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This site was created before Vercel integration was configured.
                    Please regenerate the site to enable custom domains.
                  </p>
                  <Button asChild variant="outline" className="w-full sm:w-auto">
                    <a
                      href={`https://v0.dev/chat/${site.v0ChatId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View in v0
                    </a>
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span>Site generation incomplete. Please regenerate the site.</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Custom Domain</CardTitle>
            <CardDescription>
              Choose a free subdomain or connect your own domain
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="subdomain" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="subdomain">Subdomain</TabsTrigger>
                <TabsTrigger value="custom">Custom Domain</TabsTrigger>
              </TabsList>
              
              <TabsContent value="subdomain" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Choose a subdomain</Label>
                  <p className="text-sm text-muted-foreground">
                    Get a free subdomain on vercel.zone
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
                      placeholder="my-site"
                      className="pr-24"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      .vercel.zone
                    </span>
                  </div>
                  <Button
                    onClick={handleAssignSubdomain}
                    disabled={
                      !subdomain ||
                      subdomainStatus !== "available" ||
                      isAssigningSubdomain
                    }
                  >
                    {isAssigningSubdomain ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Assign"
                    )}
                  </Button>
                </div>
                
                {subdomain && (
                  <div className="flex items-center gap-2 text-sm">
                    {subdomainStatus === "checking" && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="text-muted-foreground">Checking availability...</span>
                      </>
                    )}
                    {subdomainStatus === "available" && (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-green-500">{subdomain}.vercel.zone is available</span>
                      </>
                    )}
                    {subdomainStatus === "taken" && (
                      <>
                        <X className="h-4 w-4 text-red-500" />
                        <span className="text-red-500">This subdomain is taken</span>
                      </>
                    )}
                    {subdomainStatus === "invalid" && (
                      <>
                        <X className="h-4 w-4 text-red-500" />
                        <span className="text-red-500">Invalid format. Use lowercase letters, numbers, and hyphens.</span>
                      </>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="custom" className="mt-4 space-y-4">
                {/* Show existing custom domain status or add new form */}
                {site.customDomain && !site.customDomainVerified ? (
                  <div className="space-y-2">
                    <Label>Configure DNS for {site.customDomain}</Label>
                    <p className="text-sm text-muted-foreground">
                      Add these DNS records at your domain registrar to verify ownership
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Add a custom domain</Label>
                      <p className="text-sm text-muted-foreground">
                        Connect your own domain to this site
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Input
                        value={customDomain}
                        onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
                        placeholder="example.com"
                        className="flex-1"
                        disabled={!!site.customDomain}
                      />
                      <Button
                        onClick={handleAddCustomDomain}
                        disabled={!customDomain || isAddingCustomDomain || !!site.customDomain}
                      >
                        {isAddingCustomDomain ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Add"
                        )}
                      </Button>
                    </div>
                  </>
                )}
                
                {/* DNS Configuration - show for unverified existing domain OR new domain result */}
                {isFetchingDnsInfo && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading DNS configuration...</span>
                  </div>
                )}
                
                {customDomainResult && !customDomainResult.verified && customDomainResult.dnsRecords && (
                  <div className="mt-4 space-y-4 rounded-lg border border-border p-4">
                    <div className="space-y-1">
                      <h4 className="font-medium">Configure DNS</h4>
                      <p className="text-sm text-muted-foreground">
                        Add the following DNS records to your domain provider
                      </p>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="pb-2 pr-4 text-left font-medium">Type</th>
                            <th className="pb-2 pr-4 text-left font-medium">Name</th>
                            <th className="pb-2 pr-4 text-left font-medium">Value</th>
                            <th className="pb-2 text-left font-medium"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {customDomainResult.dnsRecords.map((record, i) => (
                            <tr key={i} className="border-b border-border last:border-0">
                              <td className="py-2 pr-4">
                                <code className="rounded bg-muted px-1.5 py-0.5">
                                  {record.type}
                                </code>
                              </td>
                              <td className="py-2 pr-4 font-mono text-xs">
                                {record.name}
                              </td>
                              <td className="py-2 pr-4 font-mono text-xs">
                                {record.value}
                              </td>
                              <td className="py-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => copyToClipboard(record.value)}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <Button
                      onClick={handleVerifyDomain}
                      disabled={isVerifying}
                      className="w-full"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Verify Domain
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Site Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Site Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Site ID</dt>
              <dd className="font-mono">{site.id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="capitalize">{site.status}</dd>
            </div>
            {site.v0ProjectId && (
              <div>
                <dt className="text-muted-foreground">v0 Project ID</dt>
                <dd className="font-mono text-xs">{site.v0ProjectId}</dd>
              </div>
            )}
            {site.vercelProjectId && (
              <div>
                <dt className="text-muted-foreground">Vercel Project ID</dt>
                <dd className="font-mono text-xs">{site.vercelProjectId}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd>{new Date(site.createdAt).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Updated</dt>
              <dd>{new Date(site.updatedAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that will permanently affect your site.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium">Delete this site</p>
              <p className="text-sm text-muted-foreground">
                Once deleted, all data associated with this site will be permanently removed.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting}>
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Site
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the site
                    <span className="font-medium"> {site.name}</span> and remove all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteSite}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Site
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
