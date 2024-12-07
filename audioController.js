class AudioController {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioBuffers = [];
        this.isPlaying = false;
        this.currentPlaybackPosition = 0;
        this.currentLine = 0;
        this.playbackQueue = [];
        
        // Create gain node for volume control
        this.gainNode = this.audioContext.createGain();
        this.gainNode.connect(this.audioContext.destination);
        this.gainNode.gain.value = 1.0; // Default volume
    }

    async textToSpeechToAudioBuffer(text, voice) {
        return new Promise((resolve, reject) => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.voice = voice;

            // Create a MediaStream for recording
            const mediaStream = new MediaStreamAudioDestinationNode(this.audioContext);
            const mediaRecorder = new MediaRecorder(mediaStream.stream);
            const audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const arrayBuffer = await audioBlob.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                resolve(audioBuffer);
            };

            mediaRecorder.start();
            utterance.onend = () => mediaRecorder.stop();
            speechSynthesis.speak(utterance);
        });
    }

    setVolume(value) {
        this.gainNode.gain.value = Math.max(0, Math.min(1, value));
    }

    getVolume() {
        return this.gainNode.gain.value;
    }

    async playLine(text, voice) {
        if (this.isPlaying) {
            this.stop();
        }
        const buffer = await this.textToSpeechToAudioBuffer(text, voice);
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.gainNode);
        source.start(0);
        this.isPlaying = true;
        
        return new Promise(resolve => {
            source.onended = () => {
                this.isPlaying = false;
                resolve();
            };
        });
    }

    stop() {
        speechSynthesis.cancel();
        this.isPlaying = false;
        this.playbackQueue = [];
        this.currentLine = 0;
    }

    pause() {
        if (this.isPlaying) {
            speechSynthesis.pause();
            this.isPlaying = false;
        }
    }

    resume() {
        if (!this.isPlaying) {
            speechSynthesis.resume();
            this.isPlaying = true;
        }
    }

    async generateAudioFile(scriptLines) {
        if (scriptLines.length === 0) {
            throw new Error('No lines to generate audio from');
        }

        // Reset audio buffers
        this.audioBuffers = [];
        
        // Convert each line to audio buffer
        for (const line of scriptLines) {
            const buffer = await this.textToSpeechToAudioBuffer(line.text, line.character.voice);
            this.audioBuffers.push(buffer);
        }

        // Calculate total duration and create final buffer
        const totalDuration = this.audioBuffers.reduce((acc, buffer) => acc + buffer.duration + 0.5, 0);
        const finalBuffer = this.audioContext.createBuffer(
            1, // mono
            this.audioContext.sampleRate * totalDuration,
            this.audioContext.sampleRate
        );

        // Merge all buffers
        let offset = 0;
        for (const buffer of this.audioBuffers) {
            for (let i = 0; i < buffer.numberOfChannels; i++) {
                const outputData = finalBuffer.getChannelData(0);
                const inputData = buffer.getChannelData(i);
                for (let j = 0; j < buffer.length; j++) {
                    outputData[j + offset] += inputData[j] / buffer.numberOfChannels;
                }
            }
            offset += buffer.length + this.audioContext.sampleRate * 0.5; // Add 0.5s gap
        }

        return this.audioBufferToWav(finalBuffer);
    }

    audioBufferToWav(buffer) {
        const numOfChan = buffer.numberOfChannels;
        const length = buffer.length * numOfChan * 2;
        const buffer32 = new Float32Array(buffer.length * numOfChan);
        const view = new DataView(new ArrayBuffer(44 + length));
        let offset = 0;
        let pos = 0;

        // Write WAV header
        this.writeString(view, offset, 'RIFF'); offset += 4;
        view.setUint32(offset, 36 + length, true); offset += 4;
        this.writeString(view, offset, 'WAVE'); offset += 4;
        this.writeString(view, offset, 'fmt '); offset += 4;
        view.setUint32(offset, 16, true); offset += 4;
        view.setUint16(offset, 1, true); offset += 2;
        view.setUint16(offset, numOfChan, true); offset += 2;
        view.setUint32(offset, buffer.sampleRate, true); offset += 4;
        view.setUint32(offset, buffer.sampleRate * 2 * numOfChan, true); offset += 4;
        view.setUint16(offset, numOfChan * 2, true); offset += 2;
        view.setUint16(offset, 16, true); offset += 2;
        this.writeString(view, offset, 'data'); offset += 4;
        view.setUint32(offset, length, true); offset += 4;

        // Write audio data
        for (let i = 0; i < buffer.numberOfChannels; i++) {
            const channel = buffer.getChannelData(i);
            for (let j = 0; j < buffer.length; j++) {
                buffer32[pos] = channel[j];
                pos++;
            }
        }

        // Convert to 16-bit PCM
        for (let i = 0; i < buffer32.length; i++) {
            const s = Math.max(-1, Math.min(1, buffer32[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            offset += 2;
        }

        return view.buffer;
    }

    writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }
}
