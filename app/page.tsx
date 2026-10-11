import { OfficeGame } from '@/components/office/office-game'
import { RepoLinksSeo } from '@/components/office/repo-links-seo'
import { SiteFooter } from '@/components/office/site-footer'
import { TopBar } from '@/components/office/top-bar'

export default function Page() {
  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background">
      <TopBar />
      <h1 className="sr-only">OFFICE-RLLIBO833 - Kawasan Masjid 1000Ha Hub</h1>
      <OfficeGame />
      <RepoLinksSeo />
      <SiteFooter />
    </main>
  )
}
