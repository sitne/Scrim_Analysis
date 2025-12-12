import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { importMatchData } from '@/lib/web-importer'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
        }

        const { matchData, teamId } = await request.json()

        if (!matchData) {
            return NextResponse.json({ error: 'マッチデータが必要です' }, { status: 400 })
        }

        if (!teamId) {
            return NextResponse.json({ error: 'チームIDが必要です' }, { status: 400 })
        }

        // Verify user is member of this team
        const membership = await prisma.teamMember.findUnique({
            where: {
                teamId_userId: {
                    teamId,
                    userId: user.id,
                },
            },
        })

        if (!membership) {
            return NextResponse.json({ error: 'このチームのメンバーではありません' }, { status: 403 })
        }

        // Import the match data
        const result = await importMatchData(matchData, teamId)

        if (result.status === 'error') {
            return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error('Upload error:', error)
        return NextResponse.json({ error: 'アップロードに失敗しました' }, { status: 500 })
    }
}
