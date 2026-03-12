import { createClient } from "v0-sdk"

// Create v0 client with explicit API key configuration
// This ensures the API key is read at call time, not import time
// which is important for workflow step functions
function getV0Client() {
  const apiKey = process.env.V0_API_KEY
  if (!apiKey) {
    throw new Error("V0_API_KEY environment variable is required")
  }
  return createClient({ apiKey })
}

// Export a proxy that lazily initializes the client
export const v0 = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) {
    const client = getV0Client()
    return client[prop as keyof typeof client]
  },
})
