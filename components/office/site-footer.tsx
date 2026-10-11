import { GITHUB_PROFILE_URL } from '@/lib/office-data'
import { GithubIcon } from './github-icon'

export function SiteFooter() {
  return (
    <footer className="flex h-11 shrink-0 items-center justify-between gap-3 border-t-2 border-border bg-card px-3 pb-[env(safe-area-inset-bottom)] sm:px-5">
      <p className="font-pixel text-[8px] text-muted-foreground sm:text-[10px]">
        {'© 2026 RLLIE833'}
      </p>
      <a
        href={GITHUB_PROFILE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 border-2 border-border bg-background px-2 py-1 font-pixel text-[8px] text-foreground transition-colors hover:border-warm hover:text-warm focus-visible:outline-2 focus-visible:outline-warm sm:text-[10px]"
      >
        <GithubIcon className="size-4" />
        <span>github.com/rllibo833-sudo</span>
      </a>
    </footer>
  )
}
