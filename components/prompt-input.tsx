"use client"

import { useState, useRef, useEffect } from "react"
import { ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PromptInputProps {
  onSubmit: (prompt: string) => void
  disabled?: boolean
  hasImages: boolean
  initialValue?: string
}

const EXAMPLE_PROMPTS = [
  "Create a modern portfolio site showcasing my photography work",
  "Build a restaurant landing page with menu and reservation section",
  "Design a sleek product launch page for a new tech gadget",
  "Make an elegant personal blog with featured posts and about section",
]

export function PromptInput({
  onSubmit,
  disabled,
  hasImages,
  initialValue = "",
}: PromptInputProps) {
  const [prompt, setPrompt] = useState(initialValue)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [prompt])

  const handleSubmit = () => {
    if (!prompt.trim() || disabled || !hasImages) return
    onSubmit(prompt.trim())
    setPrompt("")
  }

  const canSubmit = prompt.trim().length > 0 && hasImages && !disabled

  return (
    <div className="flex flex-col gap-4">
      <div className="relative flex items-end rounded-xl border border-border bg-secondary/50 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            }
          }}
          placeholder={
            hasImages
              ? "Describe the site you want to create..."
              : "Upload images first, then describe your site..."
          }
          disabled={disabled}
          rows={1}
          className="max-h-[200px] min-h-[52px] flex-1 resize-none bg-transparent px-4 py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 md:text-sm"
        />
        <div className="p-2">
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="h-10 w-10 rounded-lg md:h-8 md:w-8"
            aria-label="Generate site"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!hasImages && prompt.length === 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            Try a prompt:
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setPrompt(example)}
                disabled={disabled}
                className="rounded-lg border border-border bg-secondary/30 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              >
                {example.length > 50
                  ? example.substring(0, 50) + "..."
                  : example}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
