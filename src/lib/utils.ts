import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { getAgentData, getMapData, getArmorData as getArmorDataRaw } from "./valorant-api"
import { agentMap, mapDisplayNames } from "./valorant-constants"
import { WEAPON_MAP } from "./weapon-constants"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// Re-export constants for backward compatibility
export { agentMap, mapDisplayNames }

export function getMapDisplayName(mapId: string): string {
    const data = getMapData(mapId);
    return data.name;
}

export function getAgentName(agentId: string | null | undefined): string {
    const data = getAgentData(agentId);
    return data ? data.name : "Unknown";
}

export function getAgentIconPath(agentId: string | null | undefined): string {
    const data = getAgentData(agentId);
    return data ? data.icon : "";
}

export function getAgentRole(agentId: string | null | undefined): string {
    const data = getAgentData(agentId);
    return data ? data.role : "Unknown";
}

export function getWeaponData(weaponId: string | null | undefined) {
    if (!weaponId) return { name: 'Unknown', icon: '', killStreamIcon: '' };
    const normalizedUuid = weaponId.toLowerCase();
    const weapon = WEAPON_MAP[normalizedUuid];

    if (weapon) {
        return {
            name: weapon.name,
            icon: `/weapons/${weapon.fileName}.png`,
            killStreamIcon: `/weapons/${weapon.fileName}.png` // Using silhouette for both for now
        };
    }

    return { name: 'Unknown', icon: '', killStreamIcon: '' };
}

export function getArmorData(armorId: string | null | undefined) {
    return getArmorDataRaw(armorId);
}

export function getTagColor(tagName: string): string {
    return '#374151'; // gray-700
}


