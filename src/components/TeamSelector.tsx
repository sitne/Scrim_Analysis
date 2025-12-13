'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Team {
    id: string
    name: string
}

interface TeamSelectorProps {
    teams: Team[]
    currentTeamId: string | null
}

export function TeamSelector({ teams, currentTeamId }: TeamSelectorProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const handleChange = (teamId: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('team', teamId)
        router.push(`/?${params.toString()}`)
    }

    if (teams.length <= 1) {
        return null
    }

    return (
        <select
            value={currentTeamId || ''}
            onChange={(e) => handleChange(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
            {teams.map((team) => (
                <option key={team.id} value={team.id}>
                    {team.name}
                </option>
            ))}
        </select>
    )
}
