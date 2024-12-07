const AppConfig = {
    audio: {
        defaultVolume: 1.0,
        minVolume: 0,
        maxVolume: 1,
        linePauseDuration: 500,
        estimatedLineTime: 3, // seconds per line estimate
    },
    voice: {
        defaultRate: 1,
        defaultPitch: 1,
        defaultVolume: 1,
        languageFilter: 'en'  // filter for English voices
    },
    ui: {
        toastDuration: 3000,
        progressUpdateInterval: 100
    }
};

if (typeof window !== 'undefined') {
    window.AppConfig = AppConfig;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppConfig;
}
