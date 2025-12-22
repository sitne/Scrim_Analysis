'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface PageProps {
    params: Promise<{ id: string }>
}

interface PlayerInfo {
    puuid: string
    gameName: string
    tagLine: string
    teamId: string // "Red" | "Blue"
}

interface ParsedMatch {
    matchId: string
    mapId: string
    redPlayers: PlayerInfo[]
    bluePlayers: PlayerInfo[]
    redTeamName?: string
    blueTeamName?: string
}

export default function TeamUploadPage({ params }: PageProps) {
    const [teamId, setTeamId] = useState<string>('')
    const [teamName, setTeamName] = useState<string>('')
    const [files, setFiles] = useState<File[]>([])
    const [uploading, setUploading] = useState(false)
    const [results, setResults] = useState<{ file: string; status: string; error?: string }[]>([])
    const [error, setError] = useState<string | null>(null)
    const [dragActive, setDragActive] = useState(false)
    const router = useRouter()

    // ロスター設定関連
    const [hasRoster, setHasRoster] = useState<boolean | null>(null)
    const [showRosterSetup, setShowRosterSetup] = useState(false)
    const [parsedMatch, setParsedMatch] = useState<ParsedMatch | null>(null)
    const [selectedTeam, setSelectedTeam] = useState<'Red' | 'Blue' | null>(null)
    const [settingUpRoster, setSettingUpRoster] = useState(false)

    useEffect(() => {
        params.then(({ id }) => {
            setTeamId(id)
            // Fetch team info and roster status
            fetch(`/api/team/${id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.team) {
                        setTeamName(data.team.name)
                    }
                })
                .catch(console.error)

            // Check if roster is set
            fetch(`/api/team/${id}/roster`)
                .then(res => res.json())
                .then(data => {
                    setHasRoster(Array.isArray(data) && data.length > 0)
                })
                .catch(() => setHasRoster(false))
        })
    }, [params])

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
        handleFilesSelected(droppedFiles)
    }, [hasRoster])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files).filter(
                file => file.name.endsWith('.json')
            )
            handleFilesSelected(selectedFiles)
        }
    }

    const handleFilesSelected = async (newFiles: File[]) => {
        // ロスター未設定の場合、最初のファイルを解析してチーム選択を表示
        if (!hasRoster && newFiles.length > 0) {
            try {
                const content = await newFiles[0].text()
                const matchData = JSON.parse(content)

                const redPlayers: PlayerInfo[] = []
                const bluePlayers: PlayerInfo[] = []
                let redTeamName = ''
                let blueTeamName = ''

                for (const player of matchData.players || []) {
                    const info: PlayerInfo = {
                        puuid: player.subject,
                        gameName: player.gameName,
                        tagLine: player.tagLine,
                        teamId: player.teamId
                    }
                    if (player.teamId === 'Red') {
                        redPlayers.push(info)
                        if (!redTeamName && player.premierPrestige?.rosterName) {
                            redTeamName = player.premierPrestige.rosterName
                        }
                    } else if (player.teamId === 'Blue') {
                        bluePlayers.push(info)
                        if (!blueTeamName && player.premierPrestige?.rosterName) {
                            blueTeamName = player.premierPrestige.rosterName
                        }
                    }
                }

                setParsedMatch({
                    matchId: matchData.matchInfo?.matchId || 'unknown',
                    mapId: matchData.matchInfo?.mapId || 'unknown',
                    redPlayers,
                    bluePlayers,
                    redTeamName: redTeamName || undefined,
                    blueTeamName: blueTeamName || undefined
                })
                setShowRosterSetup(true)
            } catch (err) {
                console.error('Failed to parse match for roster setup:', err)
            }
        }

        setFiles(prev => [...prev, ...newFiles])
    }

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleRosterSetup = async () => {
        if (!selectedTeam || !parsedMatch || !teamId) return

        setSettingUpRoster(true)
        const selectedPlayers = selectedTeam === 'Red'
            ? parsedMatch.redPlayers
            : parsedMatch.bluePlayers

        try {
            const response = await fetch(`/api/team/${teamId}/roster`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    puuids: selectedPlayers.map(p => p.puuid)
                })
            })

            if (response.ok) {
                setHasRoster(true)
                setShowRosterSetup(false)
                // 続けてアップロードを実行
                handleUploadInternal()
            } else {
                const data = await response.json()
                setError(data.error || 'ロスター設定に失敗しました')
            }
        } catch (err) {
            setError('ロスター設定に失敗しました')
        } finally {
            setSettingUpRoster(false)
        }
    }

    const handleUploadInternal = async () => {
        if (files.length === 0 || !teamId) return

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
                    body: JSON.stringify({ matchData, teamId }),
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

        // Redirect back to team page after upload
        if (uploadResults.some(r => r.status === 'imported')) {
            setTimeout(() => {
                router.push(`/team/${teamId}`)
                router.refresh()
            }, 1500)
        }
    }

    const handleUpload = async () => {
        // ロスター未設定でセットアップ画面表示中の場合
        if (showRosterSetup) {
            await handleRosterSetup()
            return
        }

        await handleUploadInternal()
    }

    // ロスター選択画面
    if (showRosterSetup && parsedMatch) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Link href={`/team/${teamId}`} className="text-gray-400 hover:text-white transition">
                        ← {teamName || 'チーム'}
                    </Link>
                </div>

                <h1 className="text-3xl font-bold text-white">チームメンバーを登録</h1>
                <p className="text-gray-400">
                    このマッチで自分のチームはどちらですか？選択したチームのプレイヤーが「自チーム」として登録されます。
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Red Team */}
                    <button
                        onClick={() => setSelectedTeam('Red')}
                        className={`p-6 rounded-xl border-2 transition text-left ${selectedTeam === 'Red'
                                ? 'border-red-500 bg-red-500/20'
                                : 'border-gray-700 bg-gray-900 hover:border-red-500/50'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-red-400">
                                {parsedMatch.redTeamName || 'Red Team'}
                            </h3>
                            {selectedTeam === 'Red' && (
                                <span className="text-green-400">✓ 選択中</span>
                            )}
                        </div>
                        <ul className="space-y-2">
                            {parsedMatch.redPlayers.map(player => (
                                <li key={player.puuid} className="text-sm text-gray-300">
                                    {player.gameName} <span className="text-gray-500">#{player.tagLine}</span>
                                </li>
                            ))}
                        </ul>
                    </button>

                    {/* Blue Team */}
                    <button
                        onClick={() => setSelectedTeam('Blue')}
                        className={`p-6 rounded-xl border-2 transition text-left ${selectedTeam === 'Blue'
                                ? 'border-blue-500 bg-blue-500/20'
                                : 'border-gray-700 bg-gray-900 hover:border-blue-500/50'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-blue-400">
                                {parsedMatch.blueTeamName || 'Blue Team'}
                            </h3>
                            {selectedTeam === 'Blue' && (
                                <span className="text-green-400">✓ 選択中</span>
                            )}
                        </div>
                        <ul className="space-y-2">
                            {parsedMatch.bluePlayers.map(player => (
                                <li key={player.puuid} className="text-sm text-gray-300">
                                    {player.gameName} <span className="text-gray-500">#{player.tagLine}</span>
                                </li>
                            ))}
                        </ul>
                    </button>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <div className="flex gap-4">
                    <button
                        onClick={() => {
                            setShowRosterSetup(false)
                            setFiles([])
                            setParsedMatch(null)
                            setSelectedTeam(null)
                        }}
                        className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={handleRosterSetup}
                        disabled={!selectedTeam || settingUpRoster}
                        className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition flex items-center justify-center"
                    >
                        {settingUpRoster ? (
                            <>
                                <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                設定中...
                            </>
                        ) : (
                            `登録して${files.length}ファイルをアップロード`
                        )}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/team/${teamId}`} className="text-gray-400 hover:text-white transition">
                    ← {teamName || 'チーム'}
                </Link>
            </div>

            <h1 className="text-3xl font-bold text-white">マッチデータアップロード</h1>

            {hasRoster === false && (
                <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 px-4 py-3 rounded-lg text-sm">
                    ⚠️ チームメンバーが未登録です。最初のマッチをアップロードすると、自チームを選択できます。
                </div>
            )}

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
                <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {files.length > 0 && !showRosterSetup && (
                <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
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
                        disabled={uploading}
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
                <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
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
    )
}
