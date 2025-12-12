'use client';

import { useState, useRef, useEffect } from 'react';

// Pearl用のテストポイント
const TEST_POINTS = [
    // --- サイト設置位置 ---
    { name: "A Site", x: 6613, y: 5569 },   // Aサイト
    { name: "B Site", x: 5800, y: -2850 },  // Bサイト

    // --- スポーン地点（端と端の確認用） ---
    { name: "Atk Spawn", x: -550, y: -600 },   // 攻撃側スポーン
    { name: "Def Spawn", x: 11092, y: 378 },    // 防衛側スポーン

    // --- 中央エリア ---
    { name: "Mid Plaza", x: 2750, y: -325 },   // ミッド・プラザ
    { name: "Mid Doors", x: 4701, y: 597 },    // ミッド・ドア

    // --- 特徴的なエリア ---
    { name: "B Hall", x: 7495, y: -4954 },  // Bホール（ロングの奥）
    { name: "A Restaurant", x: 4430, y: 2813 },   // Aレストラン
];

// 初期設定
const INITIAL_CONFIG = {
    // APIの値
    xMultiplier: 0.000078,
    yMultiplier: -0.000078,

    // APIの値そのままだとズレる可能性が高いため、
    // ツール上でスライダーを動かして「正解」を見つけてください
    xScalar: 0.480469,
    yScalar: 0.916016,

    // Pearlは横長なので回転が必要なケースが多いです
    rotation: 0,
};

