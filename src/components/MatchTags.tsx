'use client';

import { getTagColor } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';

interface MatchTagsProps {
    matchId: string;
}

export function MatchTags({ matchId }: MatchTagsProps) {
    const [tags, setTags] = useState<string[]>([]);
    const [allTags, setAllTags] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loading, setLoading] = useState(true);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchTags();
        fetchAllTags();

        // Click outside handler to close suggestions
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [matchId]);

    const fetchTags = async () => {
        try {
            const res = await fetch(`/api/matches/${matchId}/tags`);
            if (res.ok) {
                const data = await res.json();
                setTags(data);
            }
        } catch (error) {
            console.error('Failed to fetch tags', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllTags = async () => {
        try {
            const res = await fetch('/api/tags');
            if (res.ok) {
                const data = await res.json();
                setAllTags(data);
            }
        } catch (error) {
            console.error('Failed to fetch all tags', error);
        }
    };

    const addTag = async (tagName: string) => {
        if (!tagName.trim()) return;

        // Optimistic update
        const newTag = tagName.trim();
        if (tags.includes(newTag)) {
            setInputValue('');
            setShowSuggestions(false);
            return;
        }

        try {
            const res = await fetch(`/api/matches/${matchId}/tags`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tagName: newTag })
            });

            if (res.ok) {
                setTags([...tags, newTag]);
                setInputValue('');
                setShowSuggestions(false);
                // Update allTags if it's a new tag
                if (!allTags.includes(newTag)) {
                    setAllTags([...allTags, newTag]);
                }
                // Keep focus on input for multiple entry
                setTimeout(() => inputRef.current?.focus(), 0);
            }
        } catch (error) {
            console.error('Failed to add tag', error);
        }
    };

    const removeTag = async (tagName: string) => {
        try {
            const res = await fetch(`/api/matches/${matchId}/tags?tagName=${encodeURIComponent(tagName)}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setTags(tags.filter(t => t !== tagName));
            }
        } catch (error) {
            console.error('Failed to remove tag', error);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.nativeEvent.isComposing || e.key !== 'Enter') return;

        e.preventDefault();
        addTag(inputValue);
    };

    const filteredSuggestions = allTags.filter(tag =>
        tag.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(tag)
    );



    if (loading) return <div className="h-8 animate-pulse bg-gray-800 rounded w-48"></div>;

    return (
        <div
            className="flex flex-wrap items-center gap-2"
            ref={wrapperRef}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
        >
            {tags.map(tag => (
                <span
                    key={tag}
                    className="px-2 py-1 rounded text-xs font-medium text-white flex items-center gap-1 shadow-sm"
                    style={{ backgroundColor: getTagColor(tag) }}
                >
                    {tag}
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeTag(tag);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="hover:text-red-200 ml-1 focus:outline-none"
                    >
                        ×
                    </button>
                </span>
            ))}

            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="+ Add Tag"
                    className="bg-gray-800/50 border border-gray-700 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 w-24 transition-all focus:w-32"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                />

                {showSuggestions && inputValue && filteredSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                        {filteredSuggestions.map(suggestion => (
                            <button
                                key={suggestion}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    addTag(suggestion);
                                }}
                                className="block w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
