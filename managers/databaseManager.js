const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

class DatabaseManager {
    constructor() {
        // Get user data path for database storage
        const userDataPath = app.getPath('userData');
        const dbPath = path.join(userDataPath, 'narrator.db');
        
        console.log('DatabaseManager: Initializing database at', dbPath);
        
        this.db = new Database(dbPath);
        
        // Create tables if they don't exist
        this.initializeTables();
    }

    initializeTables() {
        // Create scripts table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS scripts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create lines table with minimal voice info
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS lines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                script_id INTEGER,
                text TEXT NOT NULL,
                voice_name TEXT NOT NULL,
                voice_lang TEXT NOT NULL,
                sequence INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(script_id) REFERENCES scripts(id)
            )
        `);

        console.log('DatabaseManager: Tables initialized');
    }

    createScript(name) {
        const stmt = this.db.prepare('INSERT INTO scripts (name) VALUES (?)');
        const result = stmt.run(name);
        return result.lastInsertRowid;
    }

    getScript(scriptId) {
        const stmt = this.db.prepare('SELECT * FROM scripts WHERE id = ?');
        return stmt.get(scriptId);
    }

    getAllScripts() {
        const stmt = this.db.prepare('SELECT * FROM scripts ORDER BY created_at DESC');
        return stmt.all();
    }

    addLine(scriptId, text, voice, audioBuffer, sequence) {
        const stmt = this.db.prepare(`
            INSERT INTO lines (
                script_id, text, voice_name, voice_lang, sequence
            )
            VALUES (?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(
            scriptId, 
            text, 
            voice.name, 
            voice.lang,
            sequence
        );
        return result.lastInsertRowid;
    }

    getLine(lineId) {
        const stmt = this.db.prepare('SELECT * FROM lines WHERE id = ?');
        const line = stmt.get(lineId);
        if (line) {
            // Convert stored voice data back to a voice-like object
            line.voice = {
                name: line.voice_name,
                lang: line.voice_lang
            };
            
            // Clean up redundant fields
            delete line.voice_name;
            delete line.voice_lang;
        }
        return line;
    }

    getScriptLines(scriptId) {
        const stmt = this.db.prepare('SELECT * FROM lines WHERE script_id = ? ORDER BY sequence ASC');
        const lines = stmt.all(scriptId);
        return lines.map(line => {
            // Convert stored voice data back to a voice-like object
            line.voice = {
                name: line.voice_name,
                lang: line.voice_lang
            };
            
            // Clean up redundant fields
            delete line.voice_name;
            delete line.voice_lang;
            
            return line;
        });
    }

    updateLineSequence(lineId, newSequence) {
        const stmt = this.db.prepare('UPDATE lines SET sequence = ? WHERE id = ?');
        return stmt.run(newSequence, lineId);
    }

    deleteLine(lineId) {
        const stmt = this.db.prepare('DELETE FROM lines WHERE id = ?');
        return stmt.run(lineId);
    }

    deleteScript(scriptId) {
        const db = this.db;
        
        // Use a transaction to ensure both operations complete
        const transaction = db.transaction(() => {
            // Delete all lines in the script
            db.prepare('DELETE FROM lines WHERE script_id = ?').run(scriptId);
            // Delete the script
            db.prepare('DELETE FROM scripts WHERE id = ?').run(scriptId);
        });
        
        return transaction();
    }

    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = DatabaseManager;
