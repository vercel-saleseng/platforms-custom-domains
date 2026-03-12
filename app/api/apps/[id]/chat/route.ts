import { NextResponse } from "next/server"
import { start } from "workflow/api"
import { v0 } from "@/lib/v0-client"
import { getApp, updateApp, updateAppStatus, markPendingChanges } from "@/lib/apps-store"
import { appGenerationWorkflow } from "@/lib/workflows/app-generation"
import { parseStreamingResponse } from "v0-sdk"

// POST /api/apps/[id]/chat - Send a chat message
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  console.log("[v0] POST /api/apps/[id]/chat called, appId:", id)
  
  try {
    const body = await request.json()
    console.log("[v0] Request body:", JSON.stringify(body).slice(0, 200))
    const { message } = body
    
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
      await updateAppStatus(id, "building", 0)
      
      // Start the durable workflow for initial build
      const run = await start(appGenerationWorkflow, [{ 
        appId: id, 
        message,
      }])

      // Store the workflow run ID
      await updateApp(id, {
        workflowRunId: run.runId,
      })

      // For first message, we use streaming from v0 for immediate feedback
      // The workflow will handle the actual deployment
      console.log("[v0] Creating chat with v0.chats.create...")
      const chat = await v0.chats.create({
        message,
        responseMode: "experimental_stream",
      })
      console.log("[v0] Chat created, id:", chat.id, "has stream:", !!chat.stream)

      // Update with chat ID
      await updateApp(id, {
        v0ChatId: chat.id,
      })

      // Stream the response back
      const stream = chat.stream
      if (!stream) {
        return NextResponse.json({ 
          success: true, 
          chatId: chat.id,
          workflowRunId: run.runId,
          message: "Build started" 
        })
      }

      // Transform the v0 stream for the client
      const transformedStream = new ReadableStream({
        async start(controller) {
          try {
            console.log("[v0] Starting to parse streaming response...")
            let eventCount = 0
            for await (const event of parseStreamingResponse(stream)) {
              eventCount++
              // Log full event structure to understand format
              console.log("[v0] Stream event:", JSON.stringify(event).slice(0, 500))
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
              )
            }
            console.log("[v0] Stream complete, total events:", eventCount)
            controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`))
            controller.close()
          } catch (error) {
            console.error("[v0] Stream error:", error)
            controller.error(error)
          }
        },
      })

      return new Response(transformedStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      })

    } else {
      // Subsequent messages: send to existing chat, stage changes
      const response = await v0.chats.sendMessage({
        chatId: app.v0ChatId!,
        message,
        responseMode: "experimental_stream",
      })

      // Mark app as having pending changes
      const messageId = `msg_${Date.now()}`
      await markPendingChanges(id, messageId)

      // Update version ID if available
      if (response.latestVersion?.id) {
        await updateApp(id, {
          v0VersionId: response.latestVersion.id,
        })
      }

      // Stream the response back
      const stream = response.stream
      if (!stream) {
        return NextResponse.json({ 
          success: true, 
          hasPendingChanges: true,
          messageId,
        })
      }

      // Transform the v0 stream for the client
      const transformedStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of parseStreamingResponse(stream)) {
              // Update version ID when we get it from the stream
              if (event.type === "generation_complete" && event.versionId) {
                await updateApp(id, {
                  v0VersionId: event.versionId,
                })
              }
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
              )
            }
            controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`))
            controller.close()
          } catch (error) {
            console.error("[v0] Stream error:", error)
            controller.error(error)
          }
        },
      })

      return new Response(transformedStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      })
    }

  } catch (error) {
    console.error("[v0] POST /api/apps/[id]/chat: error:", error)
    
    // Update app status to error
    await updateAppStatus(id, "error", -1, {
      error: error instanceof Error ? error.message : "Chat failed",
    })

    return NextResponse.json(
      { error: "Failed to process chat message" },
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
      // No chat yet - return empty messages
      return NextResponse.json({ messages: [] })
    }

    // Fetch chat history from v0
    const chat = await v0.chats.getById({ chatId: app.v0ChatId })
    
    return NextResponse.json({ 
      chat,
      messages: chat.messages || [],
    })

  } catch (error) {
    console.error("[v0] GET /api/apps/[id]/chat: error:", error)
    return NextResponse.json(
      { error: "Failed to fetch chat history" },
      { status: 500 }
    )
  }
}
