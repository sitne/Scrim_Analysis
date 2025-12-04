import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { getAgentData, getMapData } from "./valorant-api"
import { agentMap, mapDisplayNames } from "./valorant-constants"

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

export function getTagColor(tagName: string): string {
    return '#374151'; // gray-700
}


