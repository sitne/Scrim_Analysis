import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

interface RouteProps {
    params: Promise<{ id: string }>
}

// Leave team (members only, not owner)
export async function DELETE(request: Request, { params }: RouteProps) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // Check membership
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

    if (membership.role === 'owner') {
        return NextResponse.json({ error: 'オーナーはチームを脱退できません。チームを削除してください。' }, { status: 400 })
    }

    // Remove member
    await prisma.teamMember.delete({
        where: {
            teamId_userId: {
                teamId: id,
                userId: user.id,
            },
        },
    })

    return NextResponse.json({ success: true })
}
