"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VeramoAgentService = void 0;
const core_1 = require("@veramo/core");
const did_manager_1 = require("@veramo/did-manager");
const key_manager_1 = require("@veramo/key-manager");
const kms_local_1 = require("@veramo/kms-local");
const did_resolver_1 = require("@veramo/did-resolver");
const did_provider_key_1 = require("@veramo/did-provider-key");
const credential_w3c_1 = require("@veramo/credential-w3c");
const did_resolver_2 = require("did-resolver");
const did_provider_key_2 = require("@veramo/did-provider-key");
/**
 * Service for managing Veramo agent operations including DID and key management
 */
class VeramoAgentService {
    constructor() {
        this.agent = this.createAgent();
    }
    /**
     * Creates and configures a Veramo agent with in-memory storage
     */
    createAgent() {
        // In-memory stores
        const memoryKeyStore = new key_manager_1.MemoryKeyStore();
        const memoryDIDStore = new did_manager_1.MemoryDIDStore();
        const memoryPrivateKeyStore = new key_manager_1.MemoryPrivateKeyStore();
        // Secret key for encrypting private keys (in production, use a secure secret)
        const secretKey = '29739248cad1bd1a0fc4d9b75cd4d2990de535baf5caadfdf8d8f86664aa830c';
        // Setup DID resolver for did:key
        const didResolver = new did_resolver_2.Resolver({
            ...(0, did_provider_key_2.getDidKeyResolver)(),
        });
        return (0, core_1.createAgent)({
            plugins: [
                new key_manager_1.KeyManager({
                    store: memoryKeyStore,
                    kms: {
                        local: new kms_local_1.KeyManagementSystem(memoryPrivateKeyStore),
                    },
                }),
                new did_manager_1.DIDManager({
                    store: memoryDIDStore,
                    defaultProvider: 'did:key',
                    providers: {
                        'did:key': new did_provider_key_1.KeyDIDProvider({
                            defaultKms: 'local',
                        }),
                    },
                }),
                new did_resolver_1.DIDResolverPlugin({
                    resolver: didResolver,
                }),
                new credential_w3c_1.CredentialPlugin(),
            ],
        });
    }
    /**
     * Get the configured Veramo agent instance
     */
    getAgent() {
        return this.agent;
    }
    /**
     * Create a new did:key identifier
     */
    async createIdentifier() {
        return await this.agent.didManagerCreate({
            provider: 'did:key',
            kms: 'local',
        });
    }
    /**
     * Resolve a DID to its DID Document
     */
    async resolveDid(did) {
        return await this.agent.resolveDid({ didUrl: did });
    }
    /**
     * List all managed identifiers
     */
    async listIdentifiers() {
        return await this.agent.didManagerFind();
    }
    /**
     * Get a specific identifier by DID
     */
    async getIdentifier(did) {
        return await this.agent.didManagerGet({ did });
    }
}
exports.VeramoAgentService = VeramoAgentService;
