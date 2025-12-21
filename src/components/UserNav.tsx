'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

export function UserNav() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
            setLoading(false)
        }
        getUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            setLoading(false)
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [supabase])

    const handleLogout = async () => {
        setLoading(true)
        await supabase.auth.signOut()
        setUser(null)
        router.push('/auth/login')
        router.refresh()
    }

    if (loading) {
        return null
    }

    if (!user) {
        return null
    }

    const avatarUrl = user.user_metadata?.avatar_url
    const initial = user.email ? user.email[0].toUpperCase() : '?'

    return (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt="User Avatar"
                        className="w-9 h-9 rounded-full border border-gray-700"
                    />
                ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold border border-gray-700">
                        {initial}
                    </div>
                )}
            </div>
            <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition"
            >
                ログアウト
            </button>
        </div>
    )
}
