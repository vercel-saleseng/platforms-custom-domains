"use client"

import { useCallback, useRef, useState } from "react"
import { ImagePlus, X, Upload, Loader2, Images } from "lucide-react"

interface ImageUploaderProps {
  images: string[]
  onImagesChange: (images: string[]) => void
  disabled?: boolean
}

export function ImageUploader({
  images,
  onImagesChange,
  disabled,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const imageFiles = Array.from(files).filter((f) =>
        f.type.startsWith("image/")
      )
      if (imageFiles.length === 0) return

      setIsUploading(true)
      try {
        const formData = new FormData()
        imageFiles.forEach((file) => formData.append("files", file))

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) throw new Error("Upload failed")

        const data = await response.json()
        onImagesChange([...images, ...data.urls])
      } catch (error) {
        console.error("Upload error:", error)
      } finally {
        setIsUploading(false)
      }
    },
    [images, onImagesChange]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) setIsDragging(true)
    },
    [disabled]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (!disabled && e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files)
      }
    },
    [disabled, uploadFiles]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        uploadFiles(e.target.files)
      }
    },
    [uploadFiles]
  )

  const removeImage = useCallback(
    (index: number) => {
      const newImages = images.filter((_, i) => i !== index)
      onImagesChange(newImages)
    },
    [images, onImagesChange]
  )

  if (images.length > 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-3 md:grid-cols-5">
          {images.map((url, index) => (
            <div
              key={url}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm transition-all duration-200 hover:border-border hover:shadow-md animate-scale-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <img
                src={url}
                alt={`Upload ${index + 1}`}
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  aria-label={`Remove image ${index + 1}`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/90 text-destructive-foreground shadow-lg">
                    <X className="h-4 w-4" />
                  </div>
                </button>
              )}
            </div>
          ))}
          {!disabled && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-border/50 text-muted-foreground transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 hover:text-primary active:scale-95"
              aria-label="Add more images"
            >
              {isUploading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <ImagePlus className="h-6 w-6" />
              )}
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    )
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-8 transition-all duration-200 md:p-10 ${
        isDragging
          ? "border-primary bg-primary/5 scale-[1.01]"
          : "border-border/50 hover:border-primary/30 hover:bg-card/50"
      } ${disabled ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
      onClick={() => !disabled && fileInputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          fileInputRef.current?.click()
        }
      }}
      aria-label="Upload images"
    >
      <div className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-200 ${
        isDragging 
          ? "bg-primary/10 text-primary scale-110" 
          : "bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
      }`}>
        {isUploading ? (
          <Loader2 className="h-8 w-8 animate-spin" />
        ) : (
          <Images className="h-8 w-8" />
        )}
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-base font-medium text-foreground">
          {isUploading ? "Uploading your images..." : "Drop images here or click to browse"}
        </p>
        <p className="text-sm text-muted-foreground">
          JPG, PNG, WebP supported - Upload multiple images
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}
