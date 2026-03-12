import { NextResponse } from "next/server"
import { start } from "workflow/api"
import { v0 } from "@/lib/v0-client"
import { getApp, updateApp, updateAppStatus, markPendingChanges } from "@/lib/apps-store"
import { appGenerationWorkflow } from "@/lib/workflows/app-generation"

// POST /api/apps/[id]/chat - Send a chat message
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const { message } = await request.json()
    
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    const app = await getApp(id)
    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 })
    }

    const isFirstMessage = !app.v0ChatId

    if (isFirstMessage) {
      // First message: create chat + trigger full build workflow
      console.log("[v0] Creating new chat for app:", id)
      await updateAppStatus(id, "building", 1)
      
      // Create chat with v0
      const chat = await v0.chats.create({
        message,
        responseMode: "experimental_stream",
      })
      console.log("[v0] Chat created:", chat.id, "hasStream:", !!chat.stream)

      // Update with chat ID
      await updateApp(id, {
        v0ChatId: chat.id,
      })

      // Start the durable workflow for deployment
      const run = await start(appGenerationWorkflow, [{ 
        appId: id, 
        message,
      }])

      await updateApp(id, {
        workflowRunId: run.runId,
      })

      // Return the raw stream for StreamingMessage component
      const stream = chat.stream
      console.log("[v0] Stream available:", !!stream, "type:", stream?.constructor?.name)
      
      if (!stream) {
        console.log("[v0] No stream, returning JSON response")
        return NextResponse.json({ 
          success: true, 
          chatId: chat.id,
          message: "Build started" 
        })
      }

      console.log("[v0] Returning stream response")
      // Proxy the raw v0 stream directly
      return new Response(stream, {
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Chat-Id": chat.id,
          "X-Workflow-Run-Id": run.runId,
        },
      })

    } else {
      // Subsequent messages: send to existing chat
      console.log("[v0] Sending message to existing chat:", app.v0ChatId)
      const response = await v0.chats.sendMessage({
        chatId: app.v0ChatId!,
        message,
        responseMode: "experimental_stream",
      })
      console.log("[v0] sendMessage response keys:", Object.keys(response))
      console.log("[v0] sendMessage hasStream:", !!response.stream)

      // Mark app as having pending changes
      const messageId = `msg_${Date.now()}`
      await markPendingChanges(id, messageId)

      // Update version ID if available
      if (response.latestVersion?.id) {
        await updateApp(id, {
          v0VersionId: response.latestVersion.id,
        })
      }

      const stream = response.stream
      console.log("[v0] Stream for existing chat:", !!stream, stream?.constructor?.name)
      if (!stream) {
        console.log("[v0] No stream available, returning JSON")
        return NextResponse.json({ 
          success: true, 
          hasPendingChanges: true,
          messageId,
        })
      }

      console.log("[v0] Returning stream for existing chat")
      // Proxy the raw v0 stream directly
      return new Response(stream, {
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Has-Pending-Changes": "true",
          "X-Message-Id": messageId,
        },
      })
    }

  } catch (error) {
    console.error("[v0] Chat error:", error)
    
    await updateAppStatus(id, "error", -1, {
      error: error instanceof Error ? error.message : "Chat failed",
    })

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process chat message" },
      { status: 500 }
    )
  }
}

// GET /api/apps/[id]/chat - Get chat history from v0
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const app = await getApp(id)
    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 })
    }

    if (!app.v0ChatId) {
      return NextResponse.json({ messages: [] })
    }

    // Fetch chat with messages from v0
    const messages = await v0.chats.findMessages({ chatId: app.v0ChatId })
    
    return NextResponse.json({ 
      chatId: app.v0ChatId,
      messages: messages.data || [],
    })

  } catch (error) {
    console.error("[v0] GET chat error:", error)
    return NextResponse.json(
      { error: "Failed to fetch chat history" },
      { status: 500 }
    )
  }
}
