import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import './App.css';

// Try to get the network IP from the backend, fallback to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface CredentialOffer {
  offer: any;
  qrCodeUrl: string;
  userPin?: string;
  preAuthCode: string;
}

function App() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [userPinRequired, setUserPinRequired] = useState(true);
  const [loading, setLoading] = useState(false);
  const [offer, setOffer] = useState<CredentialOffer | null>(null);
  const [error, setError] = useState('');

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setOffer(null);

    try {
      const response = await axios.post(`${API_URL}/api/offers`, {
        credentialType: 'IdentityCredential',
        credentialSubject: {
          name,
          email,
          dateOfBirth,
        },
        userPinRequired,
      });

      setOffer(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create credential offer');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setOffer(null);
    setName('');
    setEmail('');
    setDateOfBirth('');
    setError('');
  };

  return (
    <div className="app">
      <header>
        <h1>🎫 OID4VCI Credential Issuer</h1>
        <p>Issue verifiable credentials using OpenID for Verifiable Credential Issuance</p>
      </header>

      {!offer ? (
        <div className="form-container">
          <h2>Create Credential Offer</h2>
          <form onSubmit={handleCreateOffer}>
            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Alice Wonderland"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="alice@example.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="dob">Date of Birth</label>
              <input
                id="dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>

            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={userPinRequired}
                  onChange={(e) => setUserPinRequired(e.target.checked)}
                />
                Require User PIN
              </label>
            </div>

            {error && <div className="error">{error}</div>}

            <button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Credential Offer'}
            </button>
          </form>
        </div>
      ) : (
        <div className="offer-container">
          <h2>✅ Credential Offer Created!</h2>
          
          <div className="qr-section">
            <h3>Scan QR Code with Wallet</h3>
            <div className="qr-code">
              <QRCodeSVG value={offer.qrCodeUrl} size={256} level="H" />
            </div>
            <p className="qr-hint">Scan this QR code with a compatible wallet app</p>
          </div>

          {offer.userPin && (
            <div className="pin-section">
              <h3>User PIN (4 digits)</h3>
              <div className="pin-display">{offer.userPin}</div>
              <p className="pin-hint">Share this 4-digit PIN with the user to complete the credential issuance</p>
            </div>
          )}

          <div className="details-section">
            <h3>Offer Details</h3>
            <div className="detail-item">
              <strong>Pre-Authorized Code:</strong>
              <code>{offer.preAuthCode}</code>
            </div>
            <div className="detail-item">
              <strong>Credential Type:</strong>
              <span>Identity Credential</span>
            </div>
            <div className="detail-item">
              <strong>Subject:</strong>
              <span>{name}</span>
            </div>
          </div>

          <div className="url-section">
            <h3>Offer URL</h3>
            <textarea
              readOnly
              value={offer.qrCodeUrl}
              rows={4}
              onClick={(e) => e.currentTarget.select()}
            />
            <p className="url-hint">Click to select and copy</p>
          </div>

          <button onClick={handleReset} className="secondary">
            Create Another Offer
          </button>
        </div>
      )}

      <footer>
        <p>Backend API: {API_URL}</p>
      </footer>
    </div>
  );
}

export default App;
