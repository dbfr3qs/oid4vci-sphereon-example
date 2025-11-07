# OID4VCI Example - Complete Verifiable Credentials Implementation

A complete, production-ready implementation of OpenID for Verifiable Credential Issuance (OID4VCI) and OpenID for Verifiable Presentations (OID4VP) with a beautiful web UI.

## 🚀 Quick Start

### One Command to Run Everything

**Option 1: For Wallet Testing (Network Mode) - Recommended**
```bash
./start-network.sh
```
This makes the backend accessible from your phone on the same WiFi network.

**Option 2: For Local Development**
```bash
./start.sh
# or
npm start
```

This will start both the backend API and frontend UI simultaneously!

- **Backend API**: http://localhost:3001 (or your network IP in network mode)
- **Frontend UI**: http://localhost:5173 (or your network IP in network mode)

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

## 📦 Project Structure

```
oid4vci-example/
├── packages/
│   ├── vc-agent/              # Core VC/VP library with OID4VCI & OID4VP
│   │   ├── src/               # Source code
│   │   ├── __tests__/         # 46 passing tests
│   │   └── examples/          # Manual test examples
│   ├── issuer-backend/        # Express API server
│   │   ├── src/               # API endpoints
│   │   └── __tests__/         # 9 passing tests
│   └── issuer-frontend/       # React UI
│       └── src/               # React components
├── package.json               # Root package with scripts
└── README.md                  # This file
```

## 🎯 Features

### VC Agent Library
- ✅ DID management (did:key)
- ✅ JWT-based Verifiable Credentials
- ✅ JWT-based Verifiable Presentations
- ✅ OID4VCI protocol (complete)
- ✅ OID4VP protocol (complete)
- ✅ 46 passing tests (unit + integration)
- ✅ Full TypeScript support

### Backend API
- ✅ POST /api/offers - Create credential offers
- ✅ POST /api/token - Exchange codes for tokens
- ✅ POST /api/credential - Issue credentials
- ✅ GET /health - Health check
- ✅ 9 passing tests
- ✅ Full OID4VCI protocol support

### Frontend UI
- ✅ Beautiful gradient design
- ✅ Credential offer creation form
- ✅ QR code generation
- ✅ User PIN display
- ✅ Offer details and management
- ✅ Error handling
- ✅ Responsive design

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

## 🧪 Manual Testing

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

## 🏗️ Architecture

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

## 📊 Test Coverage

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

- **TypeScript** - Type-safe development
- **Veramo** - DID and VC/VP operations
- **Sphereon SSI-SDK** - OID4VCI and OID4VP protocols
- **Express** - Backend API server
- **React** - Frontend UI
- **Vite** - Fast build tool
- **Jest** - Testing framework
- **QRCode.react** - QR code generation

## 📚 Documentation

- [VC Agent README](./packages/vc-agent/README.md) - Complete API documentation
- [Examples README](./packages/vc-agent/examples/README.md) - Usage examples
- [Backend Tests](./packages/issuer-backend/src/__tests__/api.test.ts) - API test examples

## 🔐 Standards Compliance

- ✅ W3C Verifiable Credentials Data Model
- ✅ W3C Verifiable Presentations
- ✅ OpenID for Verifiable Credential Issuance (OID4VCI)
- ✅ OpenID for Verifiable Presentations (OID4VP)
- ✅ Presentation Exchange (PEX)
- ✅ DID Core Specification

## 🚦 Next Steps

- [ ] Deploy to production
- [ ] Add persistent storage (database)
- [ ] Implement credential revocation
- [ ] Add more credential types
- [ ] Support additional DID methods
- [ ] Build verifier UI
- [ ] Add wallet app integration tests

## 📝 License

MIT

## 🤝 Contributing

This is an example implementation for learning and development purposes.

---

**Built with ❤️ using Veramo and Sphereon SSI-SDK**
