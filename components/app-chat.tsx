"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Loader2, Sparkles, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
// Note: @v0-sdk/react is available but we use simple rendering for reliability
import type { AppRecord } from "@/lib/types"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface AppChatProps {
  app: AppRecord
  onAppUpdated: () => void
}

const EXAMPLE_PROMPTS = [
  "Build a dashboard for tracking sales metrics with charts and KPIs",
  "Create a simple todo app with categories and due dates",
  "Make a landing page for a SaaS product with pricing section",
  "Build a contact form with validation and a thank you message",
]

export function AppChat({ app, onAppUpdated }: AppChatProps) {
  console.log("[v0] AppChat rendered, app.id:", app.id, "v0ChatId:", app.v0ChatId)
  
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pendingIntegration, setPendingIntegration] = useState<{ type: string; name: string } | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  // Load chat history on mount
  useEffect(() => {
    if (app.v0ChatId) {
      loadChatHistory()
    }
  }, [app.v0ChatId])

  const loadChatHistory = async () => {
    try {
      const res = await fetch(`/api/apps/${app.id}/chat`)
      const data = await res.json()
      
      if (data.messages && data.messages.length > 0) {
        const formattedMessages: ChatMessage[] = data.messages.map((msg: { id: string; role: string; content: string; createdAt: string }) => ({
          id: msg.id || `msg_${Date.now()}_${Math.random()}`,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          timestamp: new Date(msg.createdAt || Date.now()),
        }))
        setMessages(formattedMessages)
      }
    } catch (err) {
      console.error("Failed to load chat history:", err)
    }
  }

  const sendMessage = useCallback(async () => {
    console.log("[v0] sendMessage called, input:", input.slice(0, 50), "isLoading:", isLoading)
    if (!input.trim() || isLoading) {
      console.log("[v0] sendMessage aborted - empty input or loading")
      return
    }

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setIsStreaming(true)
    setStreamingContent("")
    setError(null)
    setPendingIntegration(null)

    try {
      console.log("[v0] Sending message to API:", userMessage.content.slice(0, 50))
      
      const res = await fetch(`/api/apps/${app.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content }),
      })

      console.log("[v0] Response status:", res.status, res.statusText)
      console.log("[v0] Response headers:", Object.fromEntries(res.headers.entries()))

      if (!res.ok) {
        const errorText = await res.text()
        console.log("[v0] Error response:", errorText)
        throw new Error(`Failed to send message: ${res.status} ${errorText}`)
      }

      // Check if it's a streaming response
      const contentType = res.headers.get("content-type")
      
      console.log("[v0] Content-Type:", contentType)
      
      if (contentType?.includes("text/event-stream")) {
        console.log("[v0] Handling SSE stream...")
        // Handle SSE stream
        const reader = res.body?.getReader()
        const decoder = new TextDecoder()
        let fullContent = ""

        if (reader) {
          console.log("[v0] Reader obtained, starting to read...")
          let chunkCount = 0
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              console.log("[v0] Stream done, total chunks:", chunkCount)
              break
            }

            chunkCount++
            const chunk = decoder.decode(value, { stream: true })
            console.log("[v0] Chunk #" + chunkCount + ":", chunk.slice(0, 200))
            const lines = chunk.split("\n")

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6).trim()
                if (data === "[DONE]") {
                  continue
                }
                
                try {
                  const event = JSON.parse(data)
                  
                  // Debug: log all events to understand structure
                  console.log("[v0] Event received:", JSON.stringify(event).slice(0, 300))
                  
                  // v0-sdk streaming uses event.event === 'message' with event.data
                  if (event.event === "message" && event.data) {
                    // Append the chunk to full content for the streaming display
                    fullContent += event.data
                    setStreamingContent(fullContent)
                  } else if (event.type === "message" && event.data) {
                    // Alternative format
                    fullContent += event.data
                    setStreamingContent(fullContent)
                  } else if (event.event === "integration_required" || event.type === "integration_request") {
                    // v0 is waiting for an integration to be set up
                    const integrationName = event.name || event.integration || event.data?.name || "Database"
                    setPendingIntegration({ type: "database", name: integrationName })
                  } else if (event.event === "error" || event.type === "error") {
                    setError(event.message || event.data?.message || "An error occurred")
                  } else if (event.content && typeof event.content === "string") {
                    // Fallback: some events may have content directly
                    fullContent = event.content
                    setStreamingContent(fullContent)
                  } else if (event.text && typeof event.text === "string") {
                    // Another fallback format
                    fullContent += event.text
                    setStreamingContent(fullContent)
                  }
                } catch (parseErr) {
                  console.log("[v0] Parse error:", parseErr, "for data:", data.slice(0, 100))
                }
              }
            }
          }
        }

        // Add assistant message from stream only if we have content
        if (fullContent && fullContent.trim().length > 0) {
          const assistantMessage: ChatMessage = {
            id: `assistant_${Date.now()}`,
            role: "assistant",
            content: fullContent,
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, assistantMessage])
        } else if (!pendingIntegration) {
          // If no content streamed and no pending integration, try to load chat history
          await loadChatHistory()
        }
      } else {
        // Handle JSON response
        const data = await res.json()
        if (data.success) {
          // Refresh to get updated state
          onAppUpdated()
        }
      }

      // Trigger update to refresh app state
      onAppUpdated()
      
    } catch (err) {
      console.error("Chat error:", err)
      setError(err instanceof Error ? err.message : "Failed to send message")
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
      setStreamingContent("")
    }
  }, [input, isLoading, app.id, onAppUpdated, pendingIntegration])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleExampleClick = (prompt: string) => {
    setInput(prompt)
    textareaRef.current?.focus()
  }

  const isFirstMessage = !app.v0ChatId && messages.length === 0

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && !isStreaming ? (
          // Empty state with examples
          <div className="flex h-full flex-col items-center justify-center p-6 md:p-8">
            <div className="max-w-lg w-full space-y-8 animate-fade-up">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  {isFirstMessage ? "What would you like to build?" : "Continue building"}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground text-pretty">
                  {isFirstMessage 
                    ? "Describe your app and I'll create it for you. Be specific about features, layout, and functionality."
                    : "Send a message to make changes to your app."}
                </p>
              </div>

              {isFirstMessage && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">
                    Try an example
                  </p>
                  <div className="grid gap-2">
                    {EXAMPLE_PROMPTS.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleExampleClick(prompt)}
                        className="w-full text-left p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card hover:border-border transition-all text-sm text-muted-foreground hover:text-foreground"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Message list
          <div className="p-4 md:p-6 space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "user" ? (
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-primary text-primary-foreground">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                ) : (
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-muted/50 border border-border/50">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                )}
              </div>
            ))}
            
            {/* Streaming message */}
            {isStreaming && streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-muted/50 border border-border/50">
                  <p className="text-sm whitespace-pre-wrap">{streamingContent}</p>
                </div>
              </div>
            )}
            
            {/* Loading indicator with workflow status */}
            {isLoading && !streamingContent && !pendingIntegration && (
              <div className="flex justify-start">
                <div className="flex flex-col gap-3 rounded-2xl px-4 py-3 bg-muted/50 border border-border/50 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {app.status === "building" ? (
                        <>Building your app...</>
                      ) : app.status === "iterating" ? (
                        <>Processing changes...</>
                      ) : (
                        <>Thinking...</>
                      )}
                    </span>
                  </div>
                  {app.status === "building" && app.currentStep > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Step {app.currentStep} of 5
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Pending integration request UI */}
            {pendingIntegration && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-4 bg-muted/50 border border-border/50 space-y-3 max-w-md">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                        <path d="M2 17l10 5 10-5"/>
                        <path d="M2 12l10 5 10-5"/>
                      </svg>
                    </div>
                    <span className="font-medium text-foreground">{pendingIntegration.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    v0 wants to set up a database for this app. You can set it up in the v0 chat directly or skip it for now.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPendingIntegration(null)
                        // Open v0 chat in new tab
                        if (app.v0ChatId) {
                          window.open(`https://v0.dev/chat/${app.v0ChatId}`, "_blank")
                        }
                      }}
                    >
                      Open in v0
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPendingIntegration(null)
                        setIsLoading(false)
                        setIsStreaming(false)
                      }}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error alert */}
      {error && (
        <div className="px-4 md:px-6 pb-2">
          <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-border/50 p-4 md:p-6 bg-background/50">
        <div className="flex gap-3">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isFirstMessage ? "Describe what you want to build..." : "Describe the changes you want..."}
            className="min-h-[80px] max-h-[200px] resize-none bg-background/50 border-border/50 focus:border-primary/50"
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[80px] w-14 shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
