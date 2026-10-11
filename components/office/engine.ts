import { MAP_SIZE, ROOMS, type Room, type RoomId } from '@/lib/office-data'

const N = MAP_SIZE
const HW = 16
const HH = 8
const WALL_H = 56
const BG = '#0f0f1a'

type Vec = { x: number; y: number }
type Dir = 'up' | 'down' | 'left' | 'right'

type Actor = {
  x: number
  y: number
  dir: Dir
  moving: boolean
  walkT: number
  path: Vec[]
  speed: number
  wait: number
  shirt: string
  pants: string
  hair: string
  skin: string
  isPlayer: boolean
}

type FurnitureKind =
  | 'desk-pc'
  | 'rack'
  | 'board'
  | 'founder-desk'
  | 'plant'
  | 'counter'
  | 'coffee'
  | 'fridge'
  | 'table'
  | 'sofa'
  | 'reception'
  | 'arcade'
  | 'shelf'
  | 'cooler'

type Furniture = { kind: FurnitureKind; x: number; y: number; seed: number }

type Particle = { x: number; y: number; z: number; vz: number; life: number; max: number; kind: 'dust' | 'steam' }

type SignHit = { id: RoomId; x: number; y: number; w: number; h: number }

export type EngineCallbacks = {
  onRoomChange: (id: RoomId | null) => void
  onRoomActivate: (id: RoomId) => void
}

const LAYOUT: Array<[FurnitureKind, number, number]> = [
  ['fridge', 0, 0],
  ['coffee', 0, 1],
  ['counter', 0, 2],
  ['table', 2, 3],
  ['plant', 4, 0],
  ['rack', 11, 0],
  ['rack', 12, 0],
  ['rack', 13, 0],
  ['rack', 14, 0],
  ['rack', 11, 2],
  ['rack', 12, 2],
  ['rack', 13, 2],
  ['rack', 14, 2],
  ['desk-pc', 0, 11],
  ['desk-pc', 0, 13],
  ['desk-pc', 2, 11],
  ['desk-pc', 2, 13],
  ['plant', 4, 14],
  ['board', 7, 5],
  ['founder-desk', 7, 7],
  ['founder-desk', 8, 7],
  ['plant', 5, 5],
  ['plant', 9, 9],
  ['reception', 11, 11],
  ['reception', 12, 11],
  ['sofa', 10, 14],
  ['sofa', 11, 14],
  ['plant', 14, 10],
  ['shelf', 5, 0],
  ['shelf', 6, 0],
  ['arcade', 8, 0],
  ['plant', 9, 0],
  ['shelf', 0, 6],
  ['shelf', 0, 7],
  ['plant', 0, 9],
  ['cooler', 14, 6],
  ['plant', 14, 9],
  ['plant', 9, 14],
  ['arcade', 6, 14],
]

const PANTRY = { x: 0, y: 0, w: 5, h: 5 }

function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

function inRect(r: { x: number; y: number; w: number; h: number }, x: number, y: number) {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h
}

function roomAt(x: number, y: number): Room | null {
  const tx = Math.floor(x)
  const ty = Math.floor(y)
  return ROOMS.find((r) => inRect(r.rect, tx, ty)) ?? null
}

function iso(x: number, y: number, z = 0): Vec {
  return { x: (x - y) * HW, y: (x + y) * HH - z }
}

