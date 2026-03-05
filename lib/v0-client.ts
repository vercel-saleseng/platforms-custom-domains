import { createClient } from "v0-sdk"

export const v0 = createClient({
  apiKey: process.env.V0_API_KEY!,
})
