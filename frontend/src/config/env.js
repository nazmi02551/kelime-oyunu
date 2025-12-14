// Environment configuration for API
// Provide a sensible default (LAN IP) but also expose AppConfig so the app
// can probe multiple candidates (see src/config/app.js)
import AppConfig from './app';

// Default API host (used immediately by services).
// Reverted to dev-tunnel so remote devices can connect over the internet.
// If you want to use LAN-ip instead, replace this with your machine IP.
const DEFAULT_API_URL = 'https://c0b7xhsw-8081.euw.devtunnels.ms';

const ENV = {
  apiUrl: DEFAULT_API_URL,
  appConfig: AppConfig
};

export default ENV;
