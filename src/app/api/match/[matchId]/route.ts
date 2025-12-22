import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

interface RouteProps {
    params: Promise<{ matchId: string }>
}

// Update match (Opponent Team Name/Tag)
export async function PATCH(request: Request, { params }: RouteProps) {
    const { matchId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { opponentName, opponentTag } = body

    if (typeof opponentName !== 'string') {
        return NextResponse.json({ error: '無効なデータ形式です' }, { status: 400 })
    }

    // Get match and verify user has access
    const match = await prisma.match.findUnique({
        where: { matchId },
        select: { teamId: true, myTeamSide: true }
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
        return NextResponse.json({ error: 'このマッチを編集する権限がありません' }, { status: 403 })
    }

    // Determine which fields to update based on myTeamSide
    // If myTeamSide is Red, the opponent is Blue, so we update Blue team info.
    // If myTeamSide is Blue, the opponent is Red, so we update Red team info.
    const updateData: any = {}

    if (match.myTeamSide === 'Red') {
        updateData.blueTeamName = opponentName
    } else if (match.myTeamSide === 'Blue') {
        updateData.redTeamName = opponentName
    } else {
        // If myTeamSide is not set, we can't determine which side is opponent.
        // In this case, maybe we shouldn't update anything or allow updating both?
        // For now, let's return an error as this shouldn't happen in the new flow.
        return NextResponse.json({ error: '自チームのサイドが不明なため、対戦相手を特定できません' }, { status: 400 })
    }

    // Update match
    const updatedMatch = await prisma.match.update({
        where: { matchId },
        data: updateData,
        select: {
            matchId: true,
            redTeamName: true,
            blueTeamName: true
        }
    })

    return NextResponse.json({ success: true, match: updatedMatch })
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
