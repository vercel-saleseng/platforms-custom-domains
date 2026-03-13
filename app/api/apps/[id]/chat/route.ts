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
      await updateAppStatus(id, "building", 1)
      
      // Create chat with v0 - with streaming, the return value IS the stream
      const result = await v0.chats.create({
        message,
        responseMode: "experimental_stream",
      })

      // With experimental_stream, result is the ReadableStream directly
      // We need to get the chat ID from a non-streaming call first, then stream
      // Actually, let's use sync mode to get chat ID, then the workflow handles it
      const chat = await v0.chats.create({
        message,
        responseMode: "sync",
      })

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

      // Return success - client will poll and reload messages
      return NextResponse.json({ 
        success: true, 
        chatId: chat.id,
        workflowRunId: run.runId,
      })

    } else {
      // Subsequent messages: send to existing chat with streaming
      const stream = await v0.chats.sendMessage({
        chatId: app.v0ChatId!,
        message,
        responseMode: "experimental_stream",
      })

      // Mark app as having pending changes
      const messageId = `msg_${Date.now()}`
      await markPendingChanges(id, messageId)

      // With experimental_stream, the result IS the ReadableStream
      if (stream instanceof ReadableStream) {
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        })
      }

      // Fallback if no stream
      return NextResponse.json({ 
        success: true, 
        hasPendingChanges: true,
        messageId,
        completed: true,
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
