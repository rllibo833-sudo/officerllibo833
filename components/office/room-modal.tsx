'use client'

import { useEffect, useRef } from 'react'
import { ExternalLink, Play, X } from 'lucide-react'
import type { Room } from '@/lib/office-data'
import { GithubIcon } from './github-icon'

type RoomModalProps = {
  room: Room
  onClose: () => void
}

export function RoomModal({ room, onClose }: RoomModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [onClose])

  const accent = room.palette.accent

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/75 p-3 backdrop-blur-[2px] animate-in fade-in sm:items-center"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-modal-title"
        aria-describedby="room-modal-desc"
        className="relative w-full max-w-md border-4 bg-card pixel-shadow animate-in slide-in-from-bottom-4 zoom-in-95 duration-200"
        style={{ borderColor: accent }}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ backgroundColor: accent }}>
          <p className="font-pixel text-[8px] text-background">{'> ENTERING ROOM'}</p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="grid size-7 place-items-center border-2 border-background bg-background/10 text-background transition-colors hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background"
          >
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-2">
            <h2 id="room-modal-title" className="font-pixel text-base leading-relaxed sm:text-lg" style={{ color: accent }}>
              {room.name}
            </h2>
            <p className="flex items-center gap-2 text-lg text-muted-foreground">
              <GithubIcon className="size-4 shrink-0" />
              <span className="truncate">{room.repo}</span>
            </p>
          </div>

          <div id="room-modal-desc" className="flex flex-col gap-2 border-2 border-border bg-background p-3">
            <p className="text-xl leading-tight text-warm">{room.tagline}</p>
            <p className="text-lg leading-snug text-foreground/90">{room.description}</p>
          </div>

          <ul className="flex flex-wrap gap-2" aria-label="Tags">
            {room.tags.map((tag) => (
              <li
                key={tag}
                className="border-2 px-2 py-0.5 font-pixel text-[8px]"
                style={{ borderColor: accent, color: accent }}
              >
                {tag}
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <a
              href={room.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 border-2 border-background px-3 py-3 font-pixel text-[10px] text-background pixel-shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              style={{ backgroundColor: accent }}
            >
              <GithubIcon className="size-4" />
              Open GitHub Repo
            </a>
            <a
              href={room.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 border-2 bg-background px-3 py-3 font-pixel text-[10px] pixel-shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              style={{ borderColor: accent, color: accent }}
            >
              <Play className="size-4" aria-hidden="true" />
              View Live Demo
              <ExternalLink className="size-3" aria-hidden="true" />
              <span className="sr-only">(opens in new tab)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
