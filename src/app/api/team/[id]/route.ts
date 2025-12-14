import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

interface RouteProps {
    params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteProps) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
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
        return NextResponse.json({ error: 'チームのメンバーではありません' }, { status: 403 })
    }

    const team = await prisma.team.findUnique({
        where: { id },
        include: {
            _count: {
                select: { members: true, matches: true }
            }
        }
    })

    if (!team) {
        return NextResponse.json({ error: 'チームが見つかりません' }, { status: 404 })
    }

    return NextResponse.json({ team, membership })
}

// Delete team (owner only)
export async function DELETE(request: Request, { params }: RouteProps) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // Verify user is owner of this team
    const membership = await prisma.teamMember.findUnique({
        where: {
            teamId_userId: {
                teamId: id,
                userId: user.id,
            },
        },
    })

    if (!membership || membership.role !== 'owner') {
        return NextResponse.json({ error: 'オーナーのみチームを削除できます' }, { status: 403 })
    }

    // Delete team and all related data
    await prisma.$transaction(async (tx) => {
        // Get all matches for this team
        const matches = await tx.match.findMany({
            where: { teamId: id },
            select: { matchId: true }
        })
        const matchIds = matches.map(m => m.matchId)

        // Delete match-related data
        if (matchIds.length > 0) {
            await tx.roundPlayerStats.deleteMany({ where: { matchId: { in: matchIds } } })
            await tx.killEvent.deleteMany({ where: { matchId: { in: matchIds } } })
            await tx.damageEvent.deleteMany({ where: { matchId: { in: matchIds } } })
            await tx.matchTag.deleteMany({ where: { matchId: { in: matchIds } } })
            await tx.round.deleteMany({ where: { matchId: { in: matchIds } } })
            await tx.matchPlayer.deleteMany({ where: { matchId: { in: matchIds } } })
            await tx.match.deleteMany({ where: { teamId: id } })
        }

        // Delete team members
        await tx.teamMember.deleteMany({ where: { teamId: id } })

        // Delete team
        await tx.team.delete({ where: { id } })
    })

    return NextResponse.json({ success: true })
}
