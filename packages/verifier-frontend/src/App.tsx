import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { io, Socket } from 'socket.io-client';
import './App.css';

// Get API URL from environment or use network IP
const API_URL = import.meta.env.VITE_VERIFIER_API_URL || 'http://localhost:3002';

interface UserData {
  did: string;
  name?: string;
  email?: string;
  dateOfBirth?: string;
}

interface PresentationRequest {
  requestUrl: string;
  state: string;
}

function App() {
  const [presentationRequest, setPresentationRequest] = useState<PresentationRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    console.log('🔌 Connecting to WebSocket server...');
    const socket = io(API_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
    });

    socket.on('verification-complete', (data: { state: string; verified: boolean; userData: UserData }) => {
      console.log('🎉 Verification complete event received:', data);
      if (data.verified && data.userData) {
        setVerifying(false);
        setUserData(data.userData);
        setLoggedIn(true);
      }
    });

    socketRef.current = socket;

    return () => {
      console.log('🔌 Disconnecting WebSocket...');
      socket.disconnect();
    };
  }, []);

  // Subscribe to presentation request updates
  useEffect(() => {
    if (!presentationRequest || !socketRef.current) return;

    console.log(`🔔 Subscribing to state: ${presentationRequest.state}`);
    socketRef.current.emit('subscribe', presentationRequest.state);
  }, [presentationRequest]);

  const createPresentationRequest = async () => {
    setLoading(true);
    setError(null);
    setUserData(null);
    setLoggedIn(false);

    try {
      const response = await axios.post(`${API_URL}/api/presentation-requests`, {
        credentialTypes: ['VerifiableCredential'], // Request any VerifiableCredential
        purpose: 'Login to application',
        requiredFields: [] // Don't require specific fields
      });

      setPresentationRequest({
        requestUrl: response.data.requestUrl,
        state: response.data.state
      });
      setVerifying(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create presentation request');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setLoggedIn(false);
    setUserData(null);
    setPresentationRequest(null);
    setVerifying(false);
  };

  // Simulate receiving verification result (in real app, this would come from the backend via WebSocket or polling)
  const simulateVerification = async () => {
    // This is just for demo - in production, the wallet would POST to /api/presentations/verify
    // and the frontend would be notified via WebSocket or polling
    setUserData({
      did: 'did:key:z2dmzD81cgPx8Vki7JbuuMmFYrWPgYoytykUZ3eyqht1j9Kb...',
      name: 'Alice',
      email: 'alice@fubar.com',
      dateOfBirth: '1111-11-11'
    });
    setLoggedIn(true);
    setVerifying(false);
  };

  return (
    <div className="App">
      <div className="container">
        <h1>🔐 Credential Verifier</h1>
        <p className="subtitle">Verify credentials and log in with your wallet</p>

        {!loggedIn && !presentationRequest && (
          <div className="action-section">
            <button
              onClick={createPresentationRequest}
              disabled={loading}
              className="primary-button"
            >
              {loading ? 'Creating Request...' : 'Request Login with Wallet'}
            </button>
          </div>
        )}

        {error && (
          <div className="error-box">
            <strong>Error:</strong> {error}
          </div>
        )}

        {presentationRequest && !loggedIn && (
          <div className="qr-section">
            <h2>Scan with Sphereon Wallet</h2>
            <div className="qr-container">
              <QRCodeSVG
                value={presentationRequest.requestUrl}
                size={300}
                level="M"
                includeMargin={true}
              />
            </div>
            
            {verifying && (
              <div className="status-box verifying">
                <div className="spinner"></div>
                <p>Waiting for wallet to present credential...</p>
                <p className="hint">Open Sphereon Wallet and scan the QR code</p>
              </div>
            )}

            <div className="info-box">
              <p><strong>What happens next:</strong></p>
              <ol>
                <li>Open your Sphereon Wallet app</li>
                <li>Scan this QR code</li>
                <li>Select the credential to present</li>
                <li>Approve the presentation</li>
                <li>You'll be logged in automatically!</li>
              </ol>
            </div>

            {/* Demo button - remove in production */}
            <button
              onClick={simulateVerification}
              className="secondary-button"
              style={{ marginTop: '20px' }}
            >
              Simulate Successful Verification (Demo)
            </button>

            <button
              onClick={handleLogout}
              className="secondary-button"
              style={{ marginTop: '10px' }}
            >
              Cancel
            </button>
          </div>
        )}

        {loggedIn && userData && (
          <div className="success-section">
            <div className="success-box">
              <h2>✅ Login Successful!</h2>
              <div className="user-info">
                <h3>Welcome, {userData.name}!</h3>
                <div className="user-details">
                  <div className="detail-row">
                    <span className="label">Name:</span>
                    <span className="value">{userData.name}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Email:</span>
                    <span className="value">{userData.email}</span>
                  </div>
                  {userData.dateOfBirth && (
                    <div className="detail-row">
                      <span className="label">Date of Birth:</span>
                      <span className="value">{userData.dateOfBirth}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="label">DID:</span>
                    <span className="value did">{userData.did}</span>
                  </div>
                </div>
              </div>
              <button onClick={handleLogout} className="primary-button">
                Logout
              </button>
            </div>
          </div>
        )}

        <div className="footer">
          <p>Verifier API: {API_URL}</p>
          <p className="hint">Make sure your wallet and this app are on the same network</p>
        </div>
      </div>
    </div>
  );
}

export default App;
