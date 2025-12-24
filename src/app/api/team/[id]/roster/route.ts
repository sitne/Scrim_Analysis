import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

interface RouteProps {
    params: Promise<{ id: string }>
}

// Get roster players
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

    const rosterPlayers = await prisma.teamRosterPlayer.findMany({
        where: { teamId: id },
        include: {
            player: {
                select: {
                    puuid: true,
                    gameName: true,
                    tagLine: true,
                    alias: true,
                }
            }
        },
        orderBy: { addedAt: 'asc' }
    })

    return NextResponse.json(rosterPlayers)
}

// Add players to roster
export async function POST(request: Request, { params }: RouteProps) {
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

    const { puuids, players } = await request.json()

    // 新しい形式（playersオブジェクト配列）または古い形式（puuids配列）の両方をサポート
    const targetPlayers = players || (puuids || []).map((puuid: string) => ({ puuid }))

    if (!Array.isArray(targetPlayers) || targetPlayers.length === 0) {
        return NextResponse.json({ error: 'playersまたはpuuidsが必要です' }, { status: 400 })
    }

    // 1. プレイヤーをUpsert (gameName, tagLineがある場合のみ)
    for (const p of targetPlayers) {
        if (p.puuid && p.gameName && p.tagLine) {
            await prisma.player.upsert({
                where: { puuid: p.puuid },
                update: { gameName: p.gameName, tagLine: p.tagLine },
                create: { puuid: p.puuid, gameName: p.gameName, tagLine: p.tagLine }
            })
        }
    }

    const targetPuuids = targetPlayers.map((p: any) => p.puuid).filter(Boolean)

    // 2. Add players to roster (skip existing)
    const existingRoster = await prisma.teamRosterPlayer.findMany({
        where: { teamId: id },
        select: { puuid: true }
    })
    const existingPuuids = new Set(existingRoster.map(r => r.puuid))

    const newPuuids = targetPuuids.filter((p: string) => !existingPuuids.has(p))

    if (newPuuids.length > 0) {
        await prisma.teamRosterPlayer.createMany({
            data: newPuuids.map((puuid: string) => ({
                teamId: id,
                puuid
            })),
            skipDuplicates: true
        })
    }

    return NextResponse.json({ added: newPuuids.length })
}

// Remove player from roster
export async function DELETE(request: Request, { params }: RouteProps) {
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

    const { searchParams } = new URL(request.url)
    const puuid = searchParams.get('puuid')

    if (!puuid) {
        return NextResponse.json({ error: 'puuidが必要です' }, { status: 400 })
    }

    await prisma.teamRosterPlayer.delete({
        where: {
            teamId_puuid: {
                teamId: id,
                puuid
            }
        }
    }).catch(() => {
        // Already deleted or not found
    })

    return NextResponse.json({ success: true })
}
