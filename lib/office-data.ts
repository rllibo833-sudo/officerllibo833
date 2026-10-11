export type RoomId = 'lab' | 'server' | 'founder' | 'lobby'

export type Room = {
  id: RoomId
  name: string
  repo: string
  repoUrl: string
  demoUrl: string
  tagline: string
  description: string
  tags: string[]
  rect: { x: number; y: number; w: number; h: number }
  palette: {
    accent: string
    floorA: string
    floorB: string
    grout: string
    glow: string
  }
}

export const MAP_SIZE = 15
export const GITHUB_PROFILE_URL = 'https://github.com/rllibo833-sudo'

export const ROOMS: Room[] = [
  {
    id: 'lab',
    name: 'PUSINGCUK LAB',
    repo: 'rllibo833-sudo/pusingcuk',
    repoUrl: 'https://github.com/rllibo833-sudo/pusingcuk',
    demoUrl: 'https://rllibo833-sudo.github.io/pusingcuk',
    tagline: 'Where the code makes you dizzy.',
    description: 'Bahasa pemrograman eksperimental bergaya esoterik',
    tags: ['Experiments', 'Prototypes', 'WIP'],
    rect: { x: 0, y: 10, w: 5, h: 5 },
    palette: {
      accent: '#4ade80',
      floorA: '#1c3a2a',
      floorB: '#21442f',
      grout: '#122a1d',
      glow: '74,222,128',
    },
  },
  {
    id: 'server',
    name: 'CORE SERVER',
    repo: 'rllibo833-sudo/kawasan-masjid-core',
    repoUrl: 'https://github.com/rllibo833-sudo/kawasan-masjid-core',
    demoUrl: 'https://rllibo833-sudo.github.io/kawasan-masjid-core',
    tagline: 'The beating heart of the office.',
    description:
      'Canonical CORE for the Kawasan Masjid 1.000 Ha digital ecosystem',
    tags: ['Backend', 'API', 'Infra'],
    rect: { x: 10, y: 0, w: 5, h: 5 },
    palette: {
      accent: '#f87171',
      floorA: '#3a1c22',
      floorB: '#432128',
      grout: '#2a1318',
      glow: '248,113,113',
    },
  },
  {
    id: 'founder',
    name: 'FOUNDER OS',
    repo: 'rllibo833-sudo/Founder-OS',
    repoUrl: 'https://github.com/rllibo833-sudo/Founder-OS',
    demoUrl: 'https://rllibo833-sudo.github.io/Founder-OS',
    tagline: 'The operating system for building a company.',
    description: 'Second brain and operating system for a solo founder',
    tags: ['Roadmap', 'Planning', 'Ops'],
    rect: { x: 5, y: 5, w: 5, h: 5 },
    palette: {
      accent: '#a78bfa',
      floorA: '#2a2147',
      floorB: '#312752',
      grout: '#1c1633',
      glow: '167,139,250',
    },
  },
  {
    id: 'lobby',
    name: 'PUBLIC LOBBY',
    repo: 'rllibo833-sudo/kawasan-masjid-public',
    repoUrl: 'https://github.com/rllibo833-sudo/kawasan-masjid-public',
    demoUrl: 'https://rllibo833-sudo.github.io/kawasan-masjid-public',
    tagline: 'Visitors welcome. Grab a coffee.',
    description: 'Public website for the Kawasan Masjid 1.000 Ha vision',
    tags: ['Canvas', 'Game', 'Portfolio'],
    rect: { x: 10, y: 10, w: 5, h: 5 },
    palette: {
      accent: '#facc15',
      floorA: '#3d3216',
      floorB: '#47391a',
      grout: '#2b230f',
      glow: '250,204,21',
    },
  },
]

export const ROOM_BY_ID: Record<RoomId, Room> = Object.fromEntries(
  ROOMS.map((room) => [room.id, room]),
) as Record<RoomId, Room>
