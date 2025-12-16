import axios from 'axios';
import ENV from '../config/env';
import eventBus from './EventBus';

// Web-compatible storage wrapper
const storage = {
  getItem: async (key) => localStorage.getItem(key),
  setItem: async (key, value) => localStorage.setItem(key, value),
  removeItem: async (key) => localStorage.removeItem(key)
};

const baseURL = ENV.apiUrl || 'http://localhost:5000';
console.log('🚀 Initial API Base URL (from ENV):', baseURL);

const api = axios.create({
    baseURL: baseURL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Request interceptor - attach token
api.interceptors.request.use(
    async (config) => {
        try {
            const token = await storage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (e) {
            console.warn('localStorage error', e);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// In background: probe AppConfig (if available) for a working API URL
// and switch axios baseURL when found. This keeps startup fast while
// allowing automatic discovery of the best endpoint.
if (ENV.appConfig && typeof ENV.appConfig.findWorkingApiUrl === 'function') {
    (async () => {
        // Quick probe helper using fetch with timeout
        const probe = async (probeUrl, timeout = 4000) => {
            try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), timeout);
                const res = await fetch(probeUrl, { method: 'GET', signal: controller.signal });
                clearTimeout(timer);
                const ct = (res.headers.get && res.headers.get('content-type')) || '';
                return res.ok && ct.includes('application/json');
            } catch (err) {
                return false;
            }
        };

        const normalize = (u) => u.replace(/\/api\/?$/i, '').replace(/\/$/, '');

        try {
            const initial = normalize(ENV.apiUrl || api.defaults.baseURL || '');
            const candidates = new Set();
            if (initial) candidates.add(initial);

            // If dev-tunnel host uses -8081 pattern, try -5000 alternative which some tunnels map to backend
            if (initial.includes('-8081')) {
                candidates.add(initial.replace('-8081', '-5000'));
            }

            // Try http variants too
            if (initial.startsWith('https://')) {
                candidates.add(initial.replace('https://', 'http://'));
                if (initial.includes('-8081')) {
                    candidates.add(initial.replace('https://', 'http://').replace('-8081', '-5000'));
                }
            }

            // Also include any AppConfig entries (fall back)
            try {
                const cfg = ENV.appConfig && ENV.appConfig.getConfig && ENV.appConfig.getConfig();
                if (cfg && cfg.apiUrls && Array.isArray(cfg.apiUrls)) {
                    cfg.apiUrls.forEach((u) => candidates.add(normalize(u)));
                }
            } catch (e) {
                // ignore
            }

            let selected = null;
            for (const c of candidates) {
                if (!c) continue;
                const probeUrl = c.endsWith('/api') ? `${c}/health` : `${c}/api/health`;
                console.log('🔎 Probing API health at', probeUrl);
                const ok = await probe(probeUrl, 4000);
                if (ok) {
                    selected = normalize(c);
                    console.log('✅ Probe succeeded for', c);
                    break;
                }
            }

            if (!selected) {
                // If quick probes failed, fall back to the existing AppConfig finder which is more thorough
                try {
                    const found = await ENV.appConfig.findWorkingApiUrl();
                    selected = normalize(found);
                } catch (e) {
                    console.log('ℹ️ AppConfig did not find a working API URL:', e.message || e);
                }
            }

            if (selected && selected !== api.defaults.baseURL) {
                console.log('🔧 Updating axios baseURL to discovered API host:', selected);
                api.defaults.baseURL = selected;
            } else if (!selected) {
                console.warn('⚠️ No working API URL discovered by probe; leaving baseURL as', api.defaults.baseURL);
            }
        } catch (e) {
            console.log('⚠️ Error while probing API hosts:', e?.message || e);
        }
    })();
}

// Response interceptor - handle 401 with safe refresh attempt
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error?.config || {};
        console.error('❌ API Error:', error.response?.status, originalRequest.url);

        // Handle 401: attempt refresh once
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                // Try refresh token endpoint (if backend supports it)
                const refreshRes = await axios.post(`${api.defaults.baseURL}/api/auth/refresh`, {}, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 8000
                });

                if (refreshRes?.data?.token) {
                    await storage.setItem('token', refreshRes.data.token);
                    api.defaults.headers.common['Authorization'] = `Bearer ${refreshRes.data.token}`;
                    originalRequest.headers['Authorization'] = `Bearer ${refreshRes.data.token}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                console.warn('Token refresh failed or not available:', refreshError?.message || refreshError);
            }

            // If refresh failed, clear auth and emit logout so UI can react
            try {
                await storage.removeItem('token');
                await storage.removeItem('user');
                // Clear old keys too
                await storage.removeItem('auth_token');
                await storage.removeItem('auth_user');
            } catch (e) {
                console.warn('Error clearing auth on 401', e);
            }
            eventBus.emit('logout');
        }

        return Promise.reject(error);
    }
);

export default api;