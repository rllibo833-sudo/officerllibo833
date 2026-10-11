import { GITHUB_PROFILE_URL, ROOMS } from '@/lib/office-data'

export function RepoLinksSeo() {
  return (
    <nav aria-label="GitHub repositories" className="sr-only">
      <h2>OFFICE-RLLIBO833 repositories</h2>
      <ul>
        {ROOMS.map((room) => (
          <li key={room.id}>
            <a href={room.repoUrl} target="_blank" rel="noopener noreferrer">
              {room.name}
            </a>
            {` — ${room.description}`}
          </li>
        ))}
        <li>
          <a href={GITHUB_PROFILE_URL} target="_blank" rel="noopener noreferrer">
            github.com/rllibo833-sudo
          </a>
        </li>
      </ul>
    </nav>
  )
}
