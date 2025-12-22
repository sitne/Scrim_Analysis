import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ puuid: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
        }

        const { puuid } = await params;
        const body = await request.json();
        const { alias, mergedToPuuid } = body;

        // Authorization check: User must be a member of a team that:
        // 1. Has this player in its roster OR
        // 2. Has a match where this player participated
        const membership = await prisma.teamMember.findFirst({
            where: {
                userId: user.id,
                team: {
                    OR: [
                        {
                            rosterPlayers: {
                                some: { puuid }
                            }
                        },
                        {
                            matches: {
                                some: {
                                    players: {
                                        some: { puuid }
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        });

        if (!membership) {
            return NextResponse.json({ error: 'このプレイヤーを編集する権限がありません' }, { status: 403 });
        }

        // Validate input
        if (alias !== undefined && typeof alias !== 'string' && alias !== null) {
            return NextResponse.json({ error: 'Invalid alias' }, { status: 400 });
        }
        if (mergedToPuuid !== undefined && typeof mergedToPuuid !== 'string' && mergedToPuuid !== null) {
            return NextResponse.json({ error: 'Invalid mergedToPuuid' }, { status: 400 });
        }

        // Prevent self-merge
        if (mergedToPuuid === puuid) {
            return NextResponse.json({ error: 'Cannot merge player to themselves' }, { status: 400 });
        }

        // Prevent circular merge (basic check)
        if (mergedToPuuid) {
            const targetPlayer = await prisma.player.findUnique({
                where: { puuid: mergedToPuuid },
                select: { mergedToPuuid: true }
            });
            if (targetPlayer?.mergedToPuuid === puuid) {
                return NextResponse.json({ error: 'Circular merge detected' }, { status: 400 });
            }
        }

        const updatedPlayer = await prisma.player.update({
            where: { puuid },
            data: {
                ...(alias !== undefined ? { alias } : {}),
                ...(mergedToPuuid !== undefined ? { mergedToPuuid } : {}),
            },
        });

        return NextResponse.json(updatedPlayer);
    } catch (error) {
        console.error('Error updating player:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
