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
export const GITHUB_PROFILE_URL = 'https://github.com/rllie833'

export const ROOMS: Room[] = [
  {
    id: 'lab',
    name: 'PUSINGCUK LAB',
    repo: 'rllie833/pusingcuk',
    repoUrl: 'https://github.com/rllie833/pusingcuk',
    demoUrl: 'https://rllie833.github.io/pusingcuk',
    tagline: 'Where the code makes you dizzy.',
    description:
      'The R&D playground. Experiments, prototypes and late-night coding sessions live here. Bugs are born in this lab, and the good ideas graduate to production.',
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
    repo: 'rllie833/core',
    repoUrl: 'https://github.com/rllie833/core',
    demoUrl: 'https://rllie833.github.io/core',
    tagline: 'The beating heart of the office.',
    description:
      'Shared services, APIs and infrastructure that power every other room. The racks blink all night so everything else can just work.',
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
    repo: 'rllie833/founder-os',
    repoUrl: 'https://github.com/rllie833/founder-os',
    demoUrl: 'https://rllie833.github.io/founder-os',
    tagline: 'The operating system for building a company.',
    description:
      'Roadmaps, decisions, rituals and the master plan pinned to the board. The founder desk sits right in the middle so nothing ships without passing through here.',
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
    repo: 'rllie833/office-rllie833',
    repoUrl: 'https://github.com/rllie833/office-rllie833',
    demoUrl: 'https://office-rllie833.com',
    tagline: 'Visitors welcome. Grab a coffee.',
    description:
      'This very office! An isometric pixel-art mini game built with plain HTML Canvas, where every room is a repo. Walk in, look around and say hi.',
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
