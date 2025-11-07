# Getting Started with OID4VCI Example

## 🎯 What You'll Get

A complete, working implementation of:
- ✅ Verifiable Credentials issuance (OID4VCI)
- ✅ Verifiable Presentations verification (OID4VP)
- ✅ Beautiful web UI for issuing credentials
- ✅ REST API backend
- ✅ 55 passing tests

## 🚀 Quick Start (3 Steps)

### Step 1: Start Everything

```bash
./start.sh
```

That's it! The script will:
- ✅ Check and install all dependencies
- ✅ Build the VC agent library
- ✅ Kill any processes using ports 3001 or 5173
- ✅ Start both backend and frontend

### Step 2: Open the UI

Open your browser to: **http://localhost:5173**

### Step 3: Create Your First Credential

1. Fill in the form:
   - Name: `Alice Wonderland`
   - Email: `alice@example.com`
   - Date of Birth: `1990-01-01`
   - Keep "Require User PIN" checked

2. Click **"Create Credential Offer"**

3. You'll see:
   - 📱 A QR code (scannable by wallet apps)
   - 🔑 A 6-digit PIN
   - 📋 Offer details
   - 🔗 The full offer URL

## 📚 What's Running

### Backend API (Port 3001)

**Endpoints:**
- `POST /api/offers` - Create credential offers
- `POST /api/token` - Exchange codes for tokens
- `POST /api/credential` - Issue credentials
- `GET /health` - Health check

**Test it:**
```bash
curl http://localhost:3001/health
```

### Frontend UI (Port 5173)

**Features:**
- Credential offer creation form
- QR code generation
- PIN display
- Offer management
- Error handling

## 🧪 Testing

### Run All Tests

```bash
# VC Agent tests (46 tests)
cd packages/vc-agent && npm test

# Backend API tests (9 tests)
cd packages/issuer-backend && npm test
```

### Run Examples

```bash
# Basic VC/VP operations
npm run example:basic

# Complete OID4VCI flow
npm run example:oid4vci

# Complete OID4VP flow
npm run example:oid4vp
```

## 🔄 Complete Flow Example

### Via Web UI

1. **Create Offer** (in browser)
   - Fill form → Click "Create Credential Offer"
   - Copy the pre-authorized code and PIN

2. **Exchange for Token** (via curl)
   ```bash
   curl -X POST http://localhost:3001/api/token \
     -H "Content-Type: application/json" \
     -d '{
       "grant_type": "urn:ietf:params:oauth:grant-type:pre-authorized_code",
       "pre-authorized_code": "YOUR_CODE_HERE",
       "user_pin": "YOUR_PIN_HERE"
     }'
   ```

3. **Get Credential** (via curl)
   ```bash
   curl -X POST http://localhost:3001/api/credential \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     -d '{
       "format": "jwt_vc_json",
       "types": ["VerifiableCredential", "IdentityCredential"]
     }'
   ```

### Via API Only

```bash
# 1. Create offer
curl -X POST http://localhost:3001/api/offers \
  -H "Content-Type: application/json" \
  -d '{
    "credentialType": "IdentityCredential",
    "credentialSubject": {
      "name": "Bob",
      "email": "bob@example.com"
    },
    "userPinRequired": true
  }'

# 2. Copy preAuthCode and userPin from response

# 3. Exchange for token
curl -X POST http://localhost:3001/api/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "urn:ietf:params:oauth:grant-type:pre-authorized_code",
    "pre-authorized_code": "PASTE_CODE_HERE",
    "user_pin": "PASTE_PIN_HERE"
  }'

# 4. Copy access_token from response

# 5. Get credential
curl -X POST http://localhost:3001/api/credential \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer PASTE_TOKEN_HERE" \
  -d '{
    "format": "jwt_vc_json",
    "types": ["VerifiableCredential", "IdentityCredential"]
  }'
```

## 🛑 Stopping Services

Press `Ctrl+C` in the terminal where services are running.

Or kill manually:
```bash
# Kill backend
kill $(lsof -t -i:3001)

# Kill frontend
kill $(lsof -t -i:5173)
```

## 📁 Project Structure

```
oid4vci-example/
├── start.sh                   # One-command startup script
├── package.json               # Root scripts
├── README.md                  # Full documentation
├── GETTING_STARTED.md         # This file
└── packages/
    ├── vc-agent/              # Core library (46 tests)
    │   ├── src/               # Services and types
    │   ├── __tests__/         # Unit & integration tests
    │   └── examples/          # Manual examples
    ├── issuer-backend/        # API server (9 tests)
    │   ├── src/               # Express endpoints
    │   └── __tests__/         # API tests
    └── issuer-frontend/       # React UI
        └── src/               # Components and styles
```

## 🎓 Learn More

- [Full README](./README.md) - Complete documentation
- [VC Agent Docs](./packages/vc-agent/README.md) - API reference
- [Examples](./packages/vc-agent/examples/README.md) - Usage examples

## ❓ Troubleshooting

### Port Already in Use

The `start.sh` script automatically kills processes on ports 3001 and 5173.

If you still have issues:
```bash
# Check what's using the ports
lsof -i :3001
lsof -i :5173

# Kill manually
kill -9 $(lsof -t -i:3001)
kill -9 $(lsof -t -i:5173)
```

### Dependencies Not Installed

```bash
npm run install:all
```

### VC Agent Not Built

```bash
npm run build:agent
```

### Tests Failing

Make sure you've built the VC agent:
```bash
cd packages/vc-agent
npm run build
npm test
```

## 🎉 You're Ready!

You now have a complete, working OID4VCI implementation. Start issuing verifiable credentials!

```bash
./start.sh
```

Then open http://localhost:5173 and create your first credential offer! 🚀
