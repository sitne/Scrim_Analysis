import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function TeamPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Get user's teams
    const memberships = await prisma.teamMember.findMany({
        where: { userId: user.id },
        include: {
            team: {
                include: {
                    _count: {
                        select: {
                            members: true,
                            matches: true
                        }
                    }
                }
            }
        }
    })

    return (
        <div className="min-h-screen bg-gray-950 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-white">チーム管理</h1>
                    <Link
                        href="/"
                        className="inline-flex items-center px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        ← ホームへ戻る
                    </Link>
                </div>

                {memberships.length === 0 ? (
                    <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
                        <div className="mb-6">
                            <svg className="mx-auto h-16 w-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-4">まだチームがありません</h2>
                        <p className="text-gray-400 mb-6">
                            チームを作成するか、招待コードを使ってチームに参加してください。
                        </p>
                        <div className="flex justify-center gap-4">
                            <Link
                                href="/team/create"
                                className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                            >
                                チームを作成
                            </Link>
                            <Link
                                href="/team/join"
                                className="py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition"
                            >
                                招待コードで参加
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex gap-4 mb-6">
                            <Link
                                href="/team/create"
                                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition text-sm"
                            >
                                + 新しいチームを作成
                            </Link>
                            <Link
                                href="/team/join"
                                className="py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition text-sm"
                            >
                                招待コードで参加
                            </Link>
                        </div>

                        {memberships.map(({ team, role }) => (
                            <div key={team.id} className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h2 className="text-xl font-semibold text-white">{team.name}</h2>
                                            {role === 'owner' && (
                                                <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded">
                                                    オーナー
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-4 text-sm text-gray-400">
                                            <span>{team._count.members} メンバー</span>
                                            <span>{team._count.matches} マッチ</span>
                                        </div>
                                    </div>
                                    <Link
                                        href={`/team/${team.id}`}
                                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition"
                                    >
                                        詳細
                                    </Link>
                                </div>

                                {role === 'owner' && (
                                    <div className="mt-4 pt-4 border-t border-gray-800">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-500">招待コード:</span>
                                            <code className="px-3 py-1 bg-gray-800 rounded text-sm text-gray-300 font-mono">
                                                {team.inviteCode}
                                            </code>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
