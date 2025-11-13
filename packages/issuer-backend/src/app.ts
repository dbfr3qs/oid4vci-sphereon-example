import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { networkInterfaces } from 'os';
import { VeramoAgentService, CredentialService, OID4VCIssuerService, StatusListService } from '@oid4vci-example/vc-agent';

// Initialize services
const veramoService = new VeramoAgentService();
const credentialService = new CredentialService(veramoService);

// Create issuer identity (in production, this would be loaded from secure storage)
let issuerService: OID4VCIssuerService;
let issuerDid: string;
let statusListService: StatusListService;

function getLocalIpAddress(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

function getIssuerUrl(): string {
  const localIp = getLocalIpAddress();
  const port = process.env.PORT || 3001;
  return `http://${localIp}:${port}`;
}

async function initializeIssuer() {
  // Use Secp256k1 to match the wallet's key type (ES256)
  console.log('[INIT] Creating issuer with Secp256k1 key type...');
  const issuer = await veramoService.createIdentifier('Secp256k1');
  issuerDid = issuer.did;
  console.log('[INIT] Issuer DID created:', issuerDid);
  console.log('[INIT] DID prefix:', issuerDid.substring(0, 15));
  
  const issuerUrl = process.env.ISSUER_URL || getIssuerUrl();
  
  issuerService = new OID4VCIssuerService({
    issuerDid: issuer.did,
    issuerUrl,
    credentialService,
  });
  
  // Initialize status list service
  const statusListUrl = `${issuerUrl}/status/1`;
  statusListService = new StatusListService({
    issuerDid: issuer.did,
    statusListId: '1',
    statusListUrl,
    veramoService,
  });
  await statusListService.initialize();
  
  console.log(`Issuer initialized with DID: ${issuerDid}`);
  console.log(`Issuer URL: ${issuerUrl}`);
  console.log(`Status List URL: ${statusListUrl}`);
}

// Initialize Express app
export const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Support form-urlencoded (OAuth standard)

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'oid4vci-issuer',
    issuerDid: issuerDid || 'not initialized',
  });
});

