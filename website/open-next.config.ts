import { defineCloudflareConfig } from '@opennextjs/cloudflare'

// Страницы динамические (шапка читает cookies), поэтому кэш ISR не нужен.
export default defineCloudflareConfig()