export default function MapCalibrator() {
    const [config, setConfig] = useState(INITIAL_CONFIG);
    const [swapAxis, setSwapAxis] = useState(true); // 初期値をTrueに（多くのマップで必要）

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const img = imgRef.current;

        if (!canvas || !ctx || !img || !img.complete) return;

        // キャンバスサイズ設定
        const width = 800;
        const height = width * (img.naturalHeight / img.naturalWidth);
        canvas.width = width;
        canvas.height = height;

        // 1. 画像描画
        ctx.clearRect(0, 0, width, height);

        ctx.save();
        // 回転処理
        if (config.rotation !== 0) {
            ctx.translate(width / 2, height / 2);
            ctx.rotate((config.rotation * Math.PI) / 180);
            ctx.translate(-width / 2, -height / 2);
        }
        ctx.drawImage(img, 0, 0, width, height);
        ctx.restore();

        // 2. ピン描画
        TEST_POINTS.forEach(p => {
            let normX, normY;

            // 軸の計算ロジック
            if (swapAxis) {
                // [重要] Valorant標準: GameY -> ScreenX, GameX -> ScreenY
                normX = (p.y * config.xMultiplier) + config.xScalar;
                normY = (p.x * config.yMultiplier) + config.yScalar;
            } else {
                // 素直な出力: GameX -> ScreenX
                normX = (p.x * config.xMultiplier) + config.xScalar;
                normY = (p.y * config.yMultiplier) + config.yScalar;
            }

            const screenX = normX * width;
            const screenY = normY * height;

            // 点を描画
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(screenX, screenY, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 文字を描画
            ctx.fillStyle = 'yellow';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3;
            ctx.strokeText(p.name, screenX, screenY - 10);
            ctx.fillText(p.name, screenX, screenY - 10);
        });

    }, [config, swapAxis]);

    return (
        <div className="flex gap-4 p-4 bg-gray-900 text-white min-h-screen">
            <div className="flex-1 overflow-auto">
                {/* 画像パスは適宜変更してください */}
                <img
                    ref={imgRef}
                    src="/maps/pearl.png"
                    alt="map"
                    className="hidden"
                    onLoad={() => setConfig({ ...config })}
                />
                <canvas ref={canvasRef} className="border border-gray-600 bg-gray-800 mx-auto" />
            </div>

            <div className="w-96 space-y-6 p-4 bg-gray-800 rounded shadow-lg h-fit">
                <h2 className="text-xl font-bold border-b border-gray-600 pb-2">Map Tuner</h2>

                {/* --- 軸設定 --- */}
                <div className="flex items-center justify-between">
                    <label className="font-bold">Swap Axis (XY入替)</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={swapAxis}
                            onChange={e => setSwapAxis(e.target.checked)}
                            className="w-5 h-5 accent-blue-500"
                        />
                        <span className="text-xs text-gray-400">{swapAxis ? 'ON' : 'OFF'}</span>
                    </div>
                </div>

                {/* --- 回転設定 --- */}
                <div>
                    <div className="flex justify-between mb-1">
                        <label>Rotation</label>
                        <span className="font-mono">{config.rotation}°</span>
                    </div>
                    <input
                        type="range" min="-180" max="180" step="90"
                        value={config.rotation}
                        onChange={e => setConfig({ ...config, rotation: Number(e.target.value) })}
                        className="w-full accent-blue-500"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>-180</span><span>-90</span><span>0</span><span>90</span><span>180</span>
                    </div>
                </div>

                {/* --- 位置調整 (Scalar) --- */}
                <div className="border-t border-gray-600 pt-4">
                    <h3 className="font-bold mb-2 text-blue-400">Position (Scalar)</h3>

                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>X Scalar (左右)</span>
                                <span className="font-mono text-xs">{config.xScalar.toFixed(5)}</span>
                            </div>
                            <input
                                type="range" min="0" max="1" step="0.001"
                                value={config.xScalar}
                                onChange={e => setConfig({ ...config, xScalar: Number(e.target.value) })}
                                className="w-full accent-green-500"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>Y Scalar (上下)</span>
                                <span className="font-mono text-xs">{config.yScalar.toFixed(5)}</span>
                            </div>
                            <input
                                type="range" min="0" max="1" step="0.001"
                                value={config.yScalar}
                                onChange={e => setConfig({ ...config, yScalar: Number(e.target.value) })}
                                className="w-full accent-green-500"
                            />
                        </div>
                    </div>
                </div>

                {/* --- 縮尺調整 (Multiplier) --- */}
                <div className="border-t border-gray-600 pt-4">
                    <h3 className="font-bold mb-2 text-red-400">Scale (Multiplier)</h3>

                    <div className="mb-2">
                        <label className="text-xs text-gray-400 block mb-1">Direct Input (直接入力)</label>
                        <input
                            type="number"
                            step="0.000001"
                            value={config.xMultiplier}
                            onChange={e => {
                                const val = parseFloat(e.target.value);
                                setConfig({ ...config, xMultiplier: val, yMultiplier: -val });
                            }}
                            className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 font-mono text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <input
                        type="range" min="0.00005" max="0.0001" step="0.000001"
                        value={Math.abs(config.xMultiplier)}
                        onChange={e => {
                            const val = Number(e.target.value);
                            setConfig({
                                ...config,
                                xMultiplier: val,
                                yMultiplier: -val // Yは反転連動
                            });
                        }}
                        className="w-full accent-red-500"
                    />
                </div>

                {/* --- 結果出力 --- */}
                <div className="mt-4 p-3 bg-black rounded border border-gray-700 font-mono text-xs overflow-x-auto select-all">
                    <p className="text-gray-500 mb-1">// Copy this to MAP_CONFIGS</p>
                    <p><span className="text-blue-400">xMultiplier:</span> {config.xMultiplier},</p>
                    <p><span className="text-blue-400">yMultiplier:</span> {config.yMultiplier},</p>
                    <p><span className="text-green-400">xScalarToAdd:</span> {config.xScalar},</p>
                    <p><span className="text-green-400">yScalarToAdd:</span> {config.yScalar},</p>
                    <p><span className="text-purple-400">rotation:</span> {config.rotation},</p>
                    {/* SwapAxisはコードのロジックを変える必要があるため注意書き */}
                    <p className="text-yellow-500 mt-2">
                        {swapAxis ? '// NOTE: Requires Axis Swap (loc.y * xMult)' : '// NOTE: Standard Axis (loc.x * xMult)'}
                    </p>
                </div>
            </div>
        </div>
    );
}