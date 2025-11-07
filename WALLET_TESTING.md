# 📱 Testing with Sphereon Wallet

## Quick Start

### Step 1: Start in Network Mode

```bash
./start-network.sh
```

This script will:
- ✅ Detect your local network IP address
- ✅ Start backend on `0.0.0.0:3001` (accessible from network)
- ✅ Start frontend with the correct API URL
- ✅ Show you the network URLs to use

### Step 2: Note Your Network URLs

The script will display something like:

```
Backend API:
• Network: http://192.168.1.100:3001  ← Use this for wallet

Frontend UI:
• Network: http://192.168.1.100:5173
```

**Important:** Your IP address will be different. Use the one shown in your terminal.

### Step 3: Open Frontend on Your Computer

Open the **Network URL** in your browser:
```
http://YOUR_IP:5173
```

Example: `http://192.168.1.100:5173`

### Step 4: Create a Credential Offer

1. Fill in the form with test data
2. Check "Require User PIN"
3. Click "Create Credential Offer"
4. You'll see a QR code and PIN

### Step 5: Scan with Sphereon Wallet

1. Open Sphereon Wallet on your phone
2. Scan the QR code
3. Enter the PIN when prompted
4. The wallet will connect to your backend and receive the credential!

## Troubleshooting

### "Network Error" in Wallet

**Cause:** The wallet can't reach your backend.

**Solutions:**

1. **Check you're on the same WiFi network**
   - Phone and computer must be on the same network
   - Not on guest network or VPN

2. **Check firewall settings**
   ```bash
   # macOS: Allow incoming connections on port 3001
   # System Preferences → Security & Privacy → Firewall → Firewall Options
   ```

3. **Verify backend is accessible**
   ```bash
   # From your phone's browser, visit:
   http://YOUR_IP:3001/health
   
   # Should return: {"status":"ok",...}
   ```

4. **Check the QR code URL**
   - The QR code should contain your network IP, not `localhost`
   - Example: `openid-credential-offer://?credential_offer=%7B%22credential_issuer%22%3A%22http%3A%2F%2F192.168.1.100%3A3001%22...`

### Backend Shows "localhost" Instead of Network IP

**Solution:** Restart with the network script:
```bash
./start-network.sh
```

### Can't Find Local IP

**Manual setup:**

1. Find your IP:
   ```bash
   # macOS
   ipconfig getifaddr en0
   
   # Linux
   hostname -I
   ```

2. Set environment variable:
   ```bash
   export ISSUER_URL="http://YOUR_IP:3001"
   export VITE_API_URL="http://YOUR_IP:3001"
   npm start
   ```

### Port Already in Use

The script automatically kills processes on ports 3001 and 5173.

If it doesn't work:
```bash
# Kill manually
kill -9 $(lsof -t -i:3001)
kill -9 $(lsof -t -i:5173)

# Then restart
./start-network.sh
```

## Testing the Complete Flow

### 1. Health Check

From your phone's browser:
```
http://YOUR_IP:3001/health
```

Should return:
```json
{
  "status": "ok",
  "service": "oid4vci-issuer",
  "issuerDid": "did:key:z6Mk..."
}
```

### 2. Create Offer

From your computer's browser:
```
http://YOUR_IP:5173
```

### 3. Scan QR Code

With Sphereon Wallet on your phone

### 4. Verify Credential

Check the wallet app - you should see the new credential with:
- Name
- Email
- Date of Birth

## Network Requirements

### Same WiFi Network
- ✅ Computer and phone on same WiFi
- ❌ Phone on cellular data
- ❌ Phone on guest WiFi
- ❌ Computer on VPN

### Firewall
- ✅ Allow incoming connections on port 3001
- ✅ Allow incoming connections on port 5173

### Router
- Most home routers allow local network communication by default
- Corporate networks may block it - use a personal hotspot if needed

## Alternative: Use Your Computer as Hotspot

If you have network issues:

1. **Create a hotspot** on your computer
2. **Connect your phone** to the hotspot
3. **Run the script** - it will detect the hotspot IP
4. **Test normally**

## Success Checklist

- [ ] Started with `./start-network.sh`
- [ ] Noted the network IP from terminal output
- [ ] Opened frontend at `http://YOUR_IP:5173`
- [ ] Created credential offer
- [ ] QR code contains network IP (not localhost)
- [ ] Phone and computer on same WiFi
- [ ] Scanned QR code with Sphereon Wallet
- [ ] Entered PIN in wallet
- [ ] Received credential in wallet ✅

## Still Having Issues?

### Test API Directly

From your phone's browser or a tool like Postman:

```bash
# 1. Create offer
POST http://YOUR_IP:3001/api/offers
Content-Type: application/json

{
  "credentialType": "IdentityCredential",
  "credentialSubject": {
    "name": "Test User",
    "email": "test@example.com"
  },
  "userPinRequired": true
}

# 2. Check the response
# The "qrCodeUrl" should contain YOUR_IP, not localhost
```

If this works, the issue is with the QR code scanning, not the network.

## Questions?

Check the main [README.md](./README.md) for more information.
