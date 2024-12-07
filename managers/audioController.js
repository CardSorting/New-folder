class AudioController {
    constructor() {
        this.volume = 1.0;
        this.isPlaying = false;
        this.speechSynth = window.speechSynthesis;
        this.utterance = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.audioContext = null;
        this.currentSource = null;
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.utterance) {
            this.utterance.volume = this.volume;
        }
    }

    stop() {
        if (this.isPlaying) {
            if (this.currentSource) {
                this.currentSource.stop();
                this.currentSource = null;
            }
            this.speechSynth.cancel();
            this.isPlaying = false;
            this.utterance = null;
            this.retryCount = 0;
        }
    }

    pause() {
        if (this.isPlaying) {
            this.speechSynth.pause();
            this.isPlaying = false;
        }
    }

    resume() {
        if (!this.isPlaying && this.utterance) {
            this.speechSynth.resume();
            this.isPlaying = true;
        }
    }

    async playBuffer(audioBuffer) {
        return new Promise(async (resolve, reject) => {
            try {
                // Initialize AudioContext if needed
                if (!this.audioContext) {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                }

                // Stop any current playback
                if (this.currentSource) {
                    this.currentSource.stop();
                }

                // Create new source
                this.currentSource = this.audioContext.createBufferSource();
                this.currentSource.buffer = audioBuffer;

                // Create gain node for volume control
                const gainNode = this.audioContext.createGain();
                gainNode.gain.value = this.volume;

                // Connect nodes
                this.currentSource.connect(gainNode);
                gainNode.connect(this.audioContext.destination);

                // Set up completion handler
                this.currentSource.onended = () => {
                    this.isPlaying = false;
                    this.currentSource = null;
                    resolve();
                };

                // Start playback
                this.currentSource.start(0);
                this.isPlaying = true;

            } catch (error) {
                console.error('Error playing audio buffer:', error);
                reject(error);
            }
        });
    }

    async playLine(text, voice) {
        return new Promise((resolve, reject) => {
            const startPlayback = () => {
                try {
                    // Cancel any ongoing speech
                    this.speechSynth.cancel();
                    
                    // Create new utterance
                    this.utterance = new SpeechSynthesisUtterance(text);
                    this.utterance.voice = voice;
                    this.utterance.volume = this.volume;

                    // Set up handlers
                    this.utterance.onend = () => {
                        this.isPlaying = false;
                        this.utterance = null;
                        this.retryCount = 0;
                        resolve();
                    };

                    this.utterance.onerror = (event) => {
                        console.error('Speech synthesis error:', event);
                        
                        // Retry logic for interrupted speech
                        if (event.error === 'interrupted' && this.retryCount < this.maxRetries) {
                            console.log(`Retrying playback (attempt ${this.retryCount + 1}/${this.maxRetries})`);
                            this.retryCount++;
                            startPlayback();
                            return;
                        }
                        
                        this.isPlaying = false;
                        this.utterance = null;
                        reject(event);
                    };

                    // Start playback
                    this.speechSynth.speak(this.utterance);
                    this.isPlaying = true;

                } catch (error) {
                    console.error('Error starting playback:', error);
                    reject(error);
                }
            };

            startPlayback();
        });
    }
}

window.AudioController = AudioController;
