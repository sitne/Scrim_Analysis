import { agentMap as fallbackAgentMap, mapDisplayNames as fallbackMapNames } from './valorant-constants';

interface ValorantAgent {
    uuid: string;
    displayName: string;
    displayIcon: string;
    isPlayableCharacter: boolean;
    role?: {
        displayName: string;
    };
}

interface ValorantMap {
    mapUrl: string;
    displayName: string;
    listViewIcon: string;
}

// In-memory cache
let agentCache: Record<string, { name: string; icon: string; role: string }> | null = null;
let mapCache: Record<string, { name: string; icon: string }> | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export async function fetchValorantData() {
    const now = Date.now();
    if (agentCache && mapCache && (now - lastFetchTime < CACHE_DURATION)) {
        return;
    }

    try {
        // Fetch Agents
        const agentsRes = await fetch('https://valorant-api.com/v1/agents?language=en-US');
        const agentsData = await agentsRes.json();

        agentCache = {};
        agentsData.data.forEach((agent: ValorantAgent) => {
            if (agent.isPlayableCharacter) {
                agentCache![agent.uuid] = {
                    name: agent.displayName,
                    icon: agent.displayIcon,
                    role: agent.role?.displayName || 'Unknown'
                };
            }
        });

        // Fetch Maps
        const mapsRes = await fetch('https://valorant-api.com/v1/maps?language=en-US');
        const mapsData = await mapsRes.json();

        mapCache = {};
        mapsData.data.forEach((map: ValorantMap) => {
            // Map URL format: /Game/Maps/Pitt/Pitt -> Pitt
            // We need to match the internal ID used in the database
            // The API returns "mapUrl": "/Game/Maps/Pitt/Pitt"
            mapCache![map.mapUrl] = {
                name: map.displayName,
                icon: map.listViewIcon
            };
        });

        lastFetchTime = now;
        console.log('Valorant data fetched and cached');

    } catch (error) {
        console.error('Failed to fetch Valorant data:', error);
        // Fallback to existing data if fetch fails
        // We don't overwrite cache with null if it already exists
    }
}

// Synchronous getters that rely on cached data
// Note: You should call fetchValorantData() at least once before using these
// preferably in the root layout or page component

export function getAgentData(uuid: string | null | undefined) {
    if (!uuid) return null;

    // Try cache first
    if (agentCache && agentCache[uuid]) {
        return agentCache[uuid];
    }

    // Fallback to hardcoded data
    if (fallbackAgentMap[uuid]) {
        return {
            name: fallbackAgentMap[uuid],
            icon: `/agents/${fallbackAgentMap[uuid].toLowerCase()}.png`, // Fallback to local image
            role: 'Unknown'
        };
    }

    return { name: 'Unknown', icon: '', role: 'Unknown' };
}

export function getMapData(mapId: string) {
    // Try cache first
    // The mapId from DB is like "/Game/Maps/Pitt/Pitt"
    if (mapCache && mapCache[mapId]) {
        return mapCache[mapId];
    }

    // Fallback logic
    const internalName = mapId.split('/').pop()?.toLowerCase() || '';
    // Try to find in fallback map
    const fallbackName = Object.entries(fallbackMapNames).find(([key]) => key === internalName)?.[1];

    if (fallbackName) {
        return { name: fallbackName, icon: '' };
    }

    return { name: internalName || 'Unknown', icon: '' };
}
