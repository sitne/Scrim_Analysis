import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

interface RouteProps {
    params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteProps) {
    const { id: teamId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // Verify user is member of the team
    const membership = await prisma.teamMember.findUnique({
        where: {
            teamId_userId: {
                teamId,
                userId: user.id
            }
        }
    });

    if (!membership) {
        return NextResponse.json({ error: 'チームメンバーではありません' }, { status: 403 });
    }

    // Fetch all matches for this team to get opponent names
    const matches = await prisma.match.findMany({
        where: { teamId },
        select: {
            myTeamSide: true,
            redTeamName: true,
            blueTeamName: true
        }
    });

    const opponentNames = new Set<string>();

    matches.forEach(m => {
        let name;
        if (m.myTeamSide === 'Red') {
            name = m.blueTeamName;
        } else if (m.myTeamSide === 'Blue') {
            name = m.redTeamName;
        }

        if (name && name !== 'Red Team' && name !== 'Blue Team') {
            opponentNames.add(name);
        }
    });

    return NextResponse.json(Array.from(opponentNames).sort());
}
