import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// 招待コードでチームに参加
export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
        }

        const { inviteCode } = await request.json()

        if (!inviteCode || typeof inviteCode !== 'string') {
            return NextResponse.json({ error: '招待コードを入力してください' }, { status: 400 })
        }

        // Find team by invite code
        const team = await prisma.team.findUnique({
            where: { inviteCode: inviteCode.trim() },
            include: { members: true },
        })

        if (!team) {
            return NextResponse.json({ error: '無効な招待コードです' }, { status: 404 })
        }

        // Check if already a member
        const existingMember = team.members.find(m => m.userId === user.id)
        if (existingMember) {
            return NextResponse.json({ error: 'すでにこのチームのメンバーです' }, { status: 400 })
        }

        // Add user to team
        await prisma.teamMember.create({
            data: {
                teamId: team.id,
                userId: user.id,
                role: 'member',
            },
        })

        return NextResponse.json({ team: { id: team.id, name: team.name } })
    } catch (error) {
        console.error('Error joining team:', error)
        return NextResponse.json({ error: 'チームへの参加に失敗しました' }, { status: 500 })
    }
}
