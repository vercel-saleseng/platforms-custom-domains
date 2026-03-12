"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Loader2, Sparkles, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Message, StreamingMessage } from "@v0-sdk/react"
import type { AppRecord } from "@/lib/types"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: unknown // MessageBinaryFormat for assistant, string for user
  createdAt: string
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

export function AppChat({ app, onAppUpdated }: AppChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [stream, setStream] = useState<ReadableStream<Uint8Array> | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, stream])

  // Load chat history on mount
  useEffect(() => {
    if (app.v0ChatId) {
      loadChatHistory()
    }
  }, [app.v0ChatId])

  const loadChatHistory = async () => {
    try {
      const res = await fetch(`/api/apps/${app.id}/chat`)
      if (!res.ok) return
      
      const data = await res.json()
      if (data.messages?.length > 0) {
        const formattedMessages: ChatMessage[] = data.messages.map((msg: {
          id: string
          role: string
          content: string
          createdAt: string
        }) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          // Parse content for assistant messages (MessageBinaryFormat)
          content: msg.role === "assistant" ? JSON.parse(msg.content) : msg.content,
          createdAt: msg.createdAt,
        }))
        setMessages(formattedMessages)
      }
    } catch (err) {
      console.error("Failed to load chat history:", err)
    }
  }

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: input.trim(),
      createdAt: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setError(null)
    setStream(null)

    try {
      const res = await fetch(`/api/apps/${app.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `Request failed: ${res.status}`)
      }

      const contentType = res.headers.get("content-type")
      
      if (contentType?.includes("application/octet-stream") && res.body) {
        // We got a stream - use StreamingMessage
        setStream(res.body)
      } else {
        // JSON response - reload chat history
        await loadChatHistory()
        onAppUpdated()
      }

    } catch (err) {
      console.error("Chat error:", err)
      setError(err instanceof Error ? err.message : "Failed to send message")
      setIsLoading(false)
    }
  }, [input, isLoading, app.id, onAppUpdated])

  const handleStreamComplete = useCallback((content: unknown) => {
    // Add completed message to the list
    const assistantMessage: ChatMessage = {
      id: `assistant_${Date.now()}`,
      role: "assistant",
      content,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, assistantMessage])
    setStream(null)
    setIsLoading(false)
    onAppUpdated()
  }, [onAppUpdated])

  const handleStreamError = useCallback((err: string) => {
    setError(err)
    setStream(null)
    setIsLoading(false)
  }, [])

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
        {messages.length === 0 && !stream ? (
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
                    <p className="text-sm whitespace-pre-wrap">{String(message.content)}</p>
                  </div>
                ) : (
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-muted/50 border border-border/50">
                    <Message
                      content={message.content}
                      messageId={message.id}
                      role="assistant"
                      components={{
                        p: { className: "mb-2 text-sm last:mb-0" },
                        h1: { className: "text-lg font-bold mb-2" },
                        h2: { className: "text-base font-semibold mb-2" },
                        code: { className: "bg-muted px-1.5 py-0.5 rounded text-xs font-mono" },
                        a: { className: "text-primary hover:underline" },
                        ul: { className: "list-disc list-inside space-y-1 mb-2 text-sm" },
                        ol: { className: "list-decimal list-inside space-y-1 mb-2 text-sm" },
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
            
            {/* Streaming message */}
            {stream && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-muted/50 border border-border/50">
                  <StreamingMessage
                    stream={stream}
                    messageId={`streaming-${Date.now()}`}
                    role="assistant"
                    showLoadingIndicator={true}
                    loadingComponent={<TypingIndicator />}
                    errorComponent={(err) => (
                      <div className="text-destructive text-sm">{err}</div>
                    )}
                    onComplete={handleStreamComplete}
                    onError={handleStreamError}
                    components={{
                      p: { className: "mb-2 text-sm last:mb-0" },
                      h1: { className: "text-lg font-bold mb-2" },
                      h2: { className: "text-base font-semibold mb-2" },
                      code: { className: "bg-muted px-1.5 py-0.5 rounded text-xs font-mono" },
                      a: { className: "text-primary hover:underline" },
                    }}
                  />
                </div>
              </div>
            )}
            
            {/* Loading indicator when waiting for stream */}
            {isLoading && !stream && (
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
