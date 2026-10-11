'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ROOM_BY_ID, type RoomId } from '@/lib/office-data'
import { OfficeEngine } from './engine'
import { RoomModal } from './room-modal'

export function OfficeGame() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<OfficeEngine | null>(null)
  const [currentRoom, setCurrentRoom] = useState<RoomId | null>(null)
  const [openRoom, setOpenRoom] = useState<RoomId | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const engine = new OfficeEngine(canvas, {
      onRoomChange: setCurrentRoom,
      onRoomActivate: setOpenRoom,
    })
    engineRef.current = engine
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      engine.resize(width, height)
    })
    ro.observe(container)
    engine.start()
    return () => {
      ro.disconnect()
      engine.destroy()
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    engineRef.current?.setPaused(openRoom !== null)
  }, [openRoom])

  const closeModal = useCallback(() => setOpenRoom(null), [])
  const room = currentRoom ? ROOM_BY_ID[currentRoom] : null

  return (
    <section aria-label="Office mini game" className="relative min-h-0 flex-1 overflow-hidden">
      <div ref={containerRef} className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className="block size-full touch-none select-none"
          style={{ cursor: 'crosshair' }}
          aria-label="Isometric pixel office. Use WASD or arrow keys to walk, or tap the floor. Tap a room to open its repo."
          role="img"
        />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(15,15,26,0.55) 80%, rgba(15,15,26,0.9) 100%)',
        }}
      />

      <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-2">
        <p
          className="border-2 bg-background/90 px-2 py-1.5 font-pixel text-[8px] pixel-shadow-sm sm:text-[10px]"
          style={{ borderColor: room?.palette.accent ?? 'var(--border)', color: room?.palette.accent ?? 'var(--muted-foreground)' }}
          aria-live="polite"
        >
          {'LOC: '}
          {room ? room.name : 'HALLWAY'}
        </p>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3">
        {room ? (
          <button
            type="button"
            onClick={() => setOpenRoom(room.id)}
            className="pointer-events-auto flex items-center gap-2 border-2 border-background px-4 py-3 font-pixel text-[10px] text-background pixel-shadow transition-transform hover:-translate-y-0.5 active:translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            style={{ backgroundColor: room.palette.accent }}
          >
            {'VIEW REPO'}
            <span className="hidden border border-background/60 px-1 sm:inline">E</span>
          </button>
        ) : (
          <p className="border-2 border-border bg-background/85 px-3 py-2 text-center font-pixel text-[8px] leading-relaxed text-muted-foreground sm:text-[10px]">
            <span className="hidden sm:inline">{'WASD / ARROWS TO WALK · CLICK A ROOM'}</span>
            <span className="sm:hidden">{'TAP FLOOR TO WALK · TAP A ROOM'}</span>
          </p>
        )}
      </div>

      {openRoom && <RoomModal room={ROOM_BY_ID[openRoom]} onClose={closeModal} />}
    </section>
  )
}
