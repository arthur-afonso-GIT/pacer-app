import { Avatar, Surface } from '@/design-system'
import type { GroupLeaderboardEntry } from './api'

export function GroupLeaderboard({
  entries,
  currentUserId,
}: {
  entries: GroupLeaderboardEntry[]
  currentUserId?: string | undefined
}) {
  return (
    <Surface
      as="section"
      className="grid gap-3 p-4"
      aria-labelledby="group-leaderboard-title"
    >
      <h2 id="group-leaderboard-title" className="text-xl font-black">
        Ranking do grupo
      </h2>
      <p className="text-secondary text-sm">
        Total de pontos aprovados nos posts e desafios deste grupo, descontando
        estornos. Empates compartilham a posição.
      </p>
      {entries.length === 0 ? (
        <p className="text-secondary text-sm">
          Nenhum participante no ranking.
        </p>
      ) : (
        <ol className="grid gap-2">
          {entries.map((entry) => (
            <li
              key={entry.user_id}
              className={`flex items-center gap-3 rounded-xl p-3 ${entry.user_id === currentUserId ? 'bg-accent-soft' : 'bg-canvas'}`}
            >
              <span
                aria-label={`Posição ${entry.rank}`}
                className="text-accent min-w-8 font-black"
              >
                #{entry.rank}
              </span>
              <Avatar
                {...(entry.avatar_url ? { src: entry.avatar_url } : {})}
                fallback={entry.display_name.slice(0, 2).toUpperCase()}
              />
              <span className="min-w-0 flex-1 truncate font-bold">
                {entry.display_name}
                {entry.user_id === currentUserId && (
                  <span className="text-secondary text-xs"> (você)</span>
                )}
              </span>
              <span className="shrink-0 font-black">
                {entry.points.toLocaleString('pt-BR')} pts
              </span>
            </li>
          ))}
        </ol>
      )}
    </Surface>
  )
}
