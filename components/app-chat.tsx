"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Loader2, Sparkles, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
// StreamingMessage removed - we consume stream and reload instead
import type { AppRecord } from "@/lib/types"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string // Raw text for display
  createdAt: string
  isStreaming?: boolean
  stream?: ReadableStream<Uint8Array> | null
}

interface AppChatProps {
  app: AppRecord
  onAppUpdated: () => void
}



const EXAMPLE_PROMPTS = [
  "Build a dashboard for tracking sales metrics",
  "Create a todo app with categories and due dates",
  "Make a customer feedback form with ratings",
  "Build a simple inventory management tool",
]

// Helper to extract plain text from v0 message content
function extractTextFromContent(content: unknown): string {
  if (typeof content === "string") return content
  
  // Handle {"version":1,"parts":[...]} format
  if (content && typeof content === "object") {
    const obj = content as Record<string, unknown>
    
    // Check for parts array
    const parts = obj.parts || (Array.isArray(content) ? content : null)
    if (Array.isArray(parts)) {
      const texts: string[] = []
      for (const part of parts) {
        if (typeof part === "object" && part !== null) {
          const p = part as Record<string, unknown>
          // mdx type parts have content
          if (p.type === "mdx" && typeof p.content === "string") {
            texts.push(p.content)
          }
        }
      }
      if (texts.length > 0) return texts.join("\n\n")
    }
  }
  
  return ""
}

export function AppChat({ app, onAppUpdated }: AppChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(!!app.v0ChatId) // Start loading if chat exists
  const [error, setError] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const streamingStartedRef = useRef(false)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Reset streaming flag when loading starts
  useEffect(() => {
    if (isLoading) {
      streamingStartedRef.current = false
    }
  }, [isLoading])

  // Load chat history on mount
  useEffect(() => {
    if (app.v0ChatId) {
      loadChatHistory()
    } else {
      setIsLoadingHistory(false)
    }
  }, [app.v0ChatId])

  const loadChatHistory = async () => {
    try {
      setIsLoadingHistory(true)
      const res = await fetch(`/api/apps/${app.id}/chat`)
      if (!res.ok) {
        setIsLoadingHistory(false)
        return
      }
      
      const data = await res.json()
      if (data.messages?.length > 0) {
        const formattedMessages: ChatMessage[] = data.messages.map(
          (msg: { id: string; role: string; content: string; createdAt: string }) => {
            // Content from v0.chats.findMessages() is a JSON string
            const parsed = JSON.parse(msg.content)
            const text = extractTextFromContent(parsed)
            
            return {
              id: msg.id,
              role: msg.role as "user" | "assistant",
              content: text || "[Message content]",
              createdAt: msg.createdAt,
            }
          }
        )
        setMessages(formattedMessages)
      }
    } catch (err) {
      console.error("Failed to load chat history:", err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const messageText = input.trim()

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: messageText,
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/apps/${app.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `Request failed: ${res.status}`)
      }

      const contentType = res.headers.get("content-type")

      if (contentType?.includes("application/octet-stream") && res.body) {
        // We got a stream - add streaming indicator
        const streamingMessage: ChatMessage = {
          id: `assistant_${Date.now()}`,
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
          isStreaming: true,
        }
        setMessages((prev) => [...prev, streamingMessage])
        
        // Consume the stream in background
        const reader = res.body.getReader()
        try {
          while (true) {
            const { done } = await reader.read()
            if (done) break
          }
        } catch (e) {
          console.error("Stream error:", e)
        }
        
        // Stream complete - reload messages
        setIsLoading(false)
        await loadChatHistory()
        onAppUpdated()
      } else {
        // JSON response - reload chat history
        setIsLoading(false)
        await loadChatHistory()
        onAppUpdated()
      }
    } catch (err) {
      console.error("Chat error:", err)
      setError(err instanceof Error ? err.message : "Failed to send message")
      setIsLoading(false)
    }
  }, [input, isLoading, app.id, onAppUpdated])



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
        {isLoadingHistory ? (
          // Loading chat history
          <div className="flex h-full flex-col items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Loading conversation...</p>
          </div>
        ) : messages.length === 0 && !isLoading ? (
          // Empty state with examples
          <div className="flex h-full flex-col items-center justify-center p-6 md:p-8">
            <div className="max-w-lg w-full space-y-8">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  What would you like to build?
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Describe your app and I&apos;ll create it for you.
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
                ) : message.isStreaming ? (
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-muted/50 border border-border/50">
                    <TypingIndicator />
                  </div>
                ) : (
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-muted/50 border border-border/50">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator when waiting for stream to start */}
            {isLoading && !messages.some((m) => m.isStreaming) && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-3 bg-muted/50 border border-border/50">
                  <TypingIndicator />
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                  <span>{error}</span>
                  {app.v0ChatId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 text-destructive hover:text-destructive"
                      onClick={() => window.open(`https://v0.dev/chat/${app.v0ChatId}`, "_blank")}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border/50 p-4 md:p-6 bg-background/50">
        <div className="flex gap-3">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isFirstMessage ? "Describe what you want to build..." : "Describe the changes you want..."}
            className="min-h-[80px] max-h-[200px] resize-none"
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

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span className="text-sm">Thinking...</span>
    </div>
  )
}
