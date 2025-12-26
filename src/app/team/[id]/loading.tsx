export default function TeamLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Team Header Skeleton */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <div className="h-10 w-48 bg-gray-800 rounded mb-2"></div>
                    <div className="h-4 w-32 bg-gray-800 rounded"></div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="h-10 w-40 bg-gray-800 rounded"></div>
                    <div className="h-10 w-28 bg-gray-800 rounded"></div>
                    <div className="h-10 w-24 bg-gray-800 rounded"></div>
                </div>
            </div>

            {/* Match List Skeleton */}
            <div className="grid gap-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6 h-32 flex justify-between items-center">
                        <div className="space-y-3">
                            <div className="h-6 w-32 bg-gray-700 rounded"></div>
                            <div className="h-4 w-24 bg-gray-700 rounded"></div>
                            <div className="flex gap-2">
                                <div className="h-4 w-12 bg-gray-700 rounded"></div>
                                <div className="h-4 w-12 bg-gray-700 rounded"></div>
                            </div>
                        </div>
                        <div className="h-12 w-24 bg-gray-700 rounded"></div>
                    </div>
                ))}
            </div>
        </div>
    );
}
