import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { VeramoAgentService, CredentialService, OID4VCIssuerService } from '@oid4vci-example/vc-agent';

// Initialize services
const veramoService = new VeramoAgentService();
const credentialService = new CredentialService(veramoService);

// Create issuer identity (in production, this would be loaded from secure storage)
let issuerService: OID4VCIssuerService;
let issuerDid: string;

async function initializeIssuer() {
  const issuer = await veramoService.createIdentifier();
  issuerDid = issuer.did;
  
  issuerService = new OID4VCIssuerService({
    issuerDid: issuer.did,
    issuerUrl: process.env.ISSUER_URL || 'http://localhost:3001',
    credentialService,
  });
  
  console.log(`Issuer initialized with DID: ${issuerDid}`);
}

// Initialize Express app
export const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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

    // Create a holder DID (in real scenario, this would come from the wallet)
    const holder = await veramoService.createIdentifier();

    // Create credential offer
    const offer = await issuerService.createCredentialOffer({
      credentialType,
      credentialSubject: {
        id: holder.did,
        ...credentialSubject,
      },
      subjectDid: holder.did,
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
    const tokenRequest = req.body;

    // Validate request
    if (!tokenRequest['pre-authorized_code']) {
      return res.status(400).json({
        error: 'Missing pre-authorized_code',
      });
    }

    // Exchange code for token
    const tokenResponse = await issuerService.exchangePreAuthorizedCode(tokenRequest);

    res.json(tokenResponse);
  } catch (error: any) {
    console.error('Error exchanging token:', error);
    res.status(400).json({
      error: 'Failed to exchange pre-authorized code',
      message: error.message,
    });
  }
});

// POST /api/credential - Issue credential with access token
app.post('/api/credential', async (req: Request, res: Response) => {
  try {
    // Extract access token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing or invalid Authorization header',
      });
    }

    const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    const credentialRequest = req.body;

    // Validate request
    if (!credentialRequest.format || !credentialRequest.types) {
      return res.status(400).json({
        error: 'Missing required fields: format and types',
      });
    }

    // Issue credential
    const credentialResponse = await issuerService.issueCredential(
      credentialRequest,
      accessToken
    );

    res.json(credentialResponse);
  } catch (error: any) {
    console.error('Error issuing credential:', error);
    res.status(401).json({
      error: 'Failed to issue credential',
      message: error.message,
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
