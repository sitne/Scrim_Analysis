import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
        }

        // Get user's team IDs
        const memberships = await prisma.teamMember.findMany({
            where: { userId: user.id },
            select: { teamId: true }
        });

        const teamIds = memberships.map(m => m.teamId);

        if (teamIds.length === 0) {
            return NextResponse.json([]);
        }

        // Get tags only from user's teams' matches
        const tags = await prisma.matchTag.findMany({
            where: {
                match: {
                    teamId: { in: teamIds }
                }
            },
            select: { tagName: true },
            distinct: ['tagName']
        });

        return NextResponse.json(tags.map(t => t.tagName));
    } catch (error) {
        console.error('Error fetching all tags:', error);
        return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
    }
}

