'use client'

import { useState, useEffect } from 'react'

interface RosterPlayer {
    id: string
    puuid: string
    player: {
        puuid: string
        gameName: string
        tagLine: string
        alias: string | null
    }
}

interface RosterManagerProps {
    teamId: string
}

export function RosterManager({ teamId }: RosterManagerProps) {
    const [players, setPlayers] = useState<RosterPlayer[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [removing, setRemoving] = useState<string | null>(null)

    useEffect(() => {
        fetchRoster()
    }, [teamId])

    const fetchRoster = async () => {
        try {
            const response = await fetch(`/api/team/${teamId}/roster`)
            if (response.ok) {
                const data = await response.json()
                setPlayers(data)
            } else {
                setError('ロスターの取得に失敗しました')
            }
        } catch (err) {
            setError('ロスターの取得に失敗しました')
        } finally {
            setLoading(false)
        }
    }

    const handleRemove = async (puuid: string) => {
        setRemoving(puuid)
        try {
            const response = await fetch(`/api/team/${teamId}/roster?puuid=${puuid}`, {
                method: 'DELETE'
            })
            if (response.ok) {
                setPlayers(prev => prev.filter(p => p.puuid !== puuid))
            } else {
                setError('削除に失敗しました')
            }
        } catch (err) {
            setError('削除に失敗しました')
        } finally {
            setRemoving(null)
        }
    }

    if (loading) {
        return (
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h2 className="text-lg font-semibold text-white mb-4">チームロスター</h2>
                <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 bg-gray-800 rounded-lg" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-2">チームロスター</h2>
            <p className="text-sm text-gray-500 mb-4">
                このチームのValorantプレイヤー。自チーム判定に使用します。
            </p>

            {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-sm mb-4">
                    {error}
                </div>
            )}

            {players.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <p>ロスターが未設定です</p>
                    <p className="text-sm mt-1">マッチをアップロードすると自動で設定できます</p>
                </div>
            ) : (
                <ul className="space-y-2">
                    {players.map((rp) => (
                        <li
                            key={rp.puuid}
                            className="flex items-center justify-between px-4 py-3 bg-gray-800 rounded-lg"
                        >
                            <div>
                                <span className="text-white font-medium">
                                    {rp.player.alias || rp.player.gameName}
                                </span>
                                <span className="text-gray-500 ml-1">#{rp.player.tagLine}</span>
                            </div>
                            <button
                                onClick={() => handleRemove(rp.puuid)}
                                disabled={removing === rp.puuid}
                                className="text-red-400 hover:text-red-300 disabled:opacity-50 text-sm"
                            >
                                {removing === rp.puuid ? '削除中...' : '削除'}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
