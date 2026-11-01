import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/domu',
          '/chat',
          '/ai',
          '/map',
          '/search',
          '/settings',
          '/admin/',
          '/moderation/',
          '/notifications',
          '/messages',
          '/trainer/dashboard',
        ],
      },
    ],
    sitemap: 'https://pawmeet.eu/sitemap.xml',
    host: 'https://pawmeet.eu',
  }
}
