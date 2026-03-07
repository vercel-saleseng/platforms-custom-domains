import pkg from "workflow/next"
const { withWorkflow } = pkg

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
}

export default withWorkflow(nextConfig)
