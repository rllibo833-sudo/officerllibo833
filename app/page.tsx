import { OfficeGame } from '@/components/office/office-game'
import { SiteFooter } from '@/components/office/site-footer'
import { TopBar } from '@/components/office/top-bar'

export default function Page() {
  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background">
      <TopBar />
      <OfficeGame />
      <SiteFooter />
    </main>
  )
}
