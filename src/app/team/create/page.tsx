'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CreateTeamPage() {
    const [name, setName] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            const response = await fetch('/api/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.error || 'チームの作成に失敗しました')
                return
            }

            router.push('/team')
            router.refresh()
        } catch {
            setError('チームの作成に失敗しました')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
            <div className="w-full max-w-md">
                <div className="bg-gray-900 rounded-xl shadow-2xl p-8 border border-gray-800">
                    <div className="mb-6">
                        <Link href="/team" className="text-gray-400 hover:text-white text-sm transition">
                            ← チーム管理に戻る
                        </Link>
                    </div>

                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-white mb-2">新しいチームを作成</h1>
                        <p className="text-gray-400 text-sm">チームを作成してメンバーを招待しましょう</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                                チーム名
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                placeholder="例: Team Alpha"
                                required
                                maxLength={50}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !name.trim()}
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition duration-200 flex items-center justify-center"
                        >
                            {loading ? (
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                'チームを作成'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
