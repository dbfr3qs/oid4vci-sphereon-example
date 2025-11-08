import express, { Request, Response } from 'express';
import cors from 'cors';
import { VeramoAgentService } from '@oid4vci-example/vc-agent/dist/services/veramo-agent.service';
import { CredentialService } from '@oid4vci-example/vc-agent/dist/services/credential.service';
import { OID4VPVerifierService } from '@oid4vci-example/vc-agent/dist/services/oid4vp-verifier.service';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Services
const veramoService = new VeramoAgentService();
const credentialService = new CredentialService(veramoService);

let verifierService: OID4VPVerifierService;
let verifierDid: string;

// Helper to get network IP
function getLocalIpAddress(): string {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4;
      if (net.family === familyV4Value && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

function getVerifierUrl(): string {
  const localIp = getLocalIpAddress();
  const port = process.env.PORT || 3002;
  return `http://${localIp}:${port}`;
}

// Initialize verifier
async function initializeVerifier() {
  console.log('[INIT] Creating verifier with Secp256k1 key type...');
  const verifier = await veramoService.createIdentifier('Secp256k1');
  verifierDid = verifier.did;
  console.log('[INIT] Verifier DID created:', verifierDid);
  console.log('[INIT] DID prefix:', verifierDid.substring(0, 15));
  
  const verifierUrl = process.env.VERIFIER_URL || getVerifierUrl();
  
  verifierService = new OID4VPVerifierService({
    verifierDid: verifier.did,
    verifierUrl,
    credentialService,
  });
  
  console.log(`Verifier initialized with DID: ${verifierDid}`);
  console.log(`Verifier URL: ${verifierUrl}`);
}

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok',
    service: 'verifier',
    verifierDid: verifierDid || 'not initialized'
  });
});

// Create presentation request
app.post('/api/presentation-requests', async (req: Request, res: Response) => {
  try {
    console.log('POST /api/presentation-requests');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const { credentialTypes, purpose, requiredFields } = req.body;

    if (!credentialTypes || !Array.isArray(credentialTypes) || credentialTypes.length === 0) {
      return res.status(400).json({
        error: 'credentialTypes is required and must be a non-empty array'
      });
    }

    // Create presentation request
    const authRequest = await verifierService.createPresentationRequest({
      credentialTypes,
      purpose: purpose || 'Login verification',
      requiredFields: requiredFields || [],
    });

    // Create request URL for QR code
    const requestUrl = verifierService.createRequestUrl(authRequest);

    console.log('Presentation request created:');
    console.log('  State:', authRequest.state);
    console.log('  Nonce:', authRequest.nonce);
    console.log('  Request URL:', requestUrl);

    res.json({
      authRequest,
      requestUrl,
      state: authRequest.state,
    });
  } catch (error: any) {
    console.error('Error creating presentation request:', error);
    res.status(500).json({
      error: 'Failed to create presentation request',
      details: error.message
    });
  }
});

// Verify presentation (callback endpoint)
app.post('/api/presentations/verify', async (req: Request, res: Response) => {
  try {
    console.log('POST /api/presentations/verify');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const { vp_token, state } = req.body;

    if (!vp_token) {
      return res.status(400).json({
        error: 'vp_token is required'
      });
    }

    if (!state) {
      return res.status(400).json({
        error: 'state is required'
      });
    }

    // Verify the presentation
    const verificationResult = await verifierService.verifyPresentation(vp_token, state);

    console.log('Verification result:', JSON.stringify(verificationResult, null, 2));

    if (!verificationResult.verified) {
      return res.status(400).json({
        verified: false,
        error: verificationResult.error
      });
    }

    // Extract user data from the presentation
    const jwtParts = vp_token.split('.');
    const payload = JSON.parse(Buffer.from(jwtParts[1], 'base64').toString());
    const vp = payload.vp;
    
    // Get the first credential
    const credentials = Array.isArray(vp.verifiableCredential) 
      ? vp.verifiableCredential 
      : [vp.verifiableCredential];
    
    let userData = null;
    if (credentials.length > 0) {
      const credential = credentials[0];
      // Decode credential JWT if it's a string
      if (typeof credential === 'string') {
        const credParts = credential.split('.');
        const credPayload = JSON.parse(Buffer.from(credParts[1], 'base64').toString());
        userData = {
          did: credPayload.sub,
          ...credPayload.vc.credentialSubject
        };
      } else {
        userData = {
          did: credential.credentialSubject?.id,
          ...credential.credentialSubject
        };
      }
    }

    console.log('User data extracted:', userData);

    res.json({
      verified: true,
      verificationResult,
      userData,
      holderDid: payload.iss || payload.sub,
    });
  } catch (error: any) {
    console.error('Error verifying presentation:', error);
    res.status(500).json({
      verified: false,
      error: {
        message: 'Failed to verify presentation',
        details: error.message
      }
    });
  }
});

// Get presentation request status
app.get('/api/presentation-requests/:state', async (req: Request, res: Response) => {
  try {
    const { state } = req.params;
    
    const metadata = await verifierService.getRequestMetadata(state);
    
    if (!metadata) {
      return res.status(404).json({
        error: 'Presentation request not found or expired'
      });
    }

    res.json({
      state: metadata.state,
      verified: metadata.verified,
      createdAt: metadata.createdAt,
      expiresAt: metadata.expiresAt,
    });
  } catch (error: any) {
    console.error('Error getting request status:', error);
    res.status(500).json({
      error: 'Failed to get request status',
      details: error.message
    });
  }
});

// Initialize and export
export async function initializeApp() {
  await initializeVerifier();
  return app;
}

export default app;
