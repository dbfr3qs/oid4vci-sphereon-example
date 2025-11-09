# OID4VCI + OID4VP Complete Implementation

A production-ready implementation of **OpenID for Verifiable Credential Issuance (OID4VCI)** and **OpenID for Verifiable Presentations (OID4VP)** with full cryptographic verification.

✅ **Successfully tested with Sphereon Wallet**  
✅ **Real-time WebSocket updates**  
✅ **Full cryptographic verification with audience validation**  
✅ **Complete issuer + verifier system**

## 🚀 Quick Start

### One Command to Start Everything

```bash
./start-all.sh
```

This starts all 4 services simultaneously:
- **Issuer Backend** (port 3001) - Issues credentials
- **Issuer Frontend** (port 5173) - UI for creating credential offers
- **Verifier Backend** (port 3002) - Verifies presentations
- **Verifier Frontend** (port 5174) - UI for requesting and verifying credentials

**Services will be accessible on:**
- 🖥️ **Localhost** - For browser testing
- 📱 **Network IP** - For wallet testing (auto-detected)

Press `Ctrl+C` to stop all services.

### 📱 Testing with Sphereon Wallet

See [WALLET_TESTING.md](./WALLET_TESTING.md) for complete instructions on testing with a real wallet app.

### First Time Setup

The `start.sh` script handles everything automatically, but you can also run manually:

```bash
# Install all dependencies for all packages
npm run install:all

# Build the VC agent
npm run build:agent

# Start everything
npm start
```

## 📋 Complete Workflow

