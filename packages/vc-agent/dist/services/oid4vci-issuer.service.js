"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OID4VCIssuerService = void 0;
const uuid_1 = require("uuid");
class OID4VCIssuerService {
    constructor(config) {
        this.config = {
            ...config,
            defaultExpiresIn: config.defaultExpiresIn || 3600, // 1 hour default
        };
        this.offerStore = new Map();
        this.tokenStore = new Map();
    }
    /**
     * Create a credential offer with pre-authorized code
     */
    async createCredentialOffer(options) {
        const { credentialType, credentialSubject, subjectDid, userPinRequired = false, expiresIn, } = options;
        // Generate unique IDs
        const offerId = (0, uuid_1.v4)();
        const preAuthorizedCode = this.generatePreAuthorizedCode();
        const userPin = userPinRequired ? this.generateUserPin() : undefined;
        // Calculate expiration
        const expirationSeconds = expiresIn || this.config.defaultExpiresIn;
        const expiresAt = new Date(Date.now() + expirationSeconds * 1000);
        // Store offer metadata
        const metadata = {
            offerId,
            preAuthorizedCode,
            credentialType,
            credentialSubject,
            subjectDid,
            userPin,
            expiresAt,
            used: false,
        };
        this.offerStore.set(preAuthorizedCode, metadata);
        // Create OID4VCI credential offer
        // Reference the credential by ID - wallet will fetch metadata from /.well-known/openid-credential-issuer
        const offer = {
            credential_issuer: this.config.issuerUrl,
            credentials: [credentialType], // Use credential ID that matches credentials_supported
            grants: {
                'urn:ietf:params:oauth:grant-type:pre-authorized_code': {
                    'pre-authorized_code': preAuthorizedCode,
                    ...(userPinRequired && { user_pin_required: true }),
                },
            },
        };
        return offer;
    }
    /**
     * Create an OID4VCI offer URL (for QR codes)
     */
    createOfferUrl(offer) {
        const offerJson = JSON.stringify(offer);
        const encodedOffer = encodeURIComponent(offerJson);
        return `openid-credential-offer://?credential_offer=${encodedOffer}`;
    }
    /**
     * Get offer metadata by pre-authorized code
     */
    async getOfferMetadata(preAuthorizedCode) {
        const metadata = this.offerStore.get(preAuthorizedCode);
        if (!metadata) {
            return null;
        }
        // Check if expired
        if (new Date() > metadata.expiresAt) {
            this.offerStore.delete(preAuthorizedCode);
            return null;
        }
        return metadata;
    }
    /**
     * Mark an offer as used
     */
    async markOfferAsUsed(preAuthorizedCode) {
        const metadata = this.offerStore.get(preAuthorizedCode);
        if (metadata) {
            metadata.used = true;
            this.offerStore.set(preAuthorizedCode, metadata);
        }
    }
    /**
     * Generate a secure pre-authorized code
     */
    generatePreAuthorizedCode() {
        // Generate a random code (in production, use crypto.randomBytes)
        return `pac_${(0, uuid_1.v4)().replace(/-/g, '')}`;
    }
    /**
     * Generate a user PIN
     */
    generateUserPin() {
        // Generate a 4-digit PIN (standard for OID4VCI wallets)
        return Math.floor(1000 + Math.random() * 9000).toString();
    }
    /**
     * Get issuer DID
     */
    getIssuerDid() {
        return this.config.issuerDid;
    }
    /**
     * Get issuer URL
     */
    getIssuerUrl() {
        return this.config.issuerUrl;
    }
    /**
     * Exchange pre-authorized code for access token
     */
    async exchangePreAuthorizedCode(request) {
        const { 'pre-authorized_code': preAuthCode, user_pin: userPin } = request;
        // Get offer metadata
        const metadata = await this.getOfferMetadata(preAuthCode);
        if (!metadata) {
            throw new Error('Invalid pre-authorized code');
        }
        // Check if already used
        if (metadata.used) {
            throw new Error('Pre-authorized code already used');
        }
        // Validate user PIN if required
        if (metadata.userPin) {
            if (!userPin) {
                throw new Error('User PIN required');
            }
            if (userPin !== metadata.userPin) {
                throw new Error('Invalid user PIN');
            }
        }
        // Mark offer as used
        await this.markOfferAsUsed(preAuthCode);
        // Generate access token
        const accessToken = this.generateAccessToken();
        const expiresIn = 3600; // 1 hour
        const expiresAt = new Date(Date.now() + expiresIn * 1000);
        // Store token metadata
        const tokenMetadata = {
            accessToken,
            preAuthorizedCode: preAuthCode,
            expiresAt,
            used: false,
        };
        this.tokenStore.set(accessToken, tokenMetadata);
        return {
            access_token: accessToken,
            token_type: 'bearer',
            expires_in: expiresIn,
        };
    }
    /**
     * Issue credential with access token
     */
    async issueCredential(request, accessToken, holderDid, credentialStatus) {
        // Validate access token
        const tokenMetadata = this.tokenStore.get(accessToken);
        if (!tokenMetadata) {
            throw new Error('Invalid access token');
        }
        // Check if expired
        if (new Date() > tokenMetadata.expiresAt) {
            this.tokenStore.delete(accessToken);
            throw new Error('Invalid access token');
        }
        // Check if already used
        if (tokenMetadata.used) {
            throw new Error('Invalid access token');
        }
        // Get original offer metadata
        const offerMetadata = this.offerStore.get(tokenMetadata.preAuthorizedCode);
        if (!offerMetadata) {
            throw new Error('Invalid access token');
        }
        // Use holder DID from proof if provided, otherwise use the one from offer
        const subjectDid = holderDid || offerMetadata.subjectDid;
        // Create the credential using CredentialService
        // Don't add 'id' here - the CredentialService will add it from subjectDid
        const credential = await this.config.credentialService.createCredential({
            issuerDid: this.config.issuerDid,
            subjectDid: subjectDid,
            credentialSubject: offerMetadata.credentialSubject,
            credentialStatus, // Include status if provided
        });
        // Mark token as used
        tokenMetadata.used = true;
        this.tokenStore.set(accessToken, tokenMetadata);
        // Return JWT credential
        return {
            format: 'jwt_vc_json',
            credential: credential.proof.jwt,
        };
    }
    /**
     * Generate a secure access token
     */
    generateAccessToken() {
        return `at_${(0, uuid_1.v4)().replace(/-/g, '')}`;
    }
    /**
     * Expire a token (for testing)
     */
    async expireToken(accessToken) {
        const tokenMetadata = this.tokenStore.get(accessToken);
        if (tokenMetadata) {
            tokenMetadata.expiresAt = new Date(Date.now() - 1000); // Set to past
            this.tokenStore.set(accessToken, tokenMetadata);
        }
    }
}
exports.OID4VCIssuerService = OID4VCIssuerService;
