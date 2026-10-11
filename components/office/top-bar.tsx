export function TopBar() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b-2 border-border bg-card px-3 sm:px-5">
      <h1 className="flex items-center gap-2 font-pixel text-[10px] tracking-wider text-warm sm:text-xs">
        <span aria-hidden="true" className="grid size-4 grid-cols-2 gap-px">
          <span className="bg-lab" />
          <span className="bg-server" />
          <span className="bg-founder" />
          <span className="bg-lobby" />
        </span>
        OFFICE-RLLIE833.COM
        <span aria-hidden="true" className="animate-blink">
          _
        </span>
      </h1>
      <p className="flex items-center gap-2 font-pixel text-[8px] text-muted-foreground sm:text-[10px]">
        <span aria-hidden="true" className="size-2 animate-pulse bg-lab" />
        <span>ONLINE</span>
      </p>
    </header>
  )
}
