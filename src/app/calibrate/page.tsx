import MapCalibrator from '@/components/MapCalibrator';

export default function CalibratePage() {
    return (
        <main className="min-h-screen bg-black">
            {/* 調整ツールを表示 */}
            <MapCalibrator />
        </main>
    );
}