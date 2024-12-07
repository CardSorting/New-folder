// Create event bus
window.eventBus = new EventEmitter();

// Initialize app
const app = new App();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Export for debugging
window.app = app;

// Initialize managers
const audioController = new AudioController();
const characterManager = new CharacterManager();
const scriptManager = new ScriptManager();
const ttsQueue = new TTSQueueManager();
const uiManager = new UIManager(characterManager, scriptManager, audioController);

// Export for debugging
window.managers = {
    audio: audioController,
    character: characterManager,
    script: scriptManager,
    ui: uiManager,
    ttsQueue: ttsQueue
};

// Initialize volume control
document.getElementById('volumeSlider').addEventListener('input', (e) => {
    const volume = e.target.value / 100;
    audioController.setVolume(volume);
});

async function togglePlayPause() {
    const button = document.getElementById('playPauseButton');
    const icon = button.querySelector('span');
    
    if (!audioController.isPlaying) {
        icon.textContent = '⏸️';
        playAllLines();
    } else {
        icon.textContent = '▶️';
        audioController.pause();
    }
}

async function playAllLines() {
    if (scriptManager.getScriptLines().length === 0) {
        showToast('No lines to play', 'error');
        return;
    }

    try {
        for (let i = 0; i < scriptManager.getScriptLines().length; i++) {
            if (!audioController.isPlaying) break;
            
            const line = scriptManager.getScriptLines()[i];
            updateProgressBar(i);
            await audioController.playLine(line.text, line.character.voice);
            
            // Add a small pause between lines
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    } catch (error) {
        console.error('Playback error:', error);
        showToast('Error during playback', 'error');
    } finally {
        const button = document.getElementById('playPauseButton');
        button.querySelector('span').textContent = '▶️';
        updateProgressBar(0);
    }
}

function updateProgressBar(currentLine) {
    const progress = (currentLine / scriptManager.getScriptLines().length) * 100;
    document.getElementById('progressBar').style.width = `${progress}%`;
    
    // Update time display
    const currentTime = document.getElementById('currentTime');
    const totalTime = document.getElementById('totalTime');
    
    if (scriptManager.getScriptLines().length > 0) {
        currentTime.textContent = formatTime(currentLine);
        totalTime.textContent = formatTime(scriptManager.getScriptLines().length);
    } else {
        currentTime.textContent = '0:00';
        totalTime.textContent = '0:00';
    }
}

function formatTime(lineNumber) {
    // Rough estimation: each line takes about 3 seconds
    const seconds = lineNumber * 3;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

async function downloadAudio() {
    if (scriptManager.getScriptLines().length === 0) {
        showToast('No lines to generate audio from', 'error');
        return;
    }

    showToast('Generating audio...', 'info');
    
    try {
        const wavBuffer = await audioController.generateAudioFile(scriptManager.getScriptLines());
        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'narration.wav';
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast('Audio downloaded successfully!', 'success');
    } catch (error) {
        console.error('Error generating audio:', error);
        showToast('Error generating audio. Please try again.', 'error');
    }
}

function loadVoices() {
    const voiceSelect = document.getElementById('characterVoice');
    const voices = window.speechSynthesis.getVoices();
    
    // Clear existing options
    voiceSelect.innerHTML = '<option value="" class="text-gray-500">Select a voice for your character...</option>';
    
    // Group voices by language and sort them
    const voicesByLang = voices.reduce((acc, voice) => {
        const lang = voice.lang.split('-')[0];
        if (!acc[lang]) acc[lang] = [];
        acc[lang].push(voice);
        return acc;
    }, {});

    // Sort languages alphabetically
    const sortedLangs = Object.keys(voicesByLang).sort((a, b) => {
        return new Intl.DisplayNames([navigator.language], { type: 'language' }).of(a)
            .localeCompare(new Intl.DisplayNames([navigator.language], { type: 'language' }).of(b));
    });

    // Add voices grouped by language
    sortedLangs.forEach(lang => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = new Intl.DisplayNames([navigator.language], { type: 'language' }).of(lang);
        
        // Sort voices within each language group
        voicesByLang[lang].sort((a, b) => a.name.localeCompare(b.name)).forEach(voice => {
            const option = document.createElement('option');
            option.value = voices.indexOf(voice);
            option.textContent = voice.name;
            optgroup.appendChild(option);
        });
        
        voiceSelect.appendChild(optgroup);
    });

    // Create default characters if none exist
    if (characterManager.getCharacters().length === 0) {
        const defaultCharacters = createDefaultCharacters(voices);
        defaultCharacters.forEach(character => characterManager.addCharacter(character.name, character.voice, character.color));
        updateCharactersList();
        updateSpeakingCharacterSelect();
    }

    updateCounters();
}

function updateCounters() {
    document.querySelector('.character-count').textContent = 
        `${characterManager.getCharacters().length} character${characterManager.getCharacters().length !== 1 ? 's' : ''}`;
    document.querySelector('.line-count').textContent = 
        `${scriptManager.getScriptLines().length} line${scriptManager.getScriptLines().length !== 1 ? 's' : ''}`;
}

function createDefaultCharacters(voices) {
    const defaultCharacters = [];
    const englishVoices = voices.filter(v => v.lang.startsWith('en-'));
    
    // Categorize voices by perceived gender based on name
    const maleVoices = englishVoices.filter(v => 
        v.name.toLowerCase().includes('david') || 
        v.name.toLowerCase().includes('mark') || 
        v.name.toLowerCase().includes('james'));
    
    const femaleVoices = englishVoices.filter(v => 
        v.name.toLowerCase().includes('zira') || 
        v.name.toLowerCase().includes('linda') || 
        v.name.toLowerCase().includes('mary'));

    if (maleVoices.length > 0) {
        defaultCharacters.push(
            { name: "Narrator", voice: maleVoices[0], color: '#4B5563' },
            { name: "John", voice: maleVoices[0], color: '#2563EB' }
        );
        if (maleVoices.length > 1) {
            defaultCharacters.push(
                { name: "Michael", voice: maleVoices[1], color: '#7C3AED' }
            );
        }
    }
    
    if (femaleVoices.length > 0) {
        defaultCharacters.push(
            { name: "Sarah", voice: femaleVoices[0], color: '#DB2777' }
        );
        if (femaleVoices.length > 1) {
            defaultCharacters.push(
                { name: "Emily", voice: femaleVoices[1], color: '#9D174D' }
            );
        }
    }
    
    return defaultCharacters;
}

function updateCharactersList() {
    const list = document.getElementById('charactersList');
    list.innerHTML = '';
    
    if (characterManager.getCharacters().length === 0) {
        list.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <div class="text-4xl mb-2">👥</div>
                <div class="text-sm">No characters added yet</div>
                <div class="text-xs">Create your first character above</div>
            </div>
        `;
        return;
    }
    
    characterManager.getCharacters().forEach((character, index) => {
        const div = document.createElement('div');
        div.className = 'character-card';
        div.innerHTML = `
            <div class="space-y-2">
                <div class="flex justify-between items-start">
                    <div>
                        <div class="font-semibold text-gray-800 flex items-center gap-2">
                            <span class="w-3 h-3 rounded-full" style="background-color: ${character.color || '#4B5563'}"></span>
                            ${character.name}
                        </div>
                        <div class="text-xs text-gray-500">Voice: ${character.voice.name}</div>
                    </div>
                    <button onclick="removeCharacter(${index})" 
                            class="text-gray-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors duration-150">
                        <span>🗑️</span>
                    </button>
                </div>
                <div class="flex gap-2">
                    <button onclick="previewVoice(${index})" 
                            class="text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors duration-150 flex items-center gap-1">
                        <span>🔊</span> Preview Voice
                    </button>
                </div>
            </div>
        `;
        list.appendChild(div);
    });
    
    updateCounters();
    updateSpeakingCharacterSelect();
}

function updateSpeakingCharacterSelect() {
    const select = document.getElementById('speakingCharacter');
    select.innerHTML = '<option value="" class="text-gray-500">Choose a character...</option>';
    
    characterManager.getCharacters().forEach((character, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.innerHTML = `${character.name} (${character.voice.name})`;
        select.appendChild(option);
    });
}

function addCharacter() {
    const nameInput = document.getElementById('characterName');
    const voiceSelect = document.getElementById('characterVoice');
    const colorInput = document.getElementById('characterColor');

    const name = nameInput.value.trim();
    const voiceIndex = parseInt(voiceSelect.value);
    const color = colorInput.value;

    if (!name) {
        showToast('Please enter a character name', 'error');
        return;
    }

    try {
        characterManager.addCharacter(name, voiceIndex, color);
        
        // Reset form
        nameInput.value = '';
        colorInput.value = '#3B82F6';
        
        showToast('Character added successfully', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function addDialogueLine() {
    const characterSelect = document.getElementById('dialogueCharacter');
    const dialogueText = document.getElementById('dialogueText');
    
    const characterIndex = parseInt(characterSelect.value);
    const text = dialogueText.value.trim();
    
    if (!text) {
        showToast('Please enter dialogue text', 'error');
        return;
    }

    const character = characterManager.getCharacter(characterIndex);
    const line = {
        character: character,
        text: text
    };

    scriptManager.addScriptLine(line);
    updateScriptDisplay();
    
    // Reset form
    dialogueText.value = '';
    showToast('Dialogue line added', 'success');
}

function updateScriptDisplay() {
    const scriptDisplay = document.getElementById('scriptDisplay');
    scriptDisplay.innerHTML = '';
    
    scriptManager.getScriptLines().forEach((line, index) => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-2 bg-white rounded-lg shadow-sm';
        
        const textDiv = document.createElement('div');
        textDiv.className = 'flex-1';
        
        const characterName = document.createElement('span');
        characterName.className = 'font-medium mr-2';
        characterName.style.color = line.character.color;
        characterName.textContent = line.character.name + ':';
        
        const text = document.createElement('span');
        text.className = 'text-gray-700';
        text.textContent = line.text;
        
        const removeButton = document.createElement('button');
        removeButton.className = 'ml-2 text-red-500 hover:text-red-700';
        removeButton.innerHTML = '❌';
        removeButton.onclick = () => removeDialogueLine(index);
        
        textDiv.appendChild(characterName);
        textDiv.appendChild(text);
        div.appendChild(textDiv);
        div.appendChild(removeButton);
        scriptDisplay.appendChild(div);
    });
}

function removeDialogueLine(index) {
    scriptManager.removeScriptLine(index);
    updateScriptDisplay();
    showToast('Dialogue line removed', 'info');
}

function removeCharacter(index) {
    characterManager.removeCharacter(index);
    updateCharactersList();
    showToast(`Character removed`, 'info');
}

function previewVoice(index) {
    const character = characterManager.getCharacter(index);
    audioController.playLine('Hello, this is ' + character.name, character.voice);
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // Style the toast
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '10px 20px',
        borderRadius: '4px',
        backgroundColor: type === 'error' ? '#f44336' : '#4caf50',
        color: 'white',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        transition: 'all 0.3s ease',
        zIndex: '1000'
    });
    
    document.body.appendChild(toast);
    
    // Animate out
    setTimeout(() => {
        toast.style.transform = 'translateY(100%)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Initialize managers (moved to index.html)
