import { list, del } from '@vercel/blob'

async function deleteAllBlobs() {
  console.log('Fetching all blobs...')
  
  let cursor: string | undefined
  let totalDeleted = 0
  
  do {
    const { blobs, cursor: nextCursor } = await list({ cursor })
    
    console.log(`Found ${blobs.length} blobs in this batch`)
    
    for (const blob of blobs) {
      console.log(`Deleting: ${blob.pathname}`)
      await del(blob.url)
      totalDeleted++
    }
    
    cursor = nextCursor
  } while (cursor)
  
  console.log(`Done! Deleted ${totalDeleted} blobs total.`)
}

deleteAllBlobs().catch(console.error)
