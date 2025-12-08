export interface MapData {
    xMultiplier: number;
    yMultiplier: number;
    xScalarToAdd: number;
    yScalarToAdd: number;
    imagePath: string;
    rotation: number; // 角度（度数法）
}

export const MAP_CONFIGS: Record<string, MapData> = {
    '/Game/Maps/Juliett/Juliett': {
        xMultiplier: 0.000078,
        yMultiplier: 0.000078,
        xScalarToAdd: 0.48,
        yScalarToAdd: 0.5,
        imagePath: '/maps/sunset.png',
        rotation: 180,
    },
    '/Game/Maps/Ascent/Ascent': {
        xMultiplier: 0.00007,
        yMultiplier: -0.00007,
        xScalarToAdd: 0.813895,
        yScalarToAdd: 0.573242,
        imagePath: '/maps/ascent.png',
        rotation: 0,
    },
    '/Game/Maps/Infinity/Infinity': {
        xMultiplier: 0.000081,
        yMultiplier: -0.000081,
        xScalarToAdd: 0.5,
        yScalarToAdd: 0.5,
        imagePath: '/maps/abyss.png',
        rotation: 0,
    },
    '/Game/Maps/Triad/Triad': {
        xMultiplier: 0.000075,
        yMultiplier: -0.000075,
        xScalarToAdd: 0.09345,
        yScalarToAdd: 0.642728,
        imagePath: '/maps/haven.png',
        rotation: 0,
    },
    '/Game/Maps/Bonsai/Bonsai': {
        xMultiplier: 0.000078,
        yMultiplier: -0.000078,
        xScalarToAdd: 0.842188,
        yScalarToAdd: 0.697578,
        imagePath: '/maps/split.png',
        rotation: 0,
    },
    '/Game/Maps/Canyon/Canyon': {
        xMultiplier: 0.000078,
        yMultiplier: -0.000078,
        xScalarToAdd: 0.556952,
        yScalarToAdd: 1.155886,
        imagePath: '/maps/fracture.png',
        rotation: 0,
    },
    '/Game/Maps/Duality/Duality': {
        xMultiplier: 0.000059,
        yMultiplier: -0.000059,
        xScalarToAdd: 0.576941,
        yScalarToAdd: 0.967566,
        imagePath: '/maps/bind.png',
        rotation: 0,
    },
    '/Game/Maps/Pitt/Pitt': {
        xMultiplier: 0.000078,
        yMultiplier: -0.000078,
        xScalarToAdd: 0.480469,
        yScalarToAdd: 0.916016,
        imagePath: '/maps/pearl.png',
        rotation: 0,
    },
    '/Game/Maps/Jam/Jam': {
        xMultiplier: 0.000072,
        yMultiplier: -0.000072,
        xScalarToAdd: 0.454789,
        yScalarToAdd: 0.917752,
        imagePath: '/maps/lotus.png',
        rotation: 0,
    },
};
