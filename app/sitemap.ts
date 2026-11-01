import { MetadataRoute } from 'next'

const publicRoutes = [
  '',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/calendar',
  '/academy',
  '/trainer/offers',
  '/breeds',
  '/articles',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return publicRoutes.map((route) => ({
    url: `https://pawmeet.eu${route}`,
    lastModified,
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1 : route === '/calendar' || route === '/breeds' ? 0.8 : 0.6,
  }))
}
