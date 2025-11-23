import { createFileRoute } from '@tanstack/solid-router'
import { SongDiscover } from '~/view/song/discover'

export const Route = createFileRoute('/song/')({
  component: SongDiscover,
})