// Debug endpoint to decode a JWT
app.post('/debug/decode-jwt', (req: Request, res: Response) => {
  try {
    const { jwt } = req.body;
    if (!jwt) {
      return res.status(400).json({ error: 'Missing jwt parameter' });
    }
    
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      return res.status(400).json({ error: 'Invalid JWT format' });
    }
    
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    res.json({
      header,
      payload,
      signature: parts[2].substring(0, 20) + '...',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// OID4VCI Issuer Metadata endpoint (required by wallets)
app.get('/.well-known/openid-credential-issuer', (req: Request, res: Response) => {
  const issuerUrl = process.env.ISSUER_URL || getIssuerUrl();
  
  res.json({
    credential_issuer: issuerUrl,
    credential_endpoint: `${issuerUrl}/api/credential`,
    token_endpoint: `${issuerUrl}/api/token`,
    credentials_supported: [
      {
        format: 'jwt_vc_json',
        id: 'IdentityCredential',
        types: ['VerifiableCredential', 'IdentityCredential'],
        cryptographic_binding_methods_supported: ['did'],
        cryptographic_suites_supported: ['EdDSA'],
        display: [
          {
            name: 'Identity Credential',
            locale: 'en-US',
            background_color: '#12107c',
            text_color: '#FFFFFF',
          }
        ],
        credentialSubject: {
          name: {
            display: [{ name: 'Full Name', locale: 'en-US' }]
          },
          email: {
            display: [{ name: 'Email Address', locale: 'en-US' }]
          },
          dateOfBirth: {
            display: [{ name: 'Date of Birth', locale: 'en-US' }]
          }
        }
      }
    ]
  });
});

// POST /api/offers - Create credential offer
app.post('/api/offers', async (req: Request, res: Response) => {
  try {
    const { credentialType, credentialSubject, userPinRequired, expiresIn } = req.body;

    // Validate request
    if (!credentialType || !credentialSubject) {
      return res.status(400).json({
        error: 'Missing required fields: credentialType and credentialSubject',
      });
    }

    // Don't create a holder DID - the wallet will provide it in the proof
    // Store the credential subject data without the DID
    const offer = await issuerService.createCredentialOffer({
      credentialType,
      credentialSubject: credentialSubject, // Don't add 'id' here
      subjectDid: '', // Will be filled from wallet's proof
      userPinRequired: userPinRequired || false,
      expiresIn,
    });

    // Generate QR code URL
    const qrCodeUrl = issuerService.createOfferUrl(offer);

    // Get offer metadata (including PIN if required)
    const preAuthCode = offer.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code']['pre-authorized_code'];
    const metadata = await issuerService.getOfferMetadata(preAuthCode);

    res.status(201).json({
      offer,
      qrCodeUrl,
      userPin: metadata?.userPin,
      preAuthCode, // For testing/debugging
    });
  } catch (error: any) {
    console.error('Error creating offer:', error);
    res.status(500).json({
      error: 'Failed to create credential offer',
      message: error.message,
    });
  }
});

// POST /api/token - Exchange pre-authorized code for access token
app.post('/api/token', async (req: Request, res: Response) => {
  try {
    console.log('Token request received:');
    console.log('  Headers:', JSON.stringify(req.headers, null, 2));
    console.log('  Body:', JSON.stringify(req.body, null, 2));
    
    const tokenRequest = req.body;

    // Validate request
    if (!tokenRequest['pre-authorized_code'] && !tokenRequest.pre_authorized_code) {
      console.error('Missing pre-authorized_code in request');
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing pre-authorized_code parameter',
      });
    }

    // Normalize the request (handle both formats)
    const normalizedRequest = {
      grant_type: tokenRequest.grant_type || tokenRequest['grant_type'],
      'pre-authorized_code': tokenRequest['pre-authorized_code'] || tokenRequest.pre_authorized_code,
      user_pin: tokenRequest.user_pin || tokenRequest['user_pin'],
    };

    console.log('Normalized request:', JSON.stringify(normalizedRequest, null, 2));

    // Exchange code for token
    const tokenResponse = await issuerService.exchangePreAuthorizedCode(normalizedRequest);
    console.log('Token issued successfully');

    res.json(tokenResponse);
  } catch (error: any) {
    console.error('Error exchanging token:', error.message);
    console.error('Error stack:', error.stack);
    res.status(400).json({
      error: 'invalid_grant',
      error_description: error.message,
    });
  }
});

// POST /api/credential - Issue credential with access token
app.post('/api/credential', async (req: Request, res: Response) => {
  try {
    console.log('Credential request received:');
    console.log('  Headers:', JSON.stringify(req.headers, null, 2));
    console.log('  Body:', JSON.stringify(req.body, null, 2));
    
    // Extract access token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'Missing or invalid Authorization header',
      });
    }

    const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    const credentialRequest = req.body;

    // Validate request
    if (!credentialRequest.format || !credentialRequest.types) {
      console.error('Missing required fields in credential request');
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing required fields: format and types',
      });
    }

    console.log('Issuing credential...');
    
    // Extract holder DID from proof if provided
    let holderDid: string | undefined;
    if (credentialRequest.proof && credentialRequest.proof.jwt) {
      try {
        const proofJwt = credentialRequest.proof.jwt;
        const parts = proofJwt.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          holderDid = payload.iss; // The wallet's DID is in the 'iss' field
          console.log('Extracted holder DID from proof:', holderDid);
        }
      } catch (e) {
        console.error('Failed to extract DID from proof:', e);
      }
    }
    
    // Generate credential ID and create status entry BEFORE issuing
    const credentialId = `urn:uuid:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const statusEntry = statusListService.createStatusEntry(credentialId);
    console.log('Created status entry for credential:', credentialId);
    console.log('Status list index:', statusEntry.statusListIndex);
    
    // Issue credential with the holder's DID and credentialStatus
    const credentialResponse = await issuerService.issueCredential(
      credentialRequest,
      accessToken,
      holderDid,
      statusEntry // Pass the status entry
    );

    console.log('Credential issued successfully with revocation support');
    console.log('Credential JWT preview:', credentialResponse.credential.substring(0, 100) + '...');
    
    // Decode and log the credential for debugging
    try {
      const parts = credentialResponse.credential.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      console.log('Credential payload:');
      console.log('  Issuer:', payload.iss);
      console.log('  Subject (from sub):', payload.sub);
      console.log('  Subject (from vc):', payload.vc?.credentialSubject?.id);
      console.log('  Types:', payload.vc?.type);
      console.log('  Credential Status:', payload.vc?.credentialStatus);
    } catch (e) {
      console.error('Failed to decode credential:', e);
    }

    // Include credential ID in response for revocation tracking
    res.json({
      ...credentialResponse,
      credentialId, // Include this so frontend can display it
    });
  } catch (error: any) {
    console.error('Error issuing credential:', error.message);
    console.error('Error stack:', error.stack);
    res.status(401).json({
      error: 'invalid_token',
      error_description: error.message,
    });
  }
});

// Status List 2021 endpoint - serves the revocation status list
app.get('/status/:listId', async (req: Request, res: Response) => {
  try {
    const { listId } = req.params;
    
    if (listId !== '1') {
      return res.status(404).json({
        error: 'Status list not found',
      });
    }

    console.log('[STATUS] Generating status list credential...');
    const statusListCredential = await statusListService.generateStatusListCredential();
    
    // Return as JWT
    res.json({
      credential: statusListCredential,
    });
  } catch (error: any) {
    console.error('Error generating status list:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: error.message,
    });
  }
});

// Revoke a credential
app.post('/api/revoke', async (req: Request, res: Response) => {
  try {
    const { credentialId } = req.body;

    if (!credentialId) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'credentialId is required',
      });
    }

    console.log(`[REVOKE] Revoking credential: ${credentialId}`);
    const revoked = await statusListService.revokeCredential(credentialId);

    if (!revoked) {
      return res.status(404).json({
        error: 'not_found',
        error_description: 'Credential not found in status list',
      });
    }

    console.log(`[REVOKE] ✓ Credential ${credentialId} revoked successfully`);
    res.json({
      revoked: true,
      credentialId,
    });
  } catch (error: any) {
    console.error('Error revoking credential:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: error.message,
    });
  }
});

// Check revocation status
app.get('/api/status/:credentialId', async (req: Request, res: Response) => {
  try {
    const { credentialId } = req.params;

    console.log(`[STATUS CHECK] Checking status for: ${credentialId}`);
    const isRevoked = await statusListService.isRevoked(credentialId);

    res.json({
      credentialId,
      revoked: isRevoked,
    });
  } catch (error: any) {
    console.error('Error checking status:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: error.message,
    });
  }
});

// Get status list statistics
app.get('/api/status-stats', async (req: Request, res: Response) => {
  try {
    const stats = statusListService.getStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: error.message,
    });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Initialize issuer before starting server
export async function initializeApp() {
  await initializeIssuer();
  return app;
}
