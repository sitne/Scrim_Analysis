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

    return NextResponse.json({ team })
}
