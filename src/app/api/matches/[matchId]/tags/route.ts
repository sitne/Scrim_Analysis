import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ matchId: string }> }
) {
    const params = await props.params;
    const { matchId } = params;

    try {
        const tags = await prisma.matchTag.findMany({
            where: { matchId },
            select: { tagName: true }
        });

        return NextResponse.json(tags.map(t => t.tagName));
    } catch (error) {
        console.error('Error fetching tags:', error);
        return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ matchId: string }> }
) {
    const params = await props.params;
    const { matchId } = params;

    try {
        const body = await request.json();
        const { tagName } = body;

        if (!tagName || typeof tagName !== 'string') {
            return NextResponse.json({ error: 'Invalid tag name' }, { status: 400 });
        }

        const normalizedTagName = tagName.trim();

        const tag = await prisma.matchTag.create({
            data: {
                matchId,
                tagName: normalizedTagName
            }
        });

        return NextResponse.json(tag);
    } catch (error) {
        console.error('Error creating tag:', error);
        // Handle unique constraint violation (tag already exists for this match)
        if ((error as any).code === 'P2002') {
            return NextResponse.json({ error: 'Tag already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ matchId: string }> }
) {
    const params = await props.params;
    const { matchId } = params;
    const searchParams = request.nextUrl.searchParams;
    const tagName = searchParams.get('tagName');

    if (!tagName) {
        return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }

    try {
        await prisma.matchTag.delete({
            where: {
                matchId_tagName: {
                    matchId,
                    tagName
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting tag:', error);
        return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
    }
}
