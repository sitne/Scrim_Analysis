import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

interface RouteProps {
    params: Promise<{ matchId: string }>
}

// Delete match
export async function DELETE(request: Request, { params }: RouteProps) {
    const { matchId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // Get match and verify user has access
    const match = await prisma.match.findUnique({
        where: { matchId },
        select: { teamId: true }
    })

    if (!match) {
        return NextResponse.json({ error: 'マッチが見つかりません' }, { status: 404 })
    }

    // Verify user is member of the team that owns this match
    const membership = await prisma.teamMember.findUnique({
        where: {
            teamId_userId: {
                teamId: match.teamId!,
                userId: user.id,
            },
        },
    })

    if (!membership) {
        return NextResponse.json({ error: 'このマッチを削除する権限がありません' }, { status: 403 })
    }

    // Delete match and related data
    await prisma.$transaction([
        prisma.roundPlayerStats.deleteMany({ where: { matchId } }),
        prisma.killEvent.deleteMany({ where: { matchId } }),
        prisma.damageEvent.deleteMany({ where: { matchId } }),
        prisma.matchTag.deleteMany({ where: { matchId } }),
        prisma.round.deleteMany({ where: { matchId } }),
        prisma.matchPlayer.deleteMany({ where: { matchId } }),
        prisma.match.delete({ where: { matchId } })
    ])

    return NextResponse.json({ success: true })
}
