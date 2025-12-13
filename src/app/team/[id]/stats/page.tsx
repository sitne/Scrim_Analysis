import { redirect } from 'next/navigation'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function TeamStatsPage({ params }: PageProps) {
    const { id } = await params

    // Redirect to main stats page with team filter
    redirect(`/stats?team=${id}`)
}
