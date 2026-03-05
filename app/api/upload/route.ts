import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    const urls: string[] = []

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        continue
      }

      const blob = await put(`sites/${Date.now()}-${file.name}`, file, {
        access: "public",
      })
      urls.push(blob.url)
    }

    if (urls.length === 0) {
      return NextResponse.json(
        { error: "No valid image files provided" },
        { status: 400 }
      )
    }

    return NextResponse.json({ urls })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
