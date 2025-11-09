import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { initializeApp } from './app';

const PORT = parseInt(process.env.PORT || '3002', 10);

async function start() {
  try {
    const app = await initializeApp();
    
    // Create HTTP server
    const httpServer = createServer(app);
    
    // Initialize Socket.IO
    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*', // Allow all origins for development
        methods: ['GET', 'POST']
      }
    });
    
    // Store io instance on app for use in routes
    (app as any).io = io;
    
    io.on('connection', (socket) => {
      console.log('🔌 Client connected:', socket.id);
      
      socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
      });
      
      // Allow clients to subscribe to specific presentation requests
      socket.on('subscribe', (state: string) => {
        console.log(`🔔 Client ${socket.id} subscribed to state: ${state}`);
        socket.join(`presentation:${state}`);
      });
    });
    
    // Start server on all interfaces for network access
    httpServer.listen(PORT, '0.0.0.0', () => {
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
