'use client';

import { useEffect, useRef, useState } from 'react';
import { getMapDisplayName } from '@/lib/utils';
import { MAP_CONFIGS } from '@/lib/map-configs';

export type HeatmapPointType = 'plant' | 'kill' | 'death';

export interface HeatmapPointData {
    x: number;
    y: number;
    type: HeatmapPointType;
}

interface HeatmapPoint {
    x: number;
    y: number;
    intensity: number;
}

interface MatchHeatmapProps {
    mapId: string;
    points: HeatmapPointData[];
}

export function MatchHeatmap({ mapId, points }: MatchHeatmapProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const mapConfig = MAP_CONFIGS[mapId];

    const [activeTab, setActiveTab] = useState<HeatmapPointType>('plant');

    const filteredPoints = points.filter(p => p.type === activeTab);

    useEffect(() => {
        if (!canvasRef.current || !mapConfig) return;

        const img = imgRef.current;
        if (!img || !img.complete) {
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

            const heatmapPoints: HeatmapPoint[] = filteredPoints.map((loc) => {
                const normalizedX = loc.x * mapConfig.xMultiplier + mapConfig.xScalarToAdd;
                const normalizedY = loc.y * mapConfig.yMultiplier + mapConfig.yScalarToAdd;
                const canvasX = normalizedX * width;
                const canvasY = normalizedY * height;

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
                    // Color scheme based on type
                    if (activeTab === 'plant') {
                        // Red scheme (existing)
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
                    } else if (activeTab === 'kill') {
                        // Green scheme
                        r = 0;
                        b = 0;
                        g = Math.min(255, Math.floor(heatValue * 255 * 2));
                        a = Math.floor(Math.min(heatValue * 200, 255));
                    } else if (activeTab === 'death') {
                        // Purple/Magenta scheme
                        g = 0;
                        r = Math.min(255, Math.floor(heatValue * 255 * 2));
                        b = Math.min(255, Math.floor(heatValue * 255 * 2));
                        a = Math.floor(Math.min(heatValue * 200, 255));
                    }
                }

                data[i] = r;
                data[i + 1] = g;
                data[i + 2] = b;
                data[i + 3] = a;
            }

            heatmapCtx.putImageData(imageData, 0, 0);
            ctx.drawImage(heatmapCanvas, 0, 0);

            // Draw points
            for (const point of heatmapPoints) {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);

                if (activeTab === 'plant') {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.fill();
                    ctx.strokeStyle = '#ff0000';
                } else if (activeTab === 'kill') {
                    ctx.fillStyle = 'rgba(200, 255, 200, 0.8)';
                    ctx.fill();
                    ctx.strokeStyle = '#00ff00';
                } else {
                    ctx.fillStyle = 'rgba(255, 200, 255, 0.8)';
                    ctx.fill();
                    ctx.strokeStyle = '#ff00ff';
                }

                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    }, [mapConfig, filteredPoints, activeTab]);

    if (!mapConfig) {
        return (
            <div className="text-gray-400 text-center py-8">
                このマップはヒートマップをサポートしていません
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-white mb-2">ヒートマップ - {getMapDisplayName(mapId)}</h3>
                    <p className="text-sm text-gray-400">
                        {activeTab === 'plant' && '爆弾設置位置の集中度を表示'}
                        {activeTab === 'kill' && 'キル発生位置（キラーの位置）の集中度を表示'}
                        {activeTab === 'death' && 'デス発生位置（被害者の位置）の集中度を表示'}
                    </p>
                </div>
                <div className="flex space-x-2 bg-gray-800 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('plant')}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${activeTab === 'plant' ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Plant
                    </button>
                    <button
                        onClick={() => setActiveTab('kill')}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${activeTab === 'kill' ? 'bg-green-500/20 text-green-400' : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Kill
                    </button>
                    <button
                        onClick={() => setActiveTab('death')}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${activeTab === 'death' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Death
                    </button>
                </div>
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
                    <p>データポイント数: {filteredPoints.length}</p>
                </div>
                <div>
                    <p className="font-semibold text-white">凡例</p>
                    <p>
                        {activeTab === 'plant' && '青→黄→赤: 低密度→高密度'}
                        {activeTab === 'kill' && '薄緑→濃緑: 低密度→高密度'}
                        {activeTab === 'death' && '薄紫→濃紫: 低密度→高密度'}
                    </p>
                </div>
            </div>
        </div>
    );
}
