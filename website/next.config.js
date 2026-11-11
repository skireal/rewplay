/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    // Встроенный loader Next превращает .svg в {src,...}; logo.svg нужен как строка
    const builtIn = config.module.rules.find(
      (rule) => rule && rule.test instanceof RegExp && rule.test.test('.svg')
    )
    if (builtIn) builtIn.exclude = /logo\.svg$/
    config.module.rules.push({ test: /logo\.svg$/, type: 'asset/source' })
    return config
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

module.exports = nextConfig
