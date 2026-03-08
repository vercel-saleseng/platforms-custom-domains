"use client"

import { useState, useRef, useEffect } from "react"
import { ArrowUp, Lightbulb } from "lucide-react"
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
    <div className="flex flex-col gap-5">
      <div className="relative flex items-end rounded-2xl border border-border/50 bg-card/50 transition-all duration-200 focus-within:border-primary/50 focus-within:bg-card focus-within:shadow-lg focus-within:shadow-primary/5 focus-glow">
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
          className="max-h-[200px] min-h-[56px] flex-1 resize-none bg-transparent px-5 py-4 text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none disabled:opacity-50"
        />
        <div className="p-2.5">
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="h-10 w-10 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
            aria-label="Generate site"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {prompt.length === 0 && (
        <div className="flex flex-col gap-3 animate-fade-up">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Example prompts
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((example, index) => (
              <button
                key={example}
                type="button"
                onClick={() => setPrompt(example)}
                disabled={disabled}
                className={`rounded-xl border border-border/50 bg-card/30 px-4 py-2 text-sm text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:bg-card hover:text-foreground hover:shadow-sm active:scale-[0.98] stagger-${index + 1}`}
              >
                {example.length > 45
                  ? example.substring(0, 45) + "..."
                  : example}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
