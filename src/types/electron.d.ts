export { };

declare global {
    interface Window {
        electron?: {
            platform: string;
            openMatchesFolder: () => void;
            getMatchesDir: () => Promise<string>;
            changeMatchesDir: () => Promise<string | null>;
        };
    }
}
