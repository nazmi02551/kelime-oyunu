// Environment configuration for API
// 
// ⚙️ VS CODE DEV TUNNELS İÇİN:
// 1. Backend'i başlatın (python app.py) - Port 5000
// 2. VS Code PORTS sekmesinde port 5000'i forward edin
// 3. Forwarded Address'i kopyalayıp aşağıya yazın
// 4. Örnek: 'https://abc123-5000.euw.devtunnels.ms'
//
// NOT: /api eklemeyin, sadece base URL yazın!
//
import AppConfig from './app';

// 🔧 Backend Dev Tunnel URL'nizi buraya yazın (port dahil)
// VS Code PORTS sekmesinden kopyalayın ⬇️
const DEFAULT_API_URL = 'https://40l601gl-5000.euw.devtunnels.ms';

const ENV = {
  apiUrl: DEFAULT_API_URL,
  appConfig: AppConfig
};

export default ENV;
