class TTSQueueManager {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.speechSynth = window.speechSynthesis;
        this.currentUtterance = null;
        
        // Bind methods
        this.processQueue = this.processQueue.bind(this);
        this.processNextItem = this.processNextItem.bind(this);
    }

    stopCurrent() {
        this.speechSynth.cancel();
        this.currentUtterance = null;
        this.isProcessing = false;
        this.queue = [];
    }

    isValidVoice(voice) {
        return voice && 
               typeof voice === 'object' && 
               typeof voice.name === 'string' && 
               typeof voice.lang === 'string' &&
               typeof voice.localService !== 'undefined';
    }

    addToQueue(text, voice, isPreview = false) {
        return new Promise((resolve, reject) => {
            if (!this.isValidVoice(voice)) {
                console.error('TTSQueueManager: Invalid voice object:', voice);
                reject(new Error('Invalid voice object - must be a valid speech synthesis voice'));
                return;
            }

            // If this is a preview, clear the queue first
            if (isPreview) {
                this.stopCurrent();
            }

            this.queue.push({
                text,
                voice,
                resolve,
                reject,
                isPreview
            });
            
            console.log('TTSQueueManager: Added to queue:', { text, voice: voice.name, isPreview });
            
            if (!this.isProcessing) {
                this.processQueue();
            }
        });
    }

    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;
        
        this.isProcessing = true;
        await this.processNextItem();
    }

    async processNextItem() {
        if (this.queue.length === 0) {
            this.isProcessing = false;
            return;
        }

        const item = this.queue[0];
        console.log('TTSQueueManager: Processing:', { text: item.text, voice: item.voice.name, isPreview: item.isPreview });

        try {
            await this.speakText(item);
            item.resolve();
        } catch (error) {
            console.error('TTSQueueManager: Error processing item:', error);
            item.reject(error);
        }

        this.queue.shift();
        this.processNextItem();
    }

    speakText(item) {
        return new Promise((resolve, reject) => {
            const utterance = new SpeechSynthesisUtterance(item.text);
            utterance.voice = item.voice;
            
            utterance.onend = () => {
                this.currentUtterance = null;
                resolve();
            };
            
            utterance.onerror = (event) => {
                this.currentUtterance = null;
                reject(new Error(`Speech synthesis error: ${event.error}`));
            };

            this.currentUtterance = utterance;
            this.speechSynth.speak(utterance);
        });
    }
}

window.TTSQueueManager = TTSQueueManager;
