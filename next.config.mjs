/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pg'],
  images: {
    domains: ['your-supabase-project.supabase.co'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude Konva from server-side bundle
      config.externals = [...(config.externals || []), 'konva']
    }
    return config
  },
}

export default nextConfig;
