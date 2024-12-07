class ScriptManager {
    constructor() {
        this.currentScriptId = null;
        this.lines = [];
        console.log('ScriptManager: Initializing...');
        
        // Create or load default script
        this.initializeDefaultScript();
        
        // Listen for script updates
        window.eventBus.on('script:updated', () => {
            this.updateScriptDisplay();
        });
    }

    async initializeDefaultScript() {
        try {
            const scripts = await window.api.getAllScripts();
            if (scripts.length === 0) {
                // Create a default script
                this.currentScriptId = await window.api.createScript('Default Script');
            } else {
                // Load the most recent script
                this.currentScriptId = scripts[0].id;
                // Load its lines
                await this.loadCurrentScript();
            }
        } catch (error) {
            console.error('Error initializing default script:', error);
        }
    }

    async loadCurrentScript() {
        if (!this.currentScriptId) {
            console.warn('ScriptManager: No script selected');
            return;
        }
        
        try {
            // Load lines from database
            const lines = await window.api.getScriptLines(this.currentScriptId);
            this.lines = lines.map(line => ({
                id: line.id,
                text: line.text,
                voice: line.voice
            }));
            
            // Update UI
            window.eventBus.emit('script:updated');
        } catch (error) {
            console.error('ScriptManager: Error loading script:', error);
        }
    }

    getLines() {
        return this.lines;
    }

    updateScriptDisplay() {
        const scriptList = document.getElementById('scriptList');
        if (!scriptList) return;

        // Update line count displays
        document.querySelectorAll('.line-count').forEach(element => {
            element.textContent = `${this.lines.length} lines`;
        });

        scriptList.innerHTML = '';
        this.lines.forEach((line, index) => {
            const li = document.createElement('li');
            li.className = 'flex items-center gap-4 p-3 bg-white rounded-lg shadow-sm';
            
            const textDiv = document.createElement('div');
            textDiv.className = 'flex-grow';
            textDiv.innerHTML = `
                <div class="text-sm">${line.text}</div>
                <div class="text-xs text-gray-500">${line.voice.name}</div>
            `;
            
            const controls = document.createElement('div');
            controls.className = 'flex gap-2';
            
            // Play button
            const playBtn = document.createElement('button');
            playBtn.className = 'p-2 text-gray-600 hover:text-primary-600 transition-colors';
            playBtn.innerHTML = '▶️';
            playBtn.onclick = () => this.playLine(index);
            
            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'p-2 text-gray-600 hover:text-red-600 transition-colors';
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.onclick = () => this.removeLine(index);
            
            controls.appendChild(playBtn);
            controls.appendChild(deleteBtn);
            
            li.appendChild(textDiv);
            li.appendChild(controls);
            scriptList.appendChild(li);
        });
    }

    async playLine(index) {
        const line = this.lines[index];
        if (!line) return;

        try {
            // Get the actual SpeechSynthesisVoice object from CharacterManager
            const actualVoice = window.managers.character.findVoiceByName(line.voice.name);
            if (!actualVoice) {
                throw new Error(`Voice "${line.voice.name}" not found`);
            }

            await window.managers.ttsQueue.addToQueue(line.text, actualVoice);
        } catch (error) {
            console.error('Error playing line:', error);
            window.ToastManager.show('Error playing line: ' + error.message, 'error');
        }
    }

    async addLine(text, voice) {
        try {
            console.log('ScriptManager: Adding line with voice:', voice.name);
            
            // Format voice data for database - only using name and lang
            const formattedVoice = {
                name: voice.name,
                lang: voice.lang || 'en-US'
            };
            
            // Add to database
            const lineId = await window.api.addLine(this.currentScriptId, text, formattedVoice, null, this.lines.length);
            
            // Add to memory
            this.lines.push({
                id: lineId,
                text,
                voice: formattedVoice
            });

            // Notify UI of script update
            window.eventBus.emit('script:updated');
            
            return { id: lineId };
        } catch (error) {
            console.error('ScriptManager: Error adding line:', error);
            throw error;
        }
    }

    async removeLine(index) {
        if (index >= 0 && index < this.lines.length) {
            const line = this.lines[index];
            
            try {
                // Remove from database
                await window.api.deleteLine(line.id);
                
                // Remove from memory
                this.lines.splice(index, 1);
                
                // Update sequences for remaining lines
                await Promise.all(this.lines.map((line, idx) => 
                    window.api.updateLineSequence(line.id, idx)
                ));
                
                // Update UI
                window.eventBus.emit('script:updated');
            } catch (error) {
                console.error('Error removing line:', error);
                throw error;
            }
        }
    }
}

window.ScriptManager = ScriptManager;
