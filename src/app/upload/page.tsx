'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Team {
    id: string
    name: string
    role: string
}

export default function UploadPage() {
    const [files, setFiles] = useState<File[]>([])
    const [uploading, setUploading] = useState(false)
    const [results, setResults] = useState<{ file: string; status: string; error?: string }[]>([])
    const [teams, setTeams] = useState<Team[]>([])
    const [selectedTeam, setSelectedTeam] = useState<string>('')
    const [error, setError] = useState<string | null>(null)
    const [dragActive, setDragActive] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        // Get team from URL params
        const teamFromUrl = searchParams.get('team')

        // Fetch user's teams
        fetch('/api/team')
            .then(res => res.json())
            .then(data => {
                if (data.teams) {
                    setTeams(data.teams)
                    // Auto-select team from URL or first team
                    if (teamFromUrl && data.teams.some((t: Team) => t.id === teamFromUrl)) {
                        setSelectedTeam(teamFromUrl)
                    } else if (data.teams.length === 1) {
                        setSelectedTeam(data.teams[0].id)
                    }
                }
            })
            .catch(console.error)
    }, [searchParams])

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        } else if (e.type === 'dragleave') {
            setDragActive(false)
        }
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        const droppedFiles = Array.from(e.dataTransfer.files).filter(
            file => file.name.endsWith('.json')
        )
        setFiles(prev => [...prev, ...droppedFiles])
    }, [])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files).filter(
                file => file.name.endsWith('.json')
            )
            setFiles(prev => [...prev, ...selectedFiles])
        }
    }

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleUpload = async () => {
        if (files.length === 0) return
        if (!selectedTeam) {
            setError('チームを選択してください')
            return
        }

        setUploading(true)
        setError(null)
        setResults([])

        const uploadResults: { file: string; status: string; error?: string }[] = []

        for (const file of files) {
            try {
                const content = await file.text()
                const matchData = JSON.parse(content)

                const response = await fetch('/api/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ matchData, teamId: selectedTeam }),
                })

                const result = await response.json()

                if (response.ok) {
                    uploadResults.push({ file: file.name, status: result.status || 'imported' })
                } else {
                    uploadResults.push({ file: file.name, status: 'error', error: result.error })
                }
            } catch (err) {
                uploadResults.push({
                    file: file.name,
                    status: 'error',
                    error: err instanceof Error ? err.message : 'パースエラー'
                })
            }
        }

        setResults(uploadResults)
        setUploading(false)
        setFiles([])

        // Refresh after upload
        router.refresh()
    }

    if (teams.length === 0) {
        return (
            <div className="min-h-screen bg-gray-950 p-8">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
                        <h2 className="text-xl font-semibold text-white mb-4">チームが必要です</h2>
                        <p className="text-gray-400 mb-6">
                            マッチデータをアップロードするには、まずチームを作成または参加してください。
                        </p>
                        <Link
                            href="/team"
                            className="inline-block py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                        >
                            チーム管理へ
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-950 p-8">
            <div className="max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-white">マッチデータアップロード</h1>
                    <Link href="/" className="text-gray-400 hover:text-white transition">
                        ← ホームへ戻る
                    </Link>
                </div>

                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        アップロード先チーム
                    </label>
                    <select
                        value={selectedTeam}
                        onChange={(e) => setSelectedTeam(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">チームを選択...</option>
                        {teams.map((team) => (
                            <option key={team.id} value={team.id}>
                                {team.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div
                    className={`border-2 border-dashed rounded-xl p-12 text-center transition ${dragActive
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 bg-gray-900'
                        }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <div className="mb-4">
                        <svg
                            className="mx-auto h-12 w-12 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                        </svg>
                    </div>
                    <p className="text-gray-400 mb-4">
                        JSONファイルをドラッグ＆ドロップ
                    </p>
                    <p className="text-gray-500 text-sm mb-4">または</p>
                    <label className="inline-block">
                        <input
                            type="file"
                            multiple
                            accept=".json"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <span className="py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg cursor-pointer transition">
                            ファイルを選択
                        </span>
                    </label>
                </div>

                {error && (
                    <div className="mt-4 bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                {files.length > 0 && (
                    <div className="mt-6 bg-gray-900 rounded-xl p-4 border border-gray-800">
                        <h3 className="text-sm font-medium text-gray-300 mb-3">
                            選択されたファイル ({files.length})
                        </h3>
                        <ul className="space-y-2 max-h-48 overflow-y-auto">
                            {files.map((file, index) => (
                                <li
                                    key={index}
                                    className="flex items-center justify-between text-sm text-gray-400 bg-gray-800 px-3 py-2 rounded"
                                >
                                    <span className="truncate">{file.name}</span>
                                    <button
                                        onClick={() => removeFile(index)}
                                        className="text-red-400 hover:text-red-300 ml-2"
                                    >
                                        ✕
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={handleUpload}
                            disabled={uploading || !selectedTeam}
                            className="w-full mt-4 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition flex items-center justify-center"
                        >
                            {uploading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    アップロード中...
                                </>
                            ) : (
                                `${files.length} ファイルをアップロード`
                            )}
                        </button>
                    </div>
                )}

                {results.length > 0 && (
                    <div className="mt-6 bg-gray-900 rounded-xl p-4 border border-gray-800">
                        <h3 className="text-sm font-medium text-gray-300 mb-3">アップロード結果</h3>
                        <ul className="space-y-2">
                            {results.map((result, index) => (
                                <li
                                    key={index}
                                    className={`flex items-center justify-between text-sm px-3 py-2 rounded ${result.status === 'error'
                                        ? 'bg-red-500/10 text-red-400'
                                        : result.status === 'skipped'
                                            ? 'bg-yellow-500/10 text-yellow-400'
                                            : 'bg-green-500/10 text-green-400'
                                        }`}
                                >
                                    <span className="truncate">{result.file}</span>
                                    <span>
                                        {result.status === 'error'
                                            ? `エラー: ${result.error}`
                                            : result.status === 'skipped'
                                                ? 'スキップ'
                                                : '成功'}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    )
}
