import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export default async function StatsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth/login');
    }

    // Get user's teams
    const memberships = await prisma.teamMember.findMany({
        where: { userId: user.id },
        select: { teamId: true }
    });

    // Redirect to appropriate team stats page
    if (memberships.length === 1) {
        redirect(`/team/${memberships[0].teamId}/stats`);
    }

    if (memberships.length === 0) {
        redirect('/team');
    }

    // If multiple teams, redirect to home for team selection
    redirect('/');
}
