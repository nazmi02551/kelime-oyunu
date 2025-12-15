// Environment configuration for API
// Provide a sensible default (LAN IP) but also expose AppConfig so the app
// can probe multiple candidates (see src/config/app.js)
import AppConfig from './app';

// Default API host - Localtunnel for internet access
const DEFAULT_API_URL = 'https://cruel-meals-like.loca.lt';

const ENV = {
  apiUrl: DEFAULT_API_URL,
  appConfig: AppConfig
};

export default ENV;
