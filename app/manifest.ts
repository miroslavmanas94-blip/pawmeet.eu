import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PawMeet.eu – komunita pejskařů',
    short_name: 'PawMeet',
    description: 'Propojuj pejskaře, jejich psy, společné procházky a trénink.',
    start_url: '/domu',
    scope: '/',
    display: 'standalone',
    background_color: '#F3F4F6',
    theme_color: '#5B5BF7',
    lang: 'cs-CZ',
    icons: [
      { src: '/logo.png', sizes: 'any', type: 'image/png', purpose: 'any' },
    ],
  }
}