export class OfficeEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private buf: HTMLCanvasElement
  private b: CanvasRenderingContext2D
  private staticLayer: HTMLCanvasElement | null = null
  private staticOffset = { x: N * HW + 8, y: WALL_H + 12 }
  private cb: EngineCallbacks

  private cssW = 0
  private cssH = 0
  private dpr = 1
  private zoom = 2
  private cam = { x: 0, y: 0 }
  private camReady = false
  private ox = 0
  private oy = 0

  private player: Actor
  private npcs: Actor[]
  private furniture: Furniture[]
  private blocked: boolean[]
  private keys = new Set<string>()
  private particles: Particle[] = []
  private signs: SignHit[] = []
  private tapMarker: { x: number; y: number; t: number } | null = null
  private pendingRoom: RoomId | null = null
  private currentRoom: RoomId | null = null
  private paused = false
  private t = 0
  private steamT = 0
  private raf = 0
  private last = 0
  private font = 'monospace'

  constructor(canvas: HTMLCanvasElement, cb: EngineCallbacks) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.buf = document.createElement('canvas')
    this.b = this.buf.getContext('2d')!
    this.cb = cb

    this.furniture = LAYOUT.map(([kind, x, y], i) => ({ kind, x, y, seed: i * 7.3 + 1 }))
    this.blocked = new Array(N * N).fill(false)
    for (const f of this.furniture) this.blocked[f.y * N + f.x] = true

    this.player = this.makeActor(12.5, 13.5, true, '#ffb46b', '#2b2a4a', '#3b2416')
    this.npcs = [
      this.makeActor(13.5, 12.5, false, '#60a5fa', '#1f2937', '#111827'),
      this.makeActor(6.5, 11.5, false, '#f472b6', '#3f2a1d', '#7c2d12'),
      this.makeActor(3.5, 7.5, false, '#34d399', '#27272a', '#a16207'),
    ]
    this.npcs.forEach((n, i) => (n.wait = 1 + i))

    for (let i = 0; i < 40; i++) {
      this.particles.push({
        x: Math.random() * N,
        y: Math.random() * N,
        z: Math.random() * 50,
        vz: 2 + Math.random() * 3,
        life: Math.random() * 6,
        max: 6 + Math.random() * 4,
        kind: 'dust',
      })
    }

    const fam = getComputedStyle(document.documentElement).getPropertyValue('--font-press-start').trim()
    if (fam) {
      this.font = fam
      document.fonts?.load(`8px ${fam}`).catch(() => {})
    }

    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointermove', this.onPointerMove)
  }

  start() {
    this.last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - this.last) / 1000)
      this.last = now
      this.update(dt)
      this.render()
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
  }

  setPaused(paused: boolean) {
    this.paused = paused
    this.keys.clear()
    if (paused) {
      this.player.path = []
      this.pendingRoom = null
    }
  }

  activateCurrentRoom() {
    if (this.currentRoom) this.cb.onRoomActivate(this.currentRoom)
  }

  resize(w: number, h: number) {
    this.cssW = w
    this.cssH = h
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    const mapW = N * HW * 2 + 40
    const mapH = N * HH * 2 + WALL_H + 70
    const fit = Math.min(w / mapW, h / mapH)
    this.zoom = Math.min(4, Math.max(1.5, Math.floor(fit * 2) / 2))
    this.canvas.width = Math.round(w * this.dpr)
    this.canvas.height = Math.round(h * this.dpr)
    this.buf.width = Math.ceil(w / this.zoom)
    this.buf.height = Math.ceil(h / this.zoom)
    this.camReady = false
  }

  // ---------- input ----------

  private onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
    if (this.paused) return
    const k = e.key.toLowerCase()
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      e.preventDefault()
      this.keys.add(k)
    } else if (k === 'e' || k === 'enter' || k === ' ') {
      if (this.currentRoom) {
        e.preventDefault()
        this.cb.onRoomActivate(this.currentRoom)
      }
    }
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase())
  }

  private onBlur = () => this.keys.clear()

  private toWorld(clientX: number, clientY: number): Vec {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: (clientX - rect.left) / this.zoom + this.cam.x,
      y: (clientY - rect.top) / this.zoom + this.cam.y,
    }
  }

  private pick(world: Vec): { room: Room | null; tile: Vec | null } {
    for (const s of this.signs) {
      if (world.x >= s.x && world.x <= s.x + s.w && world.y >= s.y && world.y <= s.y + s.h) {
        const room = ROOMS.find((r) => r.id === s.id)!
        return { room, tile: { x: room.rect.x + 2, y: room.rect.y + 2 } }
      }
    }
    const gx = (world.x / HW + world.y / HH) / 2
    const gy = (world.y / HH - world.x / HW) / 2
    if (gx < 0 || gy < 0 || gx >= N || gy >= N) return { room: null, tile: null }
    const tile = { x: Math.floor(gx), y: Math.floor(gy) }
    return { room: roomAt(gx, gy), tile }
  }

  private onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    const { room } = this.pick(this.toWorld(e.clientX, e.clientY))
    this.canvas.style.cursor = room ? 'pointer' : 'crosshair'
  }

  private onPointerDown = (e: PointerEvent) => {
    if (this.paused) return
    e.preventDefault()
    const { room, tile } = this.pick(this.toWorld(e.clientX, e.clientY))
    if (!tile) return

    if (room && this.currentRoom === room.id) {
      this.player.path = []
      this.pendingRoom = null
      this.cb.onRoomActivate(room.id)
      return
    }

    const path = this.findPath(this.player.x, this.player.y, tile.x, tile.y)
    this.player.path = path
    this.pendingRoom = room?.id ?? null
    const end = path[path.length - 1] ?? { x: tile.x + 0.5, y: tile.y + 0.5 }
    this.tapMarker = { x: end.x, y: end.y, t: 0 }
    if (path.length === 0 && room && this.currentRoom === room.id) this.cb.onRoomActivate(room.id)
  }

  // ---------- world ----------

  private makeActor(x: number, y: number, isPlayer: boolean, shirt: string, pants: string, hair: string): Actor {
    return {
      x,
      y,
      dir: 'down',
      moving: false,
      walkT: 0,
      path: [],
      speed: isPlayer ? 3.4 : 1.4,
      wait: 0,
      shirt,
      pants,
      hair,
      skin: '#f2c9a0',
      isPlayer,
    }
  }

  private walkable(tx: number, ty: number) {
    return tx >= 0 && ty >= 0 && tx < N && ty < N && !this.blocked[ty * N + tx]
  }

  private canStand(x: number, y: number) {
    const r = 0.22
    return (
      this.walkable(Math.floor(x - r), Math.floor(y - r)) &&
      this.walkable(Math.floor(x + r), Math.floor(y - r)) &&
      this.walkable(Math.floor(x - r), Math.floor(y + r)) &&
      this.walkable(Math.floor(x + r), Math.floor(y + r))
    )
  }

  private nearestWalkable(tx: number, ty: number): Vec {
    if (this.walkable(tx, ty)) return { x: tx, y: ty }
    let best: Vec = { x: tx, y: ty }
    let bestD = Infinity
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        if (!this.walkable(x, y)) continue
        const d = (x - tx) ** 2 + (y - ty) ** 2
        if (d < bestD) {
          bestD = d
          best = { x, y }
        }
      }
    return best
  }

  private findPath(fx: number, fy: number, tx: number, ty: number): Vec[] {
    const start = { x: Math.floor(fx), y: Math.floor(fy) }
    const goal = this.nearestWalkable(tx, ty)
    if (start.x === goal.x && start.y === goal.y) return [{ x: goal.x + 0.5, y: goal.y + 0.5 }]
    const prev = new Int32Array(N * N).fill(-1)
    const seen = new Uint8Array(N * N)
    const q = [start.y * N + start.x]
    seen[q[0]] = 1
    const dirs = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [1, 1], [1, -1], [-1, 1], [-1, -1],
    ]
    let found = false
    for (let qi = 0; qi < q.length; qi++) {
      const cur = q[qi]
      const cx = cur % N
      const cy = (cur / N) | 0
      if (cx === goal.x && cy === goal.y) {
        found = true
        break
      }
      for (const [dx, dy] of dirs) {
        const nx = cx + dx
        const ny = cy + dy
        if (!this.walkable(nx, ny)) continue
        if (dx !== 0 && dy !== 0 && (!this.walkable(cx + dx, cy) || !this.walkable(cx, cy + dy))) continue
        const ni = ny * N + nx
        if (seen[ni]) continue
        seen[ni] = 1
        prev[ni] = cur
        q.push(ni)
      }
    }
    if (!found) return []
    const out: Vec[] = []
    let c = goal.y * N + goal.x
    while (c !== start.y * N + start.x && c !== -1) {
      out.push({ x: (c % N) + 0.5, y: ((c / N) | 0) + 0.5 })
      c = prev[c]
    }
    return out.reverse()
  }

  private setFacing(a: Actor, vx: number, vy: number) {
    const sdx = vx - vy
    const sdy = (vx + vy) * 0.5
    if (Math.abs(sdx) > Math.abs(sdy)) a.dir = sdx > 0 ? 'right' : 'left'
    else a.dir = sdy > 0 ? 'down' : 'up'
  }

  private followPath(a: Actor, dt: number) {
    const target = a.path[0]
    if (!target) {
      a.moving = false
      return
    }
    const dx = target.x - a.x
    const dy = target.y - a.y
    const dist = Math.hypot(dx, dy)
    const step = a.speed * dt
    if (dist <= step) {
      a.x = target.x
      a.y = target.y
      a.path.shift()
    } else {
      a.x += (dx / dist) * step
      a.y += (dy / dist) * step
    }
    this.setFacing(a, dx, dy)
    a.moving = true
  }

  private update(dt: number) {
    this.t += dt
    const p = this.player

    let gx = 0
    let gy = 0
    if (!this.paused) {
      const k = this.keys
      if (k.has('w') || k.has('arrowup')) { gx -= 1; gy -= 1 }
      if (k.has('s') || k.has('arrowdown')) { gx += 1; gy += 1 }
      if (k.has('a') || k.has('arrowleft')) { gx -= 1; gy += 1 }
      if (k.has('d') || k.has('arrowright')) { gx += 1; gy -= 1 }
    }

    if (gx !== 0 || gy !== 0) {
      p.path = []
      this.pendingRoom = null
      this.tapMarker = null
      const len = Math.hypot(gx, gy)
      const vx = (gx / len) * p.speed
      const vy = (gy / len) * p.speed
      const nx = p.x + vx * dt
      const ny = p.y + vy * dt
      if (this.canStand(nx, p.y)) p.x = nx
      if (this.canStand(p.x, ny)) p.y = ny
      this.setFacing(p, vx, vy)
      p.moving = true
    } else if (p.path.length) {
      this.followPath(p, dt)
      if (!p.path.length) {
        p.moving = false
        this.tapMarker = null
        const arrived = roomAt(p.x, p.y)?.id ?? null
        if (this.pendingRoom && arrived === this.pendingRoom) this.cb.onRoomActivate(this.pendingRoom)
        this.pendingRoom = null
      }
    } else {
      p.moving = false
    }
    if (p.moving) p.walkT += dt

    const room = roomAt(p.x, p.y)?.id ?? null
    if (room !== this.currentRoom) {
      this.currentRoom = room
      this.cb.onRoomChange(room)
    }

    for (const n of this.npcs) {
      if (n.path.length) {
        this.followPath(n, dt)
        n.walkT += dt
        if (!n.path.length) n.wait = 1.5 + Math.random() * 3.5
      } else {
        n.moving = false
        n.wait -= dt
        if (n.wait <= 0) {
          const tx = Math.floor(Math.random() * N)
          const ty = Math.floor(Math.random() * N)
          n.path = this.findPath(n.x, n.y, tx, ty)
          if (!n.path.length) n.wait = 1
        }
      }
    }

    if (this.tapMarker) this.tapMarker.t += dt

    this.steamT += dt
    if (this.steamT > 0.25) {
      this.steamT = 0
      this.particles.push({ x: 0.55, y: 1.6, z: 24, vz: 9, life: 0, max: 1.8, kind: 'steam' })
    }
    for (const pt of this.particles) {
      pt.life += dt
      pt.z += pt.vz * dt
      if (pt.kind === 'dust') {
        pt.x += Math.sin(this.t * 0.6 + pt.max) * 0.08 * dt
        if (pt.life > pt.max || pt.z > 60) {
          pt.life = 0
          pt.z = Math.random() * 10
          pt.x = Math.random() * N
          pt.y = Math.random() * N
        }
      } else {
        pt.x += Math.sin(this.t * 3 + pt.life * 4) * 0.15 * dt
      }
    }
    this.particles = this.particles.filter((pt) => pt.kind === 'dust' || pt.life < pt.max)
  }

  // ---------- drawing helpers ----------

  private P(x: number, y: number, z = 0): Vec {
    const v = iso(x, y, z)
    return { x: Math.round(v.x + this.ox), y: Math.round(v.y + this.oy) }
  }

  private poly(g: CanvasRenderingContext2D, pts: Vec[], color: string) {
    g.fillStyle = color
    g.beginPath()
    g.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y)
    g.closePath()
    g.fill()
  }

  private box(
    g: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    w: number,
    d: number,
    z0: number,
    h: number,
    top: string,
    left: string,
    right: string,
  ) {
    const z1 = z0 + h
    this.poly(g, [this.P(x0, y0 + d, z0), this.P(x0 + w, y0 + d, z0), this.P(x0 + w, y0 + d, z1), this.P(x0, y0 + d, z1)], left)
    this.poly(g, [this.P(x0 + w, y0, z0), this.P(x0 + w, y0 + d, z0), this.P(x0 + w, y0 + d, z1), this.P(x0 + w, y0, z1)], right)
    this.poly(g, [this.P(x0, y0, z1), this.P(x0 + w, y0, z1), this.P(x0 + w, y0 + d, z1), this.P(x0, y0 + d, z1)], top)
  }

  private glow(g: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, a: number) {
    const grad = g.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, `rgba(${rgb},${a})`)
    grad.addColorStop(1, `rgba(${rgb},0)`)
    g.fillStyle = grad
    g.fillRect(x - r, y - r, r * 2, r * 2)
  }

  // ---------- static layer (floor + walls) ----------

  private buildStatic() {
    const c = document.createElement('canvas')
    c.width = N * HW * 2 + 16
    c.height = WALL_H + 24 + N * HH * 2 + 12
    const g = c.getContext('2d')!
    this.ox = this.staticOffset.x
    this.oy = this.staticOffset.y

    // floor slab edge
    this.poly(g, [this.P(N, 0, 0), this.P(N, N, 0), this.P(N, N, -6), this.P(N, 0, -6)], '#140f1c')
    this.poly(g, [this.P(0, N, 0), this.P(N, N, 0), this.P(N, N, -6), this.P(0, N, -6)], '#1b1526')

    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const t = this.P(i, j, 0)
        const room = ROOMS.find((r) => inRect(r.rect, i, j))
        const pantry = inRect(PANTRY, i, j)
        const full = [
          { x: t.x, y: t.y },
          { x: t.x + HW, y: t.y + HH },
          { x: t.x, y: t.y + HH * 2 },
          { x: t.x - HW, y: t.y + HH },
        ]
        if (room || pantry) {
          const pal = room
            ? room.palette
            : { floorA: '#3a2f2a', floorB: '#45382f', grout: '#29201b' }
          this.poly(g, full, pal.grout)
          const inset = [
            { x: t.x, y: t.y + 1 },
            { x: t.x + HW - 2, y: t.y + HH },
            { x: t.x, y: t.y + HH * 2 - 1 },
            { x: t.x - HW + 2, y: t.y + HH },
          ]
          this.poly(g, inset, (i + j) % 2 === 0 ? pal.floorA : pal.floorB)
        } else {
          this.poly(g, full, i % 2 === 0 ? '#3b2a20' : '#34251c')
          g.fillStyle = '#2b1e17'
          const s = this.P(i, j + 0.5, 0)
          g.fillRect(s.x - 1, s.y, 2, 1)
        }
      }
    }

    // rug in founder room
    this.poly(g, [this.P(5.6, 7.9), this.P(9.4, 7.9), this.P(9.4, 9.6), this.P(5.6, 9.6)], '#4c3a7a')
    this.poly(g, [this.P(5.9, 8.15), this.P(9.1, 8.15), this.P(9.1, 9.35), this.P(5.9, 9.35)], '#5d4893')
    // welcome mat at lobby entrance
    this.poly(g, [this.P(14.1, 12.15), this.P(14.95, 12.15), this.P(14.95, 12.85), this.P(14.1, 12.85)], '#7a5a16')
    this.poly(g, [this.P(14.25, 12.3), this.P(14.8, 12.3), this.P(14.8, 12.7), this.P(14.25, 12.7)], '#a37a1e')

    // room outlines
    for (const r of ROOMS) {
      const { x, y, w, h } = r.rect
      g.strokeStyle = r.palette.accent
      g.globalAlpha = 0.55
      g.lineWidth = 1
      g.beginPath()
      const a = this.P(x, y), b2 = this.P(x + w, y), c2 = this.P(x + w, y + h), d2 = this.P(x, y + h)
      g.moveTo(a.x, a.y)
      g.lineTo(b2.x, b2.y)
      g.lineTo(c2.x, c2.y)
      g.lineTo(d2.x, d2.y)
      g.closePath()
      g.stroke()
      g.globalAlpha = 1
    }

    // back walls
    const wallRight = (a: number, b: number, color: string) =>
      this.poly(g, [this.P(a, 0, 0), this.P(b, 0, 0), this.P(b, 0, WALL_H), this.P(a, 0, WALL_H)], color)
    const wallLeft = (a: number, b: number, color: string) =>
      this.poly(g, [this.P(0, a, 0), this.P(0, b, 0), this.P(0, b, WALL_H), this.P(0, a, WALL_H)], color)

    wallRight(0, 5, '#3a2c2a')
    wallRight(5, 10, '#2c2640')
    wallRight(10, N, '#3a1f28')
    wallLeft(0, 5, '#2e2321')
    wallLeft(5, 10, '#221d33')
    wallLeft(10, N, '#1b2e25')

    // baseboards
    this.poly(g, [this.P(0, 0, 0), this.P(N, 0, 0), this.P(N, 0, 3), this.P(0, 0, 3)], '#171223')
    this.poly(g, [this.P(0, 0, 0), this.P(0, N, 0), this.P(0, N, 3), this.P(0, 0, 3)], '#120e1c')

    // wall caps
    this.poly(g, [this.P(0, 0, WALL_H), this.P(N, 0, WALL_H), this.P(N, 0, WALL_H + 3), this.P(0, 0, WALL_H + 3)], '#4a4166')
    this.poly(g, [this.P(0, 0, WALL_H), this.P(0, N, WALL_H), this.P(0, N, WALL_H + 3), this.P(0, 0, WALL_H + 3)], '#3b3454')

    // windows
    const windowRight = (a: number, b: number, z0: number, z1: number) => {
      this.poly(g, [this.P(a - 0.1, 0, z0 - 2), this.P(b + 0.1, 0, z0 - 2), this.P(b + 0.1, 0, z1 + 2), this.P(a - 0.1, 0, z1 + 2)], '#6b4a34')
      this.poly(g, [this.P(a, 0, z0), this.P(b, 0, z0), this.P(b, 0, z1), this.P(a, 0, z1)], '#1b2550')
      for (let k = 0; k < 8; k++) {
        const s = this.P(a + hash(a * 10 + k) * (b - a), 0, z0 + 2 + hash(k * 3 + a) * (z1 - z0 - 4))
        g.fillStyle = k % 3 === 0 ? '#ffe9b0' : '#9fb3ff'
        g.fillRect(s.x, s.y, 1, 1)
      }
      const mid = this.P((a + b) / 2, 0, z0)
      const midTop = this.P((a + b) / 2, 0, z1)
      g.fillStyle = '#6b4a34'
      g.fillRect(mid.x, midTop.y, 1, mid.y - midTop.y)
    }
    const windowLeft = (a: number, b: number, z0: number, z1: number) => {
      this.poly(g, [this.P(0, a - 0.1, z0 - 2), this.P(0, b + 0.1, z0 - 2), this.P(0, b + 0.1, z1 + 2), this.P(0, a - 0.1, z1 + 2)], '#5a3d2b')
      this.poly(g, [this.P(0, a, z0), this.P(0, b, z0), this.P(0, b, z1), this.P(0, a, z1)], '#18204a')
      for (let k = 0; k < 8; k++) {
        const s = this.P(0, a + hash(a * 13 + k) * (b - a), z0 + 2 + hash(k * 5 + a) * (z1 - z0 - 4))
        g.fillStyle = k % 3 === 0 ? '#ffe9b0' : '#9fb3ff'
        g.fillRect(s.x, s.y, 1, 1)
      }
    }
    windowRight(6.4, 7.6, 24, 46)
    windowRight(1.5, 3.5, 24, 46)
    windowLeft(6.2, 8.8, 30, 48)

    // moon
    const moon = this.P(7.25, 0, 40)
    g.fillStyle = '#ffe9b0'
    g.fillRect(moon.x - 2, moon.y - 1, 4, 3)
    g.fillRect(moon.x - 1, moon.y - 2, 2, 5)

    // lab poster </>
    this.poly(g, [this.P(0, 11.2, 24), this.P(0, 12.8, 24), this.P(0, 12.8, 44), this.P(0, 11.2, 44)], '#0d1f15')
    for (let k = 0; k < 4; k++) {
      const s = this.P(0, 11.45, 40 - k * 4)
      g.fillStyle = k === 0 ? '#4ade80' : '#22663f'
      g.fillRect(s.x, s.y, 8 + ((k * 5) % 9), 1)
    }

    // pantry clock
    const clock = this.P(4.2, 0, 40)
    g.fillStyle = '#f3e9d7'
    g.fillRect(clock.x - 3, clock.y - 3, 6, 6)
    g.fillStyle = '#2a211d'
    g.fillRect(clock.x, clock.y - 2, 1, 3)
    g.fillRect(clock.x, clock.y, 2, 1)

    this.staticLayer = c
  }

  // ---------- furniture ----------

  private drawFurniture(g: CanvasRenderingContext2D, f: Furniture) {
    const { x, y, seed } = f
    const t = this.t
    switch (f.kind) {
      case 'desk-pc': {
        this.box(g, x + 0.1, y + 0.15, 0.8, 0.7, 0, 10, '#8a6448', '#6b4a34', '#573b29')
        const c = this.P(x + 0.5, y + 0.5, 10)
        g.fillStyle = '#1a1a24'
        g.fillRect(c.x - 7, c.y - 13, 14, 10)
        g.fillStyle = '#0b2015'
        g.fillRect(c.x - 6, c.y - 12, 12, 8)
        const scroll = Math.floor(t * 3 + seed)
        for (let i = 0; i < 4; i++) {
          const w = 2 + Math.floor(hash(scroll + i + seed) * 8)
          const indent = Math.floor(hash(scroll * 2 + i) * 3)
          g.fillStyle = i === 3 && Math.floor(t * 2) % 2 ? '#bbf7d0' : i % 2 ? '#22c55e' : '#4ade80'
          g.fillRect(c.x - 5 + indent, c.y - 11 + i * 2, Math.min(w, 10 - indent), 1)
        }
        g.fillStyle = '#1a1a24'
        g.fillRect(c.x - 1, c.y - 3, 2, 3)
        g.fillStyle = '#3a3a4a'
        g.fillRect(c.x - 4, c.y + 1, 8, 2)
        break
      }
      case 'rack': {
        const x0 = x + 0.1
        const y0 = y + 0.15
        this.box(g, x0, y0, 0.8, 0.7, 0, 32, '#3a3a48', '#24242f', '#1a1a22')
        for (let r = 0; r < 6; r++) {
          const z = 5 + r * 4.4
          const ls = this.P(x0 + 0.04, y0 + 0.7, z + 1)
          const le = this.P(x0 + 0.76, y0 + 0.7, z + 1)
          g.strokeStyle = '#15151c'
          g.beginPath()
          g.moveTo(ls.x, ls.y)
          g.lineTo(le.x, le.y)
          g.stroke()
          for (let i = 0; i < 4; i++) {
            const p = this.P(x0 + 0.12 + i * 0.16, y0 + 0.7, z + 3)
            const h = hash(seed * 31 + r * 7 + i * 13 + Math.floor(t * (2 + hash(seed + r + i) * 6)))
            const on = h > 0.35
            const color = i === 0 ? (on ? '#f87171' : '#4a1d1d') : i === 3 ? (on ? '#fbbf24' : '#3d2e10') : on ? '#4ade80' : '#163a22'
            g.fillStyle = color
            g.fillRect(p.x, p.y, 2, 1)
          }
        }
        break
      }
      case 'board': {
        const c = this.P(x + 0.5, y + 0.5, 0)
        g.fillStyle = '#5a3d2b'
        g.fillRect(c.x - 12, c.y - 14, 2, 14)
        g.fillRect(c.x + 10, c.y - 14, 2, 14)
        g.fillStyle = '#c9b48a'
        g.fillRect(c.x - 16, c.y - 36, 32, 22)
        g.fillStyle = '#f3ead8'
        g.fillRect(c.x - 15, c.y - 35, 30, 20)
        g.fillStyle = '#a78bfa'
        g.fillRect(c.x - 15, c.y - 35, 30, 3)
        const cols = [
          ['#fde047', '#fde047', '#f9a8d4'],
          ['#67e8f9', '#fde047'],
          ['#86efac', '#86efac', '#86efac'],
        ]
        cols.forEach((col, ci) => {
          g.fillStyle = '#d6cbb3'
          g.fillRect(c.x - 15 + ci * 10 + 9, c.y - 31, 1, 15)
          col.forEach((color, ri) => {
            const wob = ci === 1 && ri === 1 ? Math.round(Math.sin(t * 2)) : 0
            g.fillStyle = color
            g.fillRect(c.x - 13 + ci * 10, c.y - 30 + ri * 5 + wob, 6, 4)
          })
        })
        break
      }
      case 'founder-desk': {
        this.box(g, x, y + 0.1, 1, 0.8, 0, 11, '#6b4a8a', '#4a3366', '#3b2852')
        const c = this.P(x + 0.5, y + 0.5, 11)
        if (x % 2 === 1) {
          g.fillStyle = '#1a1a24'
          g.fillRect(c.x - 7, c.y - 12, 14, 9)
          g.fillStyle = '#1e1640'
          g.fillRect(c.x - 6, c.y - 11, 12, 7)
          const bars = [3, 5, 4, 6]
          bars.forEach((h, i) => {
            g.fillStyle = '#a78bfa'
            const hh = Math.max(1, h - (Math.floor(t * 2 + i) % 3 === 0 ? 1 : 0))
            g.fillRect(c.x - 5 + i * 3, c.y - 5 - hh, 2, hh)
          })
          g.fillStyle = '#1a1a24'
          g.fillRect(c.x - 1, c.y - 3, 2, 3)
        } else {
          g.fillStyle = '#f3e9d7'
          g.fillRect(c.x - 6, c.y - 2, 7, 4)
          g.fillStyle = '#ffb46b'
          g.fillRect(c.x + 2, c.y - 5, 4, 5)
          g.fillStyle = '#e8e2f0'
          g.fillRect(c.x + 3, c.y - 4, 2, 1)
          // desk lamp
          g.fillStyle = '#2a2147'
          g.fillRect(c.x - 4, c.y - 12, 1, 10)
          g.fillStyle = '#ffd38a'
          g.fillRect(c.x - 6, c.y - 14, 5, 3)
        }
        break
      }
      case 'plant': {
        this.box(g, x + 0.3, y + 0.3, 0.4, 0.4, 0, 7, '#c2703d', '#9a542a', '#7d4321')
        const c = this.P(x + 0.5, y + 0.5, 7)
        const sway = Math.round(Math.sin(t * 1.5 + seed) * 1)
        g.fillStyle = '#2f7a3d'
        g.fillRect(c.x - 5 + sway, c.y - 8, 10, 6)
        g.fillStyle = '#3f9a4e'
        g.fillRect(c.x - 3 + sway, c.y - 12, 6, 6)
        g.fillRect(c.x - 6 + sway, c.y - 6, 3, 3)
        g.fillStyle = '#5bbf63'
        g.fillRect(c.x - 1 + sway, c.y - 14, 2, 4)
        g.fillRect(c.x + 3 + sway, c.y - 9, 2, 2)
        break
      }
      case 'counter':
      case 'coffee': {
        this.box(g, x + 0.1, y, 0.8, 1, 0, 13, '#a07a58', '#6b4a34', '#573b29')
        if (f.kind === 'coffee') {
          const c = this.P(x + 0.5, y + 0.5, 13)
          g.fillStyle = '#2a2a33'
          g.fillRect(c.x - 5, c.y - 13, 10, 12)
          g.fillStyle = '#3d3d4a'
          g.fillRect(c.x - 4, c.y - 12, 8, 3)
          g.fillStyle = Math.floor(t * 2) % 2 ? '#f87171' : '#7f1d1d'
          g.fillRect(c.x + 2, c.y - 11, 1, 1)
          g.fillStyle = '#f3e9d7'
          g.fillRect(c.x - 2, c.y - 4, 4, 3)
        } else {
          const c = this.P(x + 0.5, y + 0.5, 13)
          g.fillStyle = '#ffb46b'
          g.fillRect(c.x - 4, c.y - 4, 3, 3)
          g.fillStyle = '#60a5fa'
          g.fillRect(c.x + 1, c.y - 3, 3, 3)
        }
        break
      }
      case 'fridge': {
        this.box(g, x + 0.1, y + 0.1, 0.8, 0.8, 0, 34, '#e8e4f2', '#c9c3da', '#a9a2c0')
        const h1 = this.P(x + 0.9, y + 0.3, 24)
        g.fillStyle = '#6b6585'
        g.fillRect(h1.x, h1.y, 1, 4)
        const magnet = this.P(x + 0.5, y + 0.9, 20)
        g.fillStyle = '#f472b6'
        g.fillRect(magnet.x, magnet.y, 2, 2)
        break
      }
      case 'table': {
        const c0 = this.P(x + 0.5, y + 0.5, 0)
        g.fillStyle = '#4a3426'
        g.fillRect(c0.x - 1, c0.y - 8, 2, 8)
        this.box(g, x + 0.15, y + 0.15, 0.7, 0.7, 8, 2, '#a07a58', '#6b4a34', '#573b29')
        const c = this.P(x + 0.5, y + 0.5, 10)
        g.fillStyle = '#f3e9d7'
        g.fillRect(c.x - 5, c.y - 3, 3, 3)
        g.fillStyle = '#facc15'
        g.fillRect(c.x + 2, c.y - 2, 3, 3)
        break
      }
      case 'sofa': {
        this.box(g, x, y + 0.2, 1, 0.7, 0, 6, '#d9774a', '#b45a32', '#93472a')
        this.box(g, x, y + 0.7, 1, 0.25, 6, 7, '#e08a5c', '#b45a32', '#93472a')
        break
      }
      case 'reception': {
        this.box(g, x, y + 0.2, 1, 0.7, 0, 14, '#f2c94c', '#9a7424', '#7d5d1b')
        if (x % 2 === 1) {
          const c = this.P(x + 0.5, y + 0.55, 14)
          g.fillStyle = '#d4d4d8'
          g.fillRect(c.x - 2, c.y - 3, 4, 2)
          g.fillRect(c.x - 1, c.y - 4, 2, 1)
        } else {
          const c = this.P(x + 0.5, y + 0.55, 14)
          g.fillStyle = '#1a1a24'
          g.fillRect(c.x - 5, c.y - 9, 10, 7)
          g.fillStyle = '#3d3216'
          g.fillRect(c.x - 4, c.y - 8, 8, 5)
          g.fillStyle = '#facc15'
          g.fillRect(c.x - 3, c.y - 7, 6, 1)
          g.fillRect(c.x - 3, c.y - 5, 4, 1)
        }
        break
      }
      case 'arcade': {
        this.box(g, x + 0.15, y + 0.15, 0.7, 0.7, 0, 30, '#4b3a8a', '#3b2a6b', '#2a1e4f')
        const c = this.P(x + 0.5, y + 0.85, 20)
        const hue = Math.floor(t * 3) % 3
        g.fillStyle = '#0b0b16'
        g.fillRect(c.x - 5, c.y - 6, 9, 7)
        g.fillStyle = ['#22d3ee', '#f472b6', '#facc15'][hue]
        g.fillRect(c.x - 4, c.y - 5, 7, 5)
        g.fillStyle = '#0b0b16'
        g.fillRect(c.x - 2 + (Math.floor(t * 4) % 4), c.y - 3, 2, 2)
        const btn = this.P(x + 0.5, y + 0.85, 12)
        g.fillStyle = '#f87171'
        g.fillRect(btn.x - 3, btn.y, 2, 1)
        g.fillStyle = '#4ade80'
        g.fillRect(btn.x + 1, btn.y, 2, 1)
        break
      }
      case 'shelf': {
        const x0 = x + 0.1
        const y0 = y + 0.15
        this.box(g, x0, y0, 0.8, 0.7, 0, 26, '#5a3d2b', '#4a3226', '#3b281e')
        const colors = ['#f87171', '#60a5fa', '#facc15', '#4ade80', '#a78bfa', '#f472b6']
        for (let r = 0; r < 3; r++) {
          for (let i = 0; i < 5; i++) {
            const p = this.P(x0 + 0.08 + i * 0.14, y0 + 0.7, 4 + r * 8)
            g.fillStyle = colors[Math.floor(hash(seed + r * 5 + i) * colors.length)]
            g.fillRect(p.x, p.y - 5, 2, 5 - Math.floor(hash(seed * 2 + i + r) * 2))
          }
        }
        break
      }
      case 'cooler': {
        this.box(g, x + 0.25, y + 0.25, 0.5, 0.5, 0, 14, '#e8e4f2', '#c9c3da', '#a9a2c0')
        const c = this.P(x + 0.5, y + 0.5, 14)
        g.fillStyle = '#7dd3fc'
        g.fillRect(c.x - 3, c.y - 10, 6, 9)
        g.fillStyle = '#bae6fd'
        g.fillRect(c.x - 2, c.y - 9, 1, 6)
        break
      }
    }
  }

  private drawActor(g: CanvasRenderingContext2D, a: Actor) {
    const p = this.P(a.x, a.y, 0)
    const frame = a.moving ? Math.floor(a.walkT * 8) % 2 : 0
    const bob = a.moving ? frame : Math.round(Math.sin(this.t * 2 + a.x) * 0.5 + 0.5) * 0

    g.fillStyle = 'rgba(0,0,0,0.35)'
    g.fillRect(p.x - 4, p.y - 1, 8, 2)
    g.fillRect(p.x - 3, p.y - 2, 6, 4)

    g.fillStyle = a.pants
    if (a.moving) {
      g.fillRect(p.x - 3, p.y - 5 + (frame ? 0 : 1), 2, frame ? 4 : 3)
      g.fillRect(p.x + 1, p.y - 5 + (frame ? 1 : 0), 2, frame ? 3 : 4)
    } else {
      g.fillRect(p.x - 3, p.y - 5, 2, 4)
      g.fillRect(p.x + 1, p.y - 5, 2, 4)
    }

    const by = p.y - 11 - bob
    g.fillStyle = a.shirt
    g.fillRect(p.x - 4, by, 8, 7)
    g.fillStyle = a.skin
    const swing = a.moving ? (frame ? 1 : -1) : 0
    g.fillRect(p.x - 5, by + 2 + swing, 1, 4)
    g.fillRect(p.x + 4, by + 2 - swing, 1, 4)

    const hy = by - 7
    g.fillStyle = a.skin
    g.fillRect(p.x - 3, hy, 6, 7)
    g.fillStyle = a.hair
    g.fillRect(p.x - 4, hy - 1, 8, 3)
    if (a.dir === 'up') {
      g.fillRect(p.x - 4, hy, 8, 6)
    } else if (a.dir === 'left') {
      g.fillRect(p.x + 1, hy, 3, 5)
      g.fillStyle = '#1a1a24'
      g.fillRect(p.x - 2, hy + 3, 1, 2)
    } else if (a.dir === 'right') {
      g.fillRect(p.x - 4, hy, 3, 5)
      g.fillStyle = '#1a1a24'
      g.fillRect(p.x + 1, hy + 3, 1, 2)
    } else {
      g.fillRect(p.x - 4, hy, 1, 4)
      g.fillRect(p.x + 3, hy, 1, 4)
      g.fillStyle = '#1a1a24'
      g.fillRect(p.x - 2, hy + 3, 1, 2)
      g.fillRect(p.x + 1, hy + 3, 1, 2)
      g.fillStyle = '#e89a8a'
      g.fillRect(p.x - 3, hy + 5, 1, 1)
      g.fillRect(p.x + 2, hy + 5, 1, 1)
    }

    if (a.isPlayer) {
      const ay = hy - 7 + Math.round(Math.sin(this.t * 4) * 1.5)
      const inRoom = this.currentRoom && !a.moving
      if (inRoom) {
        const room = ROOMS.find((r) => r.id === this.currentRoom)!
        g.fillStyle = '#0f0f1a'
        g.fillRect(p.x - 4, ay - 6, 9, 9)
        g.fillStyle = room.palette.accent
        g.fillRect(p.x - 3, ay - 5, 7, 7)
        g.fillStyle = '#0f0f1a'
        g.fillRect(p.x, ay - 4, 1, 3)
        g.fillRect(p.x, ay, 1, 1)
        g.fillStyle = room.palette.accent
        g.fillRect(p.x - 1, ay + 3, 3, 1)
        g.fillRect(p.x, ay + 4, 1, 1)
      } else {
        g.fillStyle = '#ffb46b'
        g.fillRect(p.x - 2, ay, 5, 1)
        g.fillRect(p.x - 1, ay + 1, 3, 1)
        g.fillRect(p.x, ay + 2, 1, 1)
      }
    }
  }

  private drawStringLights(g: CanvasRenderingContext2D) {
    const bulbs: Vec[] = []
    for (let i = 0; i <= N * 2; i++) {
      const u = i / 2
      const sag = Math.abs(Math.sin((u * Math.PI) / 2.5)) * 4
      bulbs.push(this.P(u, 0, WALL_H - 4 - sag))
    }
    for (let i = 1; i <= N * 2; i++) {
      const u = i / 2
      const sag = Math.abs(Math.sin((u * Math.PI) / 2.5)) * 4
      bulbs.push(this.P(0, u, WALL_H - 4 - sag))
    }
    const colors = ['#ffd38a', '#ffb46b', '#f9a8d4', '#fde68a']
    bulbs.forEach((b, i) => {
      const tw = Math.sin(this.t * 2 + i * 1.7) > -0.6
      g.fillStyle = tw ? colors[i % colors.length] : '#5a4632'
      g.fillRect(b.x, b.y, 2, 2)
    })
    return bulbs
  }

  private drawSigns(g: CanvasRenderingContext2D) {
    this.signs = []
    g.font = `8px ${this.font}`
    g.textBaseline = 'top'
    ROOMS.forEach((r, i) => {
      const cx = r.rect.x + r.rect.w / 2
      const cy = r.rect.y + r.rect.h / 2
      const base = this.P(cx, cy, 0)
      const lift = r.id === 'server' ? 58 : r.id === 'founder' ? 62 : 46
      const bobY = Math.round(Math.sin(this.t * 2 + i) * 1.5)
      const text = r.name
      const tw = Math.ceil(g.measureText(text).width)
      const w = tw + 10
      const h = 14
      const x = base.x - Math.round(w / 2)
      const y = base.y - lift + bobY
      const active = this.currentRoom === r.id

      g.fillStyle = 'rgba(0,0,0,0.5)'
      g.fillRect(x + 2, y + 2, w, h)
      g.fillStyle = '#0f0f1a'
      g.fillRect(x, y, w, h)
      g.fillStyle = r.palette.accent
      g.fillRect(x, y, w, 1)
      g.fillRect(x, y + h - 1, w, 1)
      g.fillRect(x, y, 1, h)
      g.fillRect(x + w - 1, y, 1, h)
      if (active) {
        g.fillStyle = r.palette.accent
        g.fillRect(x + 1, y + 1, w - 2, h - 2)
      }
      g.fillStyle = r.palette.accent
      g.fillRect(base.x - 1, y + h, 3, 1)
      g.fillRect(base.x, y + h + 1, 1, 1)
      g.fillStyle = active ? '#0f0f1a' : r.palette.accent
      g.fillText(text, x + 5, y + 3)

      this.signs.push({ id: r.id, x: x + this.cam.x, y: y + this.cam.y, w, h: h + 2 })
    })
  }

  // ---------- frame ----------

  private updateCamera() {
    const vw = this.buf.width
    const vh = this.buf.height
    const minX = -N * HW - 20
    const maxX = N * HW + 20
    const minY = -WALL_H - 48
    const maxY = N * HH * 2 + 24
    const ps = iso(this.player.x, this.player.y)
    let tx: number
    let ty: number
    if (maxX - minX <= vw) tx = (minX + maxX) / 2 - vw / 2
    else tx = Math.max(minX, Math.min(maxX - vw, ps.x - vw / 2))
    if (maxY - minY <= vh) ty = (minY + maxY) / 2 - vh / 2
    else ty = Math.max(minY, Math.min(maxY - vh, ps.y - 12 - vh / 2))
    if (!this.camReady) {
      this.cam.x = tx
      this.cam.y = ty
      this.camReady = true
    } else {
      this.cam.x += (tx - this.cam.x) * 0.12
      this.cam.y += (ty - this.cam.y) * 0.12
    }
  }

  private render() {
    if (!this.cssW || !this.buf.width) return
    if (!this.staticLayer) this.buildStatic()
    this.updateCamera()

    const g = this.b
    const cx = Math.round(this.cam.x)
    const cy = Math.round(this.cam.y)
    this.ox = -cx
    this.oy = -cy

    g.globalCompositeOperation = 'source-over'
    g.fillStyle = BG
    g.fillRect(0, 0, this.buf.width, this.buf.height)
    g.drawImage(this.staticLayer!, -cx - this.staticOffset.x, -cy - this.staticOffset.y)

    const bulbs = this.drawStringLights(g)

    if (this.tapMarker) {
      const m = this.P(this.tapMarker.x, this.tapMarker.y, 0)
      const s = 3 + Math.round((Math.sin(this.tapMarker.t * 8) + 1) * 1.5)
      g.fillStyle = '#ffb46b'
      g.fillRect(m.x - s * 2, m.y, 2, 1)
      g.fillRect(m.x + s * 2 - 2, m.y, 2, 1)
      g.fillRect(m.x, m.y - s, 1, 1)
      g.fillRect(m.x, m.y + s, 1, 1)
    }

    const drawables: Array<{ depth: number; draw: () => void }> = []
    for (const f of this.furniture) drawables.push({ depth: f.x + f.y + 1, draw: () => this.drawFurniture(g, f) })
    for (const n of this.npcs) drawables.push({ depth: n.x + n.y + 0.01, draw: () => this.drawActor(g, n) })
    drawables.push({ depth: this.player.x + this.player.y + 0.02, draw: () => this.drawActor(g, this.player) })
    drawables.sort((a, b) => a.depth - b.depth)
    for (const d of drawables) d.draw()

    for (const pt of this.particles) {
      const p = this.P(pt.x, pt.y, pt.z)
      if (pt.kind === 'dust') {
        const a = Math.sin((pt.life / pt.max) * Math.PI) * 0.5
        g.fillStyle = `rgba(255,211,138,${a.toFixed(2)})`
        g.fillRect(p.x, p.y, 1, 1)
      } else {
        const a = (1 - pt.life / pt.max) * 0.5
        g.fillStyle = `rgba(243,233,215,${a.toFixed(2)})`
        g.fillRect(p.x, p.y, 2, 2)
      }
    }

    // cozy lighting
    g.globalCompositeOperation = 'lighter'
    const flick = 0.92 + Math.sin(this.t * 7) * 0.03 + Math.sin(this.t * 13) * 0.02
    for (const r of ROOMS) {
      const c = this.P(r.rect.x + r.rect.w / 2, r.rect.y + r.rect.h / 2, 10)
      this.glow(g, c.x, c.y, 80, r.palette.glow, 0.13 * flick)
    }
    const pantry = this.P(2.5, 2.5, 10)
    this.glow(g, pantry.x, pantry.y, 80, '255,180,107', 0.14 * flick)
    const lamp = this.P(8.4, 7.4, 22)
    this.glow(g, lamp.x, lamp.y, 30, '255,211,138', 0.25 * flick)
    for (const f of this.furniture) {
      if (f.kind === 'desk-pc') {
        const c = this.P(f.x + 0.5, f.y + 0.5, 18)
        this.glow(g, c.x, c.y, 16, '74,222,128', 0.18)
      } else if (f.kind === 'arcade') {
        const c = this.P(f.x + 0.5, f.y + 0.85, 18)
        this.glow(g, c.x, c.y, 16, '34,211,238', 0.15)
      }
    }
    for (let i = 0; i < bulbs.length; i += 3) this.glow(g, bulbs[i].x + 1, bulbs[i].y + 1, 8, '255,190,120', 0.12)
    g.globalCompositeOperation = 'source-over'

    this.drawSigns(g)

    const ctx = this.ctx
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    ctx.drawImage(this.buf, 0, 0, this.buf.width * this.zoom * this.dpr, this.buf.height * this.zoom * this.dpr)
  }
}
