// Environment configuration for API
// Provide a sensible default (LAN IP) but also expose AppConfig so the app
// can probe multiple candidates (see src/config/app.js)
import AppConfig from './app';

// Default API host - Local network IP
const DEFAULT_API_URL = 'http://192.168.18.6:5000';

const ENV = {
  apiUrl: DEFAULT_API_URL,
  appConfig: AppConfig
};

export default ENV;
