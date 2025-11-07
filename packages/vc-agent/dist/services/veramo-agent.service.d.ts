import { IIdentifier, IDIDManager, IKeyManager, IResolver, TAgent } from '@veramo/core';
import { DIDResolutionResult } from 'did-resolver';
/**
 * Type definition for the Veramo agent with all required plugins
 */
export type ConfiguredAgent = TAgent<IDIDManager & IKeyManager & IResolver>;
/**
 * Service for managing Veramo agent operations including DID and key management
 */
export declare class VeramoAgentService {
    private agent;
    constructor();
    /**
     * Creates and configures a Veramo agent with in-memory storage
     */
    private createAgent;
    /**
     * Get the configured Veramo agent instance
     */
    getAgent(): ConfiguredAgent;
    /**
     * Create a new did:key identifier
     * @param keyType - The type of key to use (Ed25519 or Secp256k1)
     */
    createIdentifier(keyType?: 'Ed25519' | 'Secp256k1'): Promise<IIdentifier>;
    /**
     * Resolve a DID to its DID Document
     */
    resolveDid(did: string): Promise<DIDResolutionResult>;
    /**
     * List all managed identifiers
     */
    listIdentifiers(): Promise<IIdentifier[]>;
    /**
     * Get a specific identifier by DID
     */
    getIdentifier(did: string): Promise<IIdentifier>;
}
