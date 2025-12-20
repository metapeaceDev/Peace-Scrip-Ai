
import { ScriptData, ProjectMetadata, ProjectType } from '../../types';

// No backend needed - Pure offline/cloud hybrid app
const API_URL = import.meta.env.VITE_API_URL || 'https://api.peacescript.app'; // Cloud API (optional)
const DB_NAME = 'PeaceScriptDB';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

let isOfflineMode = false; // Start in ONLINE mode by default (use Firebase Auth + Firestore)

// --- INDEXED DB ADAPTER ---

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error("IndexedDB not supported"));
            return;
        }
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const localApi = {
    login: async (email?: string) => {
        const username = email ? email.split('@')[0] : 'Guest (Offline)';
        return { token: 'offline-token', username: username };
    },
    
    register: async (username: string) => {
        return { message: `Local user ${username} created` };
    },
    
    getProjects: async (): Promise<ProjectMetadata[]> => {
        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.openCursor();
                const projects: ProjectMetadata[] = [];
                
                request.onsuccess = (event) => {
                    const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
                    if (cursor) {
                        const p = cursor.value;
                        projects.push({
                            id: p.id,
                            title: p.title,
                            type: p.type,
                            lastModified: p.lastModified,
                            posterImage: p.posterImage
                        });
                        cursor.continue();
                    } else {
                        resolve(projects);
                    }
                };
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            console.error("IndexedDB Error:", e);
            return [];
        }
    },

    getProjectById: async (id: string): Promise<ScriptData> => {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);
            request.onsuccess = () => {
                if (request.result) resolve(request.result);
                else reject(new Error('Project not found locally'));
            };
            request.onerror = () => reject(request.error);
        });
    },

    createProject: async (_title: string, _type: ProjectType, data: ScriptData): Promise<string> => {
        const newId = Date.now().toString();
        const newData = { ...data, id: newId, lastModified: Date.now() };
        
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(newData);
            request.onsuccess = () => resolve(newId);
            request.onerror = () => reject(request.error);
        });
    },

    updateProject: async (id: string, data: ScriptData): Promise<void> => {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const updateData = { ...data, id, lastModified: Date.now() };
            const request = store.put(updateData);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    deleteProject: async (id: string): Promise<void> => {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};

// --- MAIN API INTERFACE ---

const getHeaders = () => {
    const token = localStorage.getItem('peace_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export const api = {
    setOfflineMode: (enabled: boolean) => {
        isOfflineMode = enabled;
        if (enabled) {
            localStorage.setItem('peace_offline_mode', 'true');
        } else {
            localStorage.removeItem('peace_offline_mode');
        }
    },

    isOffline: () => isOfflineMode || localStorage.getItem('peace_offline_mode') === 'true',

    // Auth
    login: async (email: string, password: string) => {
        // Force offline check first
        if (api.isOffline()) return localApi.login(email);

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            if (!res.ok) throw new Error('Login failed');
            return res.json();
        } catch (e) {
            console.warn("Backend unreachable. Falling back to Offline Mode automatically.");
            // AUTO-FALLBACK: If server is down, switch to offline mode immediately
            api.setOfflineMode(true);
            return localApi.login(email);
        }
    },

    register: async (username: string, email: string, password: string) => {
        if (api.isOffline()) {
             // Allow "Mock Registration" in offline mode
             return localApi.register(username);
        }
        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            if (!res.ok) throw new Error('Registration failed');
            return res.json();
        } catch (e) {
             console.warn("Backend unreachable during register. Switching to offline.");
             // AUTO-FALLBACK for Registration
             api.setOfflineMode(true);
             return localApi.register(username);
        }
    },

    // Projects
    getProjects: async (): Promise<ProjectMetadata[]> => {
        if (api.isOffline()) return localApi.getProjects();
        try {
            const res = await fetch(`${API_URL}/projects`, { headers: getHeaders() });
            if (!res.ok) throw new Error('Failed to fetch projects');
            return res.json();
        } catch (e) {
            console.warn("Fetch failed, reverting to offline read.");
            // Fallback to local if cloud fetch fails
            return localApi.getProjects();
        }
    },

    getProjectById: async (id: string): Promise<ScriptData> => {
        if (api.isOffline()) return localApi.getProjectById(id);
        try {
            const res = await fetch(`${API_URL}/projects/${id}`, { headers: getHeaders() });
            if (!res.ok) throw new Error('Failed to load project');
            return res.json();
        } catch (e) {
             // Fallback to local if cloud fetch fails
             return localApi.getProjectById(id);
        }
    },

    createProject: async (title: string, type: ProjectType, data: ScriptData): Promise<string> => {
        if (api.isOffline()) return localApi.createProject(title, type, data);
        try {
            const res = await fetch(`${API_URL}/projects`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ title, type, data })
            });
            if (!res.ok) throw new Error('Failed to create project');
            const json = await res.json();
            return json.id;
        } catch (e) {
            console.warn("Cloud create failed. Switching to Offline Mode (IndexedDB).");
            api.setOfflineMode(true);
            return localApi.createProject(title, type, data);
        }
    },

    updateProject: async (id: string, data: ScriptData): Promise<void> => {
        if (api.isOffline()) return localApi.updateProject(id, data);
        try {
            const res = await fetch(`${API_URL}/projects/${id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ title: data.title, data })
            });
            if (!res.ok) throw new Error('Failed to save project');
        } catch (e) {
            console.warn("Cloud update failed, trying local.");
            return localApi.updateProject(id, data);
        }
    },

    deleteProject: async (id: string): Promise<void> => {
        if (api.isOffline()) return localApi.deleteProject(id);
        try {
            const res = await fetch(`${API_URL}/projects/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to delete project');
        } catch (e) {
            return localApi.deleteProject(id);
        }
    }
};
