class CharacterManager {
    constructor() {
        this.voices = [];
        this.selectedVoice = null;
        this.speechSynth = window.speechSynthesis;
        
        console.log('CharacterManager: Initializing...');
        
        // Try initial voice load
        this.loadVoices();
        
        // Some browsers need this event to load voices
        if (this.speechSynth.onvoiceschanged !== undefined) {
            console.log('CharacterManager: Setting up onvoiceschanged handler');
            this.speechSynth.onvoiceschanged = () => {
                console.log('CharacterManager: Voices changed event fired');
                this.loadVoices();
            };
        }

        // Also try to load voices when app is ready
        window.eventBus.on('app:ready', () => {
            console.log('CharacterManager: App ready event received');
            this.loadVoices();
        });
    }

    loadVoices() {
        console.log('CharacterManager: Loading voices...');
        const allVoices = this.speechSynth.getVoices();
        console.log('CharacterManager: All voices:', allVoices);
        
        if (allVoices.length === 0) {
            console.log('CharacterManager: No voices available yet, will try again later');
            // Try again in a moment
            setTimeout(() => this.loadVoices(), 100);
            return;
        }
        
        // Filter for English voices
        this.voices = allVoices.filter(voice => {
            const isEnglish = voice.lang.startsWith('en');
            console.log(`CharacterManager: Voice ${voice.name} (${voice.lang}) - isEnglish: ${isEnglish}`);
            return isEnglish;
        });

        console.log('CharacterManager: Loaded English voices:', this.voices.length);
        
        // Update UI
        this.updateVoiceGrid();
        
        // Emit event that voices have been updated
        window.eventBus.emit('voices:updated', this.voices);
    }

    updateVoiceGrid() {
        console.log('CharacterManager: Updating voice grid...');
        const voiceGrid = document.getElementById('voiceGrid');
        const selectedVoiceName = document.getElementById('selectedVoiceName');
        
        if (!voiceGrid) {
            console.error('CharacterManager: Voice grid element not found');
            return;
        }
        
        // Clear existing buttons
        voiceGrid.innerHTML = '';
        
        // Add voices as buttons
        this.voices.forEach((voice, index) => {
            const button = document.createElement('button');
            button.className = 'voice-button w-full p-3 rounded-lg border transition-all duration-150 text-left ' + 
                             (this.selectedVoice === voice ? 
                              'border-primary-500 bg-primary-50 text-primary-700 shadow-sm' : 
                              'border-gray-200 hover:border-primary-300 hover:bg-primary-50/50');
            
            const name = document.createElement('div');
            name.className = 'text-sm font-medium';
            name.textContent = voice.name;
            
            const lang = document.createElement('div');
            lang.className = 'text-xs text-gray-500 mt-1';
            lang.textContent = voice.lang;
            
            button.appendChild(name);
            button.appendChild(lang);
            
            button.onclick = () => {
                // Remove selected styling from all buttons
                voiceGrid.querySelectorAll('.voice-button').forEach(btn => {
                    btn.classList.remove('border-primary-500', 'bg-primary-50', 'text-primary-700', 'shadow-sm');
                    btn.classList.add('border-gray-200');
                });
                
                // Add selected styling to clicked button
                button.classList.remove('border-gray-200');
                button.classList.add('border-primary-500', 'bg-primary-50', 'text-primary-700', 'shadow-sm');
                
                // Update selected voice
                this.selectedVoice = voice;
                if (selectedVoiceName) {
                    selectedVoiceName.textContent = `Selected: ${voice.name} (${voice.lang})`;
                }
                
                // Only preview if this was a user click, not an auto-select
                if (window.lastVoiceSelectWasUser) {
                    this.previewVoice(voice);
                }
            };
            
            voiceGrid.appendChild(button);
        });

        console.log('CharacterManager: Updated voice grid with', this.voices.length, 'voices');
    }

    previewVoice(voice) {
        if (voice) {
            console.log('CharacterManager: Previewing voice:', voice.name);
            // Stop any current playback
            window.managers.audio.stop();
            window.managers.ttsQueue.stopCurrent();
            // Preview new voice
            window.managers.ttsQueue.addToQueue('Hello, I am ' + voice.name, voice, 'preview.wav', true);
        }
    }

    setVoice(voice, shouldPreview = false) {
        this.selectedVoice = voice;
        const selectedVoiceName = document.getElementById('selectedVoiceName');
        if (selectedVoiceName) {
            selectedVoiceName.textContent = `Selected: ${voice.name} (${voice.lang})`;
        }
        
        // Update button styling
        const voiceGrid = document.getElementById('voiceGrid');
        if (voiceGrid) {
            voiceGrid.querySelectorAll('.voice-button').forEach(btn => {
                const isSelected = btn.querySelector('.text-sm').textContent === voice.name;
                // Remove all state classes
                btn.classList.remove('border-primary-500');
                btn.classList.remove('bg-primary-50');
                btn.classList.remove('text-primary-700');
                btn.classList.remove('shadow-sm');
                btn.classList.remove('border-gray-200');
                
                // Add appropriate classes based on selection state
                if (isSelected) {
                    btn.classList.add('border-primary-500');
                    btn.classList.add('bg-primary-50');
                    btn.classList.add('text-primary-700');
                    btn.classList.add('shadow-sm');
                } else {
                    btn.classList.add('border-gray-200');
                }
            });
        }

        if (shouldPreview) {
            this.previewVoice(voice);
        }
    }

    findVoiceByName(name) {
        return this.voices.find(voice => voice.name === name) || null;
    }

    getVoices() {
        return this.voices;
    }

    getSelectedVoice() {
        return this.selectedVoice;
    }
}

window.CharacterManager = CharacterManager;
