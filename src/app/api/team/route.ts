import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// チーム作成
export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
        }

        const { name } = await request.json()

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json({ error: 'チーム名を入力してください' }, { status: 400 })
        }

        // Create team and add user as owner
        const team = await prisma.team.create({
            data: {
                name: name.trim(),
                members: {
                    create: {
                        userId: user.id,
                        role: 'owner',
                    },
                },
            },
            include: {
                members: true,
            },
        })

        return NextResponse.json({ team })
    } catch (error) {
        console.error('Error creating team:', error)
        return NextResponse.json({ error: 'チームの作成に失敗しました' }, { status: 500 })
    }
}

// Get user's teams
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
        }

        const memberships = await prisma.teamMember.findMany({
            where: { userId: user.id },
            include: {
                team: {
                    include: {
                        members: true,
                        _count: {
                            select: { matches: true }
                        }
                    }
                }
            }
        })

        return NextResponse.json({ teams: memberships.map(m => ({ ...m.team, role: m.role })) })
    } catch (error) {
        console.error('Error fetching teams:', error)
        return NextResponse.json({ error: 'チームの取得に失敗しました' }, { status: 500 })
    }
}
