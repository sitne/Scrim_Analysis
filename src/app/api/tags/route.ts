import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const tags = await prisma.matchTag.findMany({
            select: { tagName: true },
            distinct: ['tagName']
        });

        return NextResponse.json(tags.map(t => t.tagName));
    } catch (error) {
        console.error('Error fetching all tags:', error);
        return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
    }
}
