import { initializeApp } from './app';

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    const app = await initializeApp();
    
    app.listen(PORT, () => {
      console.log(`🚀 OID4VCI Issuer API running on http://localhost:${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
