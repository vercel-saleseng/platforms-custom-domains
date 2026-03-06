"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Globe,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  RefreshCw,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SiteRecord } from "@/lib/types"

interface DnsRecord {
  type: string
  name: string
  value: string
  ttl: number
}

interface DomainResponse {
  success?: boolean
  domain?: string
  isCustomDomain?: boolean
  verified?: boolean
  verification?: { type: string; domain: string; value: string }[] | null
  dnsRecords?: DnsRecord[]
  error?: string
}

interface SiteSettingsProps {
  site: SiteRecord
  onSiteUpdated: () => void
}

export function SiteSettings({ site, onSiteUpdated }: SiteSettingsProps) {
  const [subdomain, setSubdomain] = useState("")
  const [customDomain, setCustomDomain] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Subdomain availability checking
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [availabilityStatus, setAvailabilityStatus] = useState<{
    available: boolean | null
    message?: string
  }>({ available: null })

  // Custom domain verification state
  const [pendingDomain, setPendingDomain] = useState<DomainResponse | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  const currentUrl = site.domain ? `https://${site.domain}` : site.previewUrl

  // Debounced subdomain availability check
  const checkAvailability = useCallback(
    async (value: string) => {
      if (!value || value.length < 2) {
        setAvailabilityStatus({ available: null })
        return
      }

      setIsCheckingAvailability(true)
      try {
        const params = new URLSearchParams({ subdomain: value })
        if (site.v0ProjectId) {
          params.set("projectId", site.v0ProjectId)
        }
        const response = await fetch(`/api/domains/check?${params}`)
        const data = await response.json()

        if (data.error && !data.available) {
          setAvailabilityStatus({
            available: false,
            message: data.error,
          })
        } else if (data.alreadyAssigned) {
          setAvailabilityStatus({
            available: true,
            message: "Already assigned to this site",
          })
        } else if (data.available) {
          setAvailabilityStatus({
            available: true,
            message: `${value}.vercel.zone is available`,
          })
        } else {
          setAvailabilityStatus({
            available: false,
            message: data.error || "Not available",
          })
        }
      } catch {
        setAvailabilityStatus({ available: null })
      } finally {
        setIsCheckingAvailability(false)
      }
    },
    [site.v0ProjectId]
  )

  // Debounce the availability check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (subdomain) {
        checkAvailability(subdomain)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [subdomain, checkAvailability])

  const handleSubdomainChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, "")
    setSubdomain(sanitized)
    setError(null)
    setSuccess(null)
    if (!sanitized) {
      setAvailabilityStatus({ available: null })
    }
  }

  const handleSubdomainSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subdomain.trim() || !site.v0ProjectId) return

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: site.id,
          projectId: site.v0ProjectId,
          subdomain: subdomain.trim(),
        }),
      })

      const data: DomainResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to assign domain")
      }

      setSuccess(`Domain assigned: ${data.domain}`)
      setSubdomain("")
      setAvailabilityStatus({ available: null })
      onSiteUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign domain")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCustomDomainSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customDomain.trim() || !site.v0ProjectId) return

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)
    setPendingDomain(null)

    try {
      const response = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: site.id,
          projectId: site.v0ProjectId,
          customDomain: customDomain.trim(),
        }),
      })

      const data: DomainResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to add domain")
      }

      if (data.isCustomDomain && !data.verified) {
        // Show DNS configuration UI
        setPendingDomain(data)
      } else {
        setSuccess(`Domain assigned: ${data.domain}`)
        setCustomDomain("")
        onSiteUpdated()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add domain")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyDomain = async () => {
    if (!pendingDomain?.domain) return

    setIsVerifying(true)
    setError(null)

    try {
      const response = await fetch("/api/domains/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: site.id,
          domain: pendingDomain.domain,
        }),
      })

      const data = await response.json()

      if (data.verified) {
        setSuccess(`Domain verified: ${pendingDomain.domain}`)
        setPendingDomain(null)
        setCustomDomain("")
        onSiteUpdated()
      } else {
        setError(data.error || "Domain not verified yet. Please check your DNS configuration.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed")
    } finally {
      setIsVerifying(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-6 md:py-12">
      <div className="flex flex-col gap-8">
        {/* Current Domain */}
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Domain Settings</h2>
            <p className="text-sm text-muted-foreground">
              Configure how people access your site
            </p>
          </div>

          {currentUrl && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">Current URL</p>
                <p className="text-sm text-muted-foreground truncate">{currentUrl}</p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <a href={currentUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          )}
        </div>

        {/* Feedback messages */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 p-3">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            <p className="text-sm text-green-500">{success}</p>
          </div>
        )}

        {/* Pending domain verification */}
        {pendingDomain && (
          <div className="flex flex-col gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-foreground">
                  DNS Configuration Required
                </p>
                <p className="text-sm text-muted-foreground">
                  Add the following DNS records to your domain provider to verify{" "}
                  <span className="font-mono text-foreground">{pendingDomain.domain}</span>
                </p>
              </div>
            </div>

            {/* DNS Records Table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Value</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pendingDomain.dnsRecords?.map((record, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 font-mono text-xs">{record.type}</td>
                      <td className="px-3 py-2 font-mono text-xs">{record.name}</td>
                      <td className="px-3 py-2 font-mono text-xs truncate max-w-[150px]">
                        {record.value}
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
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

            <div className="flex items-center gap-2">
              <Button
                onClick={handleVerifyDomain}
                disabled={isVerifying}
                className="flex-1 md:flex-none"
              >
                {isVerifying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Verify Domain
              </Button>
              <Button
                variant="outline"
                onClick={() => setPendingDomain(null)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Subdomain form */}
        {!pendingDomain && (
          <form onSubmit={handleSubdomainSubmit} className="flex flex-col gap-4">
            <div>
              <h3 className="text-base font-medium text-foreground">Choose a subdomain</h3>
              <p className="text-sm text-muted-foreground">
                Get a free subdomain on vercel.zone
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="subdomain" className="sr-only">
                Subdomain
              </Label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="subdomain"
                      type="text"
                      placeholder="my-awesome-site"
                      value={subdomain}
                      onChange={(e) => handleSubdomainChange(e.target.value)}
                      disabled={isSubmitting || !site.v0ProjectId}
                      className="pr-28 text-base md:text-sm"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      .vercel.zone
                    </span>
                  </div>
                  <Button
                    type="submit"
                    disabled={
                      !subdomain.trim() ||
                      isSubmitting ||
                      !site.v0ProjectId ||
                      availabilityStatus.available === false
                    }
                    className="h-11 md:h-10 shrink-0"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Assign"
                    )}
                  </Button>
                </div>

                {/* Availability status */}
                {subdomain && (
                  <div className="flex items-center gap-2 text-sm">
                    {isCheckingAvailability ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        <span className="text-muted-foreground">Checking availability...</span>
                      </>
                    ) : availabilityStatus.available === true ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-green-500">{availabilityStatus.message}</span>
                      </>
                    ) : availabilityStatus.available === false ? (
                      <>
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                        <span className="text-destructive">{availabilityStatus.message}</span>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </form>
        )}

        {/* Divider */}
        {!pendingDomain && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>
        )}

        {/* Custom domain form */}
        {!pendingDomain && (
          <form onSubmit={handleCustomDomainSubmit} className="flex flex-col gap-4">
            <div>
              <h3 className="text-base font-medium text-foreground">Use a custom domain</h3>
              <p className="text-sm text-muted-foreground">
                Connect your own domain (requires DNS configuration)
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="customDomain" className="sr-only">
                Custom Domain
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="customDomain"
                  type="text"
                  placeholder="www.yoursite.com"
                  value={customDomain}
                  onChange={(e) => {
                    setCustomDomain(e.target.value)
                    setError(null)
                    setSuccess(null)
                  }}
                  disabled={isSubmitting || !site.v0ProjectId}
                  className="flex-1 text-base md:text-sm"
                />
                <Button
                  type="submit"
                  disabled={!customDomain.trim() || isSubmitting || !site.v0ProjectId}
                  className="h-11 md:h-10 shrink-0"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Add"
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}

        {!site.v0ProjectId && (
          <p className="text-sm text-muted-foreground text-center">
            Complete the site generation to configure domain settings.
          </p>
        )}
      </div>
    </div>
  )
}
