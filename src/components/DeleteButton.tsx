'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DeleteButtonProps {
    endpoint: string
    redirectTo: string
    buttonText: string
    confirmMessage: string
    className?: string
}

export function DeleteButton({ endpoint, redirectTo, buttonText, confirmMessage, className }: DeleteButtonProps) {
    const [loading, setLoading] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const router = useRouter()

    const handleDelete = async () => {
        setLoading(true)
        try {
            const res = await fetch(endpoint, { method: 'DELETE' })
            if (res.ok) {
                router.push(redirectTo)
                router.refresh()
            } else {
                const data = await res.json()
                alert(data.error || '削除に失敗しました')
            }
        } catch (error) {
            alert('削除に失敗しました')
        } finally {
            setLoading(false)
            setShowConfirm(false)
        }
    }

    if (showConfirm) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">{confirmMessage}</span>
                <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white text-sm rounded transition"
                >
                    {loading ? '削除中...' : '確認'}
                </button>
                <button
                    onClick={() => setShowConfirm(false)}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition"
                >
                    キャンセル
                </button>
            </div>
        )
    }

    return (
        <button
            onClick={() => setShowConfirm(true)}
            className={className || "px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition"}
        >
            {buttonText}
        </button>
    )
}
