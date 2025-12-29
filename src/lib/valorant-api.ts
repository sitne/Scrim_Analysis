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
    displayIcon: string; // Minimap image
    xMultiplier: number;
    yMultiplier: number;
    xScalarToAdd: number;
    yScalarToAdd: number;
}

interface ValorantWeapon {
    uuid: string;
    displayName: string;
    displayIcon: string;
    killStreamIcon: string;
}

// In-memory cache
let agentCache: Record<string, { name: string; icon: string; role: string }> | null = null;
let mapCache: Record<string, {
    name: string;
    icon: string;
    displayIcon: string;
    xMultiplier: number;
    yMultiplier: number;
    xScalarToAdd: number;
    yScalarToAdd: number;
}> | null = null;
let weaponCache: Record<string, { name: string; icon: string; killStreamIcon: string }> | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export async function fetchValorantData() {
    const now = Date.now();
    if (agentCache && mapCache && weaponCache && (now - lastFetchTime < CACHE_DURATION)) {
        return;
    }

    try {
        // Fetch Agents
        const agentsRes = await fetch('https://valorant-api.com/v1/agents?language=en-US');
        const agentsData = await agentsRes.json();

        agentCache = {};
        agentsData.data.forEach((agent: ValorantAgent) => {
            if (agent.isPlayableCharacter) {
                agentCache![agent.uuid.toLowerCase()] = {
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
                icon: map.listViewIcon,
                displayIcon: map.displayIcon,
                xMultiplier: map.xMultiplier,
                yMultiplier: map.yMultiplier,
                xScalarToAdd: map.xScalarToAdd,
                yScalarToAdd: map.yScalarToAdd
            };
        });

        // Fetch Weapons
        const weaponsRes = await fetch('https://valorant-api.com/v1/weapons?language=en-US');
        const weaponsData = await weaponsRes.json();

        weaponCache = {};
        weaponsData.data.forEach((weapon: ValorantWeapon) => {
            weaponCache![weapon.uuid.toLowerCase()] = {
                name: weapon.displayName,
                icon: weapon.displayIcon,
                killStreamIcon: weapon.killStreamIcon
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
    const normalizedUuid = uuid.toLowerCase();

    // Try cache first
    if (agentCache && agentCache[normalizedUuid]) {
        return agentCache[normalizedUuid];
    }

    // Fallback to hardcoded data
    if (fallbackAgentMap[normalizedUuid]) {
        return {
            name: fallbackAgentMap[normalizedUuid],
            icon: `/agents/${fallbackAgentMap[normalizedUuid].toLowerCase()}.png`, // Fallback to local image
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
        return {
            name: fallbackName,
            icon: '',
            displayIcon: '',
            xMultiplier: 0,
            yMultiplier: 0,
            xScalarToAdd: 0,
            yScalarToAdd: 0
        };
    }

    return {
        name: internalName || 'Unknown',
        icon: '',
        displayIcon: '',
        xMultiplier: 0,
        yMultiplier: 0,
        xScalarToAdd: 0,
        yScalarToAdd: 0
    };
}

export function getWeaponData(uuid: string | null | undefined) {
    if (!uuid) return null;
    const normalizedUuid = uuid.toLowerCase();

    if (weaponCache && weaponCache[normalizedUuid]) {
        return weaponCache[normalizedUuid];
    }

    return { name: 'Unknown', icon: '', killStreamIcon: '' };
}

export const ARMOR_MAP: Record<string, { name: string; value: number }> = {
    '822bcab2-40a2-324e-c137-e09195ad7692': { name: 'Heavy Armor', value: 50 },
    '4dec83d5-4902-9ab3-bed6-a7a390761157': { name: 'Light Armor', value: 25 },
    'b1b9086d-41bd-a516-5d29-e3b34a6f1644': { name: 'Light Armor', value: 25 }, // Some API versions use different UUIDs for same items
};

export function getArmorData(uuid: string | null | undefined) {
    if (!uuid) return null;
    const normalizedUuid = uuid.toLowerCase();
    return ARMOR_MAP[normalizedUuid] || null;
}

export function getAllWeaponData() {
    return weaponCache || {};
}

export function getAllAgentData() {
    return agentCache || {};
}
