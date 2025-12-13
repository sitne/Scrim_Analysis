import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function TeamDetailPage({ params }: PageProps) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Verify user is member of this team
    const membership = await prisma.teamMember.findUnique({
        where: {
            teamId_userId: {
                teamId: id,
                userId: user.id,
            },
        },
    })

    if (!membership) {
        redirect('/team')
    }

    // Get team with members and match count
    const team = await prisma.team.findUnique({
        where: { id },
        include: {
            members: true,
            _count: {
                select: { matches: true }
            }
        }
    })

    if (!team) {
        redirect('/team')
    }

    const isOwner = membership.role === 'owner'

    return (
        <div className="min-h-screen bg-gray-950 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <Link href="/team" className="text-gray-400 hover:text-white text-sm transition">
                        ← チーム管理に戻る
                    </Link>
                </div>

                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-2">{team.name}</h1>
                            <div className="flex gap-4 text-sm text-gray-400">
                                <span>{team.members.length} メンバー</span>
                                <span>{team._count.matches} マッチ</span>
                            </div>
                        </div>
                        {isOwner && (
                            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-sm rounded">
                                オーナー
                            </span>
                        )}
                    </div>

                    {isOwner && (
                        <div className="bg-gray-800 rounded-lg p-4">
                            <h3 className="text-sm font-medium text-gray-300 mb-2">招待コード</h3>
                            <div className="flex items-center gap-3">
                                <code className="flex-1 px-4 py-2 bg-gray-900 rounded text-gray-300 font-mono text-sm">
                                    {team.inviteCode}
                                </code>
                                <button
                                    onClick={() => navigator.clipboard.writeText(team.inviteCode)}
                                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition"
                                >
                                    コピー
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                このコードを共有して、メンバーを招待できます
                            </p>
                        </div>
                    )}
                </div>

                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <h2 className="text-lg font-semibold text-white mb-4">メンバー一覧</h2>
                    <ul className="space-y-3">
                        {team.members.map((member) => (
                            <li
                                key={member.id}
                                className="flex items-center justify-between px-4 py-3 bg-gray-800 rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-gray-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <span className="text-gray-300">{member.userId.slice(0, 8)}...</span>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded ${member.role === 'owner'
                                        ? 'bg-amber-500/20 text-amber-400'
                                        : 'bg-gray-700 text-gray-400'
                                    }`}>
                                    {member.role === 'owner' ? 'オーナー' : 'メンバー'}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}
