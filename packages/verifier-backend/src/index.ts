import { initializeApp } from './app';

const PORT = process.env.PORT || 3002;

async function start() {
  try {
    const app = await initializeApp();
    
    // Start server on all interfaces for network access
    app.listen(PORT, '0.0.0.0', () => {
      const { networkInterfaces } = require('os');
      const nets = networkInterfaces();
      
      let localIp = 'localhost';
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4;
          if (net.family === familyV4Value && !net.internal) {
            localIp = net.address;
            break;
          }
        }
      }
      
      console.log('🚀 OID4VP Verifier API running');
      console.log(`   Local:   http://localhost:${PORT}`);
      console.log(`   Network: http://${localIp}:${PORT}`);
      console.log(`📋 Health check: http://${localIp}:${PORT}/health`);
      console.log('📱 Use the Network URL for wallet testing');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
