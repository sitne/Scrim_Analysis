'use client';

import { useEffect, useRef } from 'react';
import { getMapDisplayName } from '@/lib/utils';

interface HeatmapPoint {
  x: number;
  y: number;
  intensity: number;
}

interface MapData {
  xMultiplier: number;
  yMultiplier: number;
  xScalarToAdd: number;
  yScalarToAdd: number;
  imagePath: string;
  rotation: number; // 角度（度数法）
}

const MAP_CONFIGS: Record<string, MapData> = {
  '/Game/Maps/Juliett/Juliett': {
    xMultiplier: 0.000074,
    yMultiplier: -0.000074,
    xScalarToAdd: 0.5,
    yScalarToAdd: 0.515625,
    imagePath: '/maps/sunset.png',
    rotation: 270,
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

interface BombPlantHeatmapProps {
  mapId: string;
  plantLocations: Array<{
    x: number;
    y: number;
  }>;
}

export function BombPlantHeatmap({ mapId, plantLocations }: BombPlantHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const mapConfig = MAP_CONFIGS[mapId];

  useEffect(() => {
    if (!canvasRef.current || !mapConfig || plantLocations.length === 0) return;

    // 画像が読み込まれるまで待つ
    const img = imgRef.current;
    if (!img || !img.complete) {
      // 画像がまだ読み込まれていない場合は、画像の読み込み完了を待つ
      if (img) {
        img.onload = renderHeatmap;
      }
      return;
    }

    renderHeatmap();

    function renderHeatmap() {
      if (!canvasRef.current || !mapConfig) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const container = containerRef.current;
      if (!container) return;

      const img = imgRef.current;
      if (!img || !img.complete) return;

      // Use image's natural aspect ratio
      const containerWidth = container.clientWidth;
      const imageAspectRatio = img.naturalHeight / img.naturalWidth;
      const width = containerWidth;
      const height = containerWidth * imageAspectRatio;

      canvas.width = width;
      canvas.height = height;

      // Draw map image
      if (mapConfig.rotation !== 0) {
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate((mapConfig.rotation * Math.PI) / 180);
        ctx.drawImage(img, -width / 2, -height / 2, width, height);
        ctx.restore();
      } else {
        ctx.drawImage(img, 0, 0, width, height);
      }

      const heatmapPoints: HeatmapPoint[] = plantLocations.map((loc) => {
        const normalizedX = loc.x * mapConfig.xMultiplier + mapConfig.xScalarToAdd;
        const normalizedY = loc.y * mapConfig.yMultiplier + mapConfig.yScalarToAdd;
        const canvasX = normalizedX * width;
        const canvasY = normalizedY * height;

        // Debug logging for Pearl
        if (mapId === '/Game/Maps/Pitt/Pitt') {
          console.log('Pearl plant location:', {
            raw: { x: loc.x, y: loc.y },
            normalized: { x: normalizedX, y: normalizedY },
            canvas: { x: canvasX, y: canvasY }
          });
        }

        return {
          x: canvasX,
          y: canvasY,
          intensity: 1,
        };
      });

      const heatmapCanvas = document.createElement('canvas');
      heatmapCanvas.width = width;
      heatmapCanvas.height = height;
      const heatmapCtx = heatmapCanvas.getContext('2d');
      if (!heatmapCtx) return;

      const imageData = heatmapCtx.createImageData(width, height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const pixelIndex = i / 4;
        const pixelX = pixelIndex % width;
        const pixelY = Math.floor(pixelIndex / width);

        let heatValue = 0;
        const radius = 60;

        for (const point of heatmapPoints) {
          const dx = pixelX - point.x;
          const dy = pixelY - point.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < radius) {
            const influence = (1 - distance / radius) * 0.8;
            heatValue += influence;
          }
        }

        let r = 0, g = 0, b = 0, a = 0;

        if (heatValue > 0.01) {
          if (heatValue < 0.25) {
            b = Math.floor(255 * (heatValue / 0.25));
            a = Math.floor(heatValue * 200);
          } else if (heatValue < 0.5) {
            b = Math.floor(255 * (1 - (heatValue - 0.25) / 0.25));
            g = Math.floor(255 * ((heatValue - 0.25) / 0.25));
            a = Math.floor(heatValue * 220);
          } else if (heatValue < 0.75) {
            g = 255;
            r = Math.floor(255 * ((heatValue - 0.5) / 0.25));
            a = Math.floor(heatValue * 240);
          } else {
            r = 255;
            g = Math.floor(255 * (1 - (heatValue - 0.75) / 0.25));
            a = Math.floor(Math.min(heatValue * 250, 255));
          }
        }

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = a;
      }

      heatmapCtx.putImageData(imageData, 0, 0);
      ctx.drawImage(heatmapCanvas, 0, 0);

      for (const point of heatmapPoints) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }, [mapConfig, plantLocations]);

  if (!mapConfig) {
    return (
      <div className="text-gray-400 text-center py-8">
        このマップはヒートマップをサポートしていません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">爆弾設置位置ヒートマップ - {getMapDisplayName(mapId)}</h3>
        <p className="text-sm text-gray-400">
          プレイ中に爆弾が設置された位置の集中度を表示
        </p>
      </div>
      <div ref={containerRef} className="relative w-full">
        <canvas
          ref={canvasRef}
          className="w-full border border-gray-700 rounded-lg bg-gray-800"
        />
      </div>
      <img
        ref={imgRef}
        src={mapConfig.imagePath}
        alt={getMapDisplayName(mapId)}
        style={{ display: 'none' }}
      />
      <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
        <div>
          <p className="font-semibold text-white">統計情報</p>
          <p>設置位置数: {plantLocations.length}</p>
        </div>
        <div>
          <p className="font-semibold text-white">凡例</p>
          <p>青→黄→赤: 低密度→高密度</p>
        </div>
      </div>
    </div>
  );
}
