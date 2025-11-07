import { initializeApp } from './app';
import { networkInterfaces } from 'os';

const PORT = Number(process.env.PORT) || 3001;

function getLocalIpAddress(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      // Skip internal and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

async function start() {
  try {
    const app = await initializeApp();
    const localIp = getLocalIpAddress();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 OID4VCI Issuer API running`);
      console.log(`   Local:   http://localhost:${PORT}`);
      console.log(`   Network: http://${localIp}:${PORT}`);
      console.log(`📋 Health check: http://${localIp}:${PORT}/health`);
      console.log(`📱 Use the Network URL for wallet testing`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
