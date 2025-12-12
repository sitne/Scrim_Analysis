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
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user)
            setLoading(false)
        })
    }, [supabase.auth])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/auth/login')
        router.refresh()
    }

    if (loading) {
        return null
    }

    if (!user) {
        return null
    }

    return (
        <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{user.email}</span>
            <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition"
            >
                ログアウト
            </button>
        </div>
    )
}