### 1. Issue a Credential
1. Open **Issuer Frontend** (http://localhost:5173)
2. Fill in user details (name, email, date of birth)
3. Click "Create Credential Offer"
4. Scan QR code with Sphereon Wallet
5. Enter the 4-digit PIN shown on screen
6. Credential is added to your wallet! ✅

### 2. Verify a Credential
1. Open **Verifier Frontend** (http://localhost:5174)
2. Click "Request Login with Wallet"
3. Scan QR code with Sphereon Wallet
4. Select credential and approve presentation
5. **Instantly** see user data displayed (WebSocket magic!) ✅

## 📁 Project Structure

```
oid4vci-example/
├── packages/
│   ├── vc-agent/              # Core VC/VP library
│   │   ├── src/
│   │   │   ├── services/      # OID4VCI, OID4VP, Credential services
│   │   │   └── types/         # TypeScript definitions
│   │   └── __tests__/         # 46 passing tests
│   ├── issuer-backend/        # Credential Issuer API
│   │   ├── src/app.ts         # Express routes
│   │   └── __tests__/         # 9 passing tests
│   ├── issuer-frontend/       # Issuer UI (React + Vite)
│   ├── verifier-backend/      # Presentation Verifier API
│   │   ├── src/app.ts         # Express + Socket.IO
│   │   └── __tests__/         # 10 passing tests
│   └── verifier-frontend/     # Verifier UI (React + Vite + Socket.IO)
├── start-all.sh               # Start all services
└── README.md                  # This file
```

## ✨ Features

### 🔐 Security & Cryptography
- ✅ **Full JWT signature verification** - Verifies VP and VC signatures
- ✅ **Audience validation** - Ensures VP intended for correct verifier
- ✅ **Nonce validation** - Prevents replay attacks
- ✅ **Expiration checking** - Validates JWT exp and nbf claims
- ✅ **DID-based authentication** - Uses did:key with Secp256k1 (ES256K)
- ✅ **Proof binding** - Credentials bound to holder's DID

### 📡 Real-Time Communication
- ✅ **WebSocket support** - Instant verification updates (no polling!)
- ✅ **Room-based subscriptions** - Efficient event routing
- ✅ **Auto-reconnection** - Robust connection handling
- ✅ **CORS configured** - Works across different origins

### 🎯 OID4VCI Issuer
**Backend API:**
- ✅ POST `/api/offers` - Create credential offers
- ✅ POST `/api/token` - OAuth 2.0 token exchange
- ✅ POST `/api/credential` - Issue credentials with proof binding
- ✅ GET `/.well-known/openid-credential-issuer` - Issuer metadata
- ✅ GET `/health` - Health check
- ✅ 4-digit PIN support (wallet standard)
- ✅ Network-accessible for mobile wallets

**Frontend UI:**
- ✅ Beautiful gradient design
- ✅ Credential offer creation form
- ✅ QR code generation
- ✅ PIN display
- ✅ Responsive design

### 🔍 OID4VP Verifier
**Backend API:**
- ✅ POST `/api/presentation-requests` - Create presentation requests
- ✅ POST `/callback` - Receive presentations from wallet
- ✅ GET `/api/presentation-requests/:state` - Check status
- ✅ GET `/success` - Success page for wallet redirect
- ✅ GET `/health` - Health check
- ✅ WebSocket events for real-time updates
- ✅ Full cryptographic verification

**Frontend UI:**
- ✅ QR code display for wallet scanning
- ✅ Real-time verification status (WebSocket)
- ✅ Instant user data display
- ✅ "Logged in" state management
- ✅ Beautiful success animations

### 🧪 Testing
- ✅ **65+ passing tests** across all packages
- ✅ Unit tests for core services
- ✅ Integration tests for APIs
- ✅ Tested with real Sphereon Wallet

## 📜 Available Scripts

### Development

```bash
# Start both backend and frontend
npm start
# or
npm run dev

# Start backend only
npm run backend

# Start frontend only
npm run frontend
```

### Testing

```bash
# Test VC agent (46 tests)
npm run test:agent

# Test backend API (9 tests)
npm run test:backend
```

### Examples

```bash
# Run basic VC/VP example
npm run example:basic

# Run complete OID4VCI flow example
npm run example:oid4vci

# Run complete OID4VP flow example
npm run example:oid4vp
```

### Installation

```bash
# Install all dependencies
npm run install:all

# Build VC agent
npm run build:agent
```

## Manual Testing

### Via Web UI

1. Start the services: `npm start`
2. Open http://localhost:5173
3. Fill in the credential form
4. Click "Create Credential Offer"
5. View the QR code and PIN
6. Use with a wallet app or test via API

### Via API (curl)

**Create Offer:**
```bash
curl -X POST http://localhost:3001/api/offers \
  -H "Content-Type: application/json" \
  -d '{
    "credentialType": "IdentityCredential",
    "credentialSubject": {
      "name": "Alice",
      "email": "alice@example.com"
    },
    "userPinRequired": true
  }'
```

**Exchange Code for Token:**
```bash
curl -X POST http://localhost:3001/api/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "urn:ietf:params:oauth:grant-type:pre-authorized_code",
    "pre-authorized_code": "YOUR_CODE_HERE",
    "user_pin": "YOUR_PIN_HERE"
  }'
```

**Issue Credential:**
```bash
curl -X POST http://localhost:3001/api/credential \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "format": "jwt_vc_json",
    "types": ["VerifiableCredential", "IdentityCredential"]
  }'
```

## Architecture

### OID4VCI Flow

1. **Issuer** creates credential offer with pre-authorized code
2. **QR Code** is generated and displayed
3. **Holder** scans QR code with wallet app
4. **Wallet** exchanges code + PIN for access token
5. **Wallet** requests credential with access token
6. **Issuer** issues signed JWT credential

### OID4VP Flow

1. **Verifier** creates presentation request
2. **QR Code** is generated and displayed
3. **Holder** scans QR code with wallet app
4. **Wallet** creates presentation with requested credentials
5. **Wallet** submits presentation to verifier
6. **Verifier** validates signatures and claims

## Test Coverage

- **VC Agent**: 46/46 tests passing ✓
  - Veramo Agent: 5 tests
  - Credential Service: 8 tests
  - OID4VCI Issuer: 16 tests
  - OID4VP Verifier: 12 tests
  - Integration: 5 tests

- **Backend API**: 9/9 tests passing ✓
  - Offer creation: 3 tests
  - Token exchange: 2 tests
  - Credential issuance: 3 tests
  - Health check: 1 test

**Total: 55 passing tests**

## 🛠️ Technology Stack

**Core:**
- **TypeScript** - Type-safe development
- **Veramo** - DID and VC/VP operations
- **Sphereon SSI-SDK** - OID4VCI and OID4VP protocols
  - `@sphereon/ssi-sdk-ext.did-provider-key` - Secp256k1 DID provider
  - `@sphereon/ssi-sdk-ext.did-resolver-key` - DID resolver
  - `@sphereon/ssi-sdk.oid4vci-issuer` - OID4VCI implementation

**Backend:**
- **Express** - REST API server
- **Socket.IO** - WebSocket real-time communication
- **CORS** - Cross-origin resource sharing

**Frontend:**
- **React** - UI framework
- **Vite** - Fast build tool and dev server
- **Socket.IO Client** - WebSocket client
- **Axios** - HTTP client
- **QRCode.react** - QR code generation

**Testing:**
- **Jest** - Testing framework
- **Supertest** - HTTP assertions

## Documentation

- [VC Agent README](./packages/vc-agent/README.md) - Complete API documentation
- [Examples README](./packages/vc-agent/examples/README.md) - Usage examples
- [Backend Tests](./packages/issuer-backend/src/__tests__/api.test.ts) - API test examples

## Standards Compliance

- ✅ W3C Verifiable Credentials Data Model
- ✅ W3C Verifiable Presentations
- ✅ OpenID for Verifiable Credential Issuance (OID4VCI)
- ✅ OpenID for Verifiable Presentations (OID4VP)
- ✅ Presentation Exchange (PEX)
- ✅ DID Core Specification

## 🔐 Key Technical Details

### Cryptographic Verification
The verifier implements **full cryptographic verification** with the following checks:

1. **JWT Signature Verification**
   - Verifies VP JWT signature using holder's DID
   - Verifies each VC JWT signature using issuer's DID
   - Uses Veramo's `verifyPresentation` and `verifyCredential` methods

2. **Audience Validation**
   - Checks JWT `aud` claim matches verifier URL
   - Prevents presentations intended for other verifiers
   - Configurable per verification request

3. **Nonce Validation**
   - Verifies nonce in VP matches presentation request
   - Prevents replay attacks
   - Unique nonce per request

4. **Expiration Checking**
   - Validates JWT `exp` (expiration time)
   - Validates JWT `nbf` (not before time)
   - Ensures presentations are time-bound

5. **Structural Validation**
   - Checks VP contains required credentials
   - Validates credential types match request
   - Ensures proper JWT format

### Cryptography
- **Key Type**: Secp256k1 (ES256K signatures)
- **DID Method**: `did:key` with `zQ3` prefix (Secp256k1)
- **Signature Algorithm**: ES256K (ECDSA with secp256k1 curve)
- **Why Secp256k1?**: Required for compatibility with Sphereon Wallet and most mobile wallet apps

### OID4VCI Implementation
- **Grant Type**: Pre-authorized code flow
- **PIN Length**: 4 digits (wallet standard)
- **Credential Format**: `jwt_vc_json`
- **Proof Binding**: Credentials bound to wallet's DID from proof JWT
- **Network Mode**: Backend listens on `0.0.0.0` for mobile wallet access

### OID4VP Implementation
- **Response Mode**: Direct post (wallet POSTs to callback URL)
- **Presentation Format**: JWT VP with embedded JWT VCs
- **Real-time Updates**: WebSocket events for instant frontend notification
- **State Management**: In-memory store with expiration
- **Callback URL**: Wallet redirects to success page after verification

### Wallet Compatibility
- ✅ **Sphereon Wallet** - Fully tested and working
- ✅ Issuer metadata endpoint for wallet discovery
- ✅ Verifier presentation request endpoint
- ✅ Proper credential configuration metadata
- ✅ OAuth 2.0 token endpoint with form-urlencoded support
- ✅ Cross-device flow (QR code on laptop, wallet on phone)

## 🚦 Completed Features

- [x] Successfully issue credentials to Sphereon Wallet
- [x] Verify credentials with full cryptographic validation
- [x] Real-time WebSocket updates for verification
- [x] Audience and nonce validation
- [x] Complete issuer + verifier system
- [x] Unified start script for all services
- [x] 65+ passing tests

## 🎯 Future Enhancements

- [ ] Add persistent storage (Redis/Database)
- [ ] Implement credential revocation (Status List 2021)
- [ ] Add selective disclosure (SD-JWT)
- [ ] Support additional DID methods (did:jwk, did:web)
- [ ] Add batch credential issuance
- [ ] Implement DIF Presentation Exchange v2
- [ ] Add mDL (mobile driver's license) support
- [ ] Create Docker containers for deployment

## License

MIT

## Contributing

This is an example implementation for learning and development purposes.

---

**Built with ❤️ using Veramo and Sphereon SSI-SDK**
