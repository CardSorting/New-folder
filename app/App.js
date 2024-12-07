class App {
    constructor() {
        this.managers = {};
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        try {
            // Create event bus if not exists
            if (!window.eventBus) {
                window.eventBus = new EventEmitter();
            }

            // Initialize core managers
            this.managers.character = new CharacterManager();
            this.managers.script = new ScriptManager();
            this.managers.audio = new AudioController();
            this.managers.ttsQueue = new TTSQueueManager();
            this.managers.ui = new UIManager(
                this.managers.character,
                this.managers.script,
                this.managers.audio
            );

            // Set up global access for debugging
            window.managers = this.managers;

            // Initialize volume control
            this.initializeVolumeControl();

            // Wait a bit for voices to load in some browsers
            await new Promise(resolve => setTimeout(resolve, 100));

            // Emit app ready event
            window.eventBus.emit('app:ready');

            this.initialized = true;
            console.log('App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            if (window.ToastManager) {
                window.ToastManager.show('Failed to initialize app: ' + error.message, 'error');
            } else {
                alert('Failed to initialize app: ' + error.message);
            }
        }
    }

    initializeVolumeControl() {
        const volumeSlider = document.getElementById('volumeSlider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                const volume = e.target.value / 100;
                this.managers.audio.setVolume(volume);
            });
        }
    }

    static getInstance() {
        if (!window.app) {
            window.app = new App();
        }
        return window.app;
    }
}

// Export for use in other files
window.App = App;
