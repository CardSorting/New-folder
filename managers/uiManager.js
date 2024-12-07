class UIManager {
    constructor() {
        console.log('UIManager: Initializing...');
        this.initializeEventListeners();
        this.isPlaying = false;
    }

    initializeEventListeners() {
        console.log('UIManager: Setting up event listeners...');
        
        // Wait for DOM to be ready
        document.addEventListener('DOMContentLoaded', () => {
            console.log('UIManager: DOM Content Loaded');
            this.setupDialogueSubmission();
            this.setupPlaybackControls();
            
            // Emit app ready event after a small delay to ensure other components are loaded
            setTimeout(() => {
                console.log('UIManager: Emitting app:ready event');
                window.eventBus.emit('app:ready');
            }, 100);
        });
    }

    setupPlaybackControls() {
        console.log('UIManager: Setting up playback controls...');
        
        const playButton = document.getElementById('playButton');
        const pauseButton = document.getElementById('pauseButton');
        const stopButton = document.getElementById('stopButton');
        const volumeSlider = document.getElementById('volumeSlider');
        
        if (!playButton || !pauseButton || !stopButton || !volumeSlider) {
            console.error('UIManager: Playback control elements not found');
            return;
        }

        playButton.onclick = async () => {
            const lines = window.managers.script.getLines();
            if (lines.length === 0) {
                window.ToastManager.show('No lines to play', 'error');
                return;
            }

            if (this.isPlaying) {
                return;
            }

            playButton.disabled = true;
            playButton.classList.add('opacity-50');
            this.isPlaying = true;
            
            try {
                for (let i = 0; i < lines.length; i++) {
                    if (!this.isPlaying) break;
                    await window.managers.script.playLine(i);
                    // Add a small pause between lines
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } catch (error) {
                console.error('UIManager: Error during playback:', error);
                window.ToastManager.show('Error during playback: ' + error.message, 'error');
            } finally {
                this.isPlaying = false;
                playButton.disabled = false;
                playButton.classList.remove('opacity-50');
            }
        };

        pauseButton.onclick = () => {
            this.isPlaying = false;
            window.managers.ttsQueue.stopCurrent();
            playButton.disabled = false;
            playButton.classList.remove('opacity-50');
        };

        stopButton.onclick = () => {
            this.isPlaying = false;
            window.managers.ttsQueue.stopCurrent();
            playButton.disabled = false;
            playButton.classList.remove('opacity-50');
        };

        volumeSlider.oninput = (e) => {
            const volume = e.target.value / 100;
            // Update volume for future TTS
            window.speechSynthesis.volume = volume;
        };
    }

    setupDialogueSubmission() {
        console.log('UIManager: Setting up dialogue submission...');
        const form = document.getElementById('dialogueForm');
        const input = document.getElementById('dialogueInput');
        const previewButton = document.getElementById('previewButton');
        
        if (!form || !input || !previewButton) {
            console.error('UIManager: Required form elements not found');
            return;
        }

        form.onsubmit = async (e) => {
            e.preventDefault();
            const text = input.value.trim();
            let selectedVoice = window.managers.character.getSelectedVoice();

            if (!text) {
                console.warn('UIManager: Empty dialogue submitted');
                return;
            }

            // If no voice is selected, try to select the first available voice
            if (!selectedVoice) {
                const voices = window.managers.character.getVoices();
                if (voices && voices.length > 0) {
                    const firstVoice = voices[0];
                    console.log('UIManager: Auto-selecting first voice:', firstVoice.name);
                    window.lastVoiceSelectWasUser = false;
                    window.managers.character.setVoice(firstVoice, false);
                    selectedVoice = firstVoice;
                }
            }

            // Double check we have a valid voice before proceeding
            if (!selectedVoice) {
                console.warn('UIManager: No voice available');
                window.ToastManager.show('Please wait for voices to load or select a voice first', 'error');
                return;
            }

            try {
                console.log('UIManager: Adding dialogue:', text, 'with voice:', selectedVoice.name);
                await window.managers.script.addLine(text, selectedVoice);
                
                // Clear input
                input.value = '';
                
                // Show success message
                window.ToastManager.show('Line added successfully', 'success');
            } catch (error) {
                console.error('UIManager: Error adding dialogue:', error);
                window.ToastManager.show('Error adding dialogue: ' + error.message, 'error');
            }
        };

        previewButton.onclick = async () => {
            const text = input.value.trim();
            let selectedVoice = window.managers.character.getSelectedVoice();

            if (!text) {
                console.warn('UIManager: Empty dialogue submitted');
                return;
            }

            // If no voice is selected, try to select the first available voice
            if (!selectedVoice) {
                const voices = window.managers.character.getVoices();
                if (voices && voices.length > 0) {
                    const firstVoice = voices[0];
                    console.log('UIManager: Auto-selecting first voice:', firstVoice.name);
                    window.lastVoiceSelectWasUser = false;
                    window.managers.character.setVoice(firstVoice, false);
                    selectedVoice = firstVoice;
                }
            }

            if (!selectedVoice) {
                console.warn('UIManager: No voice available');
                window.ToastManager.show('Please wait for voices to load or select a voice first', 'error');
                return;
            }

            try {
                await window.managers.ttsQueue.addToQueue(text, selectedVoice, true);
            } catch (error) {
                console.error('UIManager: Error previewing line:', error);
                window.ToastManager.show('Error previewing line: ' + error.message, 'error');
            }
        };
    }

    handleDialogueSubmit() {
        const dialogueText = document.getElementById('dialogueText');
        const text = dialogueText.value.trim();
        const selectedVoice = window.managers.character.getSelectedVoice();

        try {
            if (!selectedVoice) {
                throw new Error('Please select a voice first');
            }
            
            if (!text) {
                throw new Error('Please enter some text');
            }
            
            window.managers.script.addLine(selectedVoice, text);
            
            // Reset form
            dialogueText.value = '';
            ToastManager.show('Dialogue line added', 'success');
        } catch (error) {
            ToastManager.show(error.message, 'error');
        }
    }

    async togglePlayPause() {
        const button = document.getElementById('playPauseButton');
        const icon = button.querySelector('span');
        
        if (!window.managers.audio.isPlaying) {
            icon.textContent = '⏸️';
            await this.playAllLines();
        } else {
            icon.textContent = '▶️';
            window.managers.audio.pause();
        }
    }

    async playAllLines() {
        const lines = window.managers.script.getLines();
        if (lines.length === 0) {
            ToastManager.show('No lines to play', 'error');
            return;
        }

        try {
            for (let i = 0; i < lines.length; i++) {
                if (!window.managers.audio.isPlaying) break;
                
                const line = lines[i];
                this.updateProgressBar(i);
                const buffer = window.managers.script.getAudioBuffer(i);
                if (!buffer) {
                    console.error('UIManager: Audio buffer not found for line', i);
                    continue;
                }
                await window.managers.audio.playBuffer(buffer);
                
                // Add a small pause between lines
                await new Promise(resolve => setTimeout(resolve, AppConfig.audio.linePauseDuration));
            }
        } catch (error) {
            console.error('Playback error:', error);
            ToastManager.show('Error during playback', 'error');
        } finally {
            const button = document.getElementById('playPauseButton');
            button.querySelector('span').textContent = '▶️';
            this.updateProgressBar(0);
        }
    }

    updateProgressBar(currentLine) {
        const lines = window.managers.script.getLines();
        const progress = (currentLine / lines.length) * 100;
        document.getElementById('progressBar').style.width = `${progress}%`;
        
        // Update time display
        const currentTime = document.getElementById('currentTime');
        const totalTime = document.getElementById('totalTime');
        
        if (lines.length > 0) {
            currentTime.textContent = this.formatTime(currentLine);
            totalTime.textContent = this.formatTime(lines.length);
        } else {
            currentTime.textContent = '0:00';
            totalTime.textContent = '0:00';
        }
    }

    formatTime(lineNumber) {
        const seconds = lineNumber * AppConfig.audio.estimatedLineTime;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    updateVoiceUI() {
        // Voice UI is now handled by CharacterManager
    }

    updateScriptUI() {
        // Update progress bar and time display
        this.updateProgressBar(0);
    }

    async downloadAudio() {
        try {
            const lines = window.managers.script.getLines();
            if (lines.length === 0) {
                alert('No lines to download');
                return;
            }

            // Create a container for all audio elements
            const audioContainer = document.createElement('div');
            audioContainer.style.display = 'none';
            document.body.appendChild(audioContainer);

            for (let i = 0; i < lines.length; i++) {
                const buffer = window.managers.script.getAudioBuffer(i);
                if (!buffer) {
                    console.error('UIManager: Audio buffer not found for line', i);
                    continue;
                }

                // Create a link element for downloading
                const link = document.createElement('a');
                link.href = URL.createObjectURL(buffer);
                link.download = `line_${i + 1}.wav`;
                audioContainer.appendChild(link);
                link.click();

                // Wait a bit between downloads to prevent browser throttling
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Clean up
            document.body.removeChild(audioContainer);
        } catch (error) {
            console.error('UIManager: Error downloading audio:', error);
            alert('Error downloading audio. Please try again.');
        }
    }
}

window.UIManager = UIManager;
