import {
  createAgent,
  IIdentifier,
  IDIDManager,
  IKeyManager,
  IResolver,
  TAgent,
} from '@veramo/core';
import { DIDManager, MemoryDIDStore } from '@veramo/did-manager';
import { KeyManager, MemoryKeyStore, MemoryPrivateKeyStore } from '@veramo/key-manager';
import { KeyManagementSystem } from '@veramo/kms-local';
import { DIDResolverPlugin } from '@veramo/did-resolver';
import { SphereonKeyDidProvider } from '@sphereon/ssi-sdk-ext.did-provider-key';
import { getResolver as getDidKeyResolver } from '@sphereon/ssi-sdk-ext.did-resolver-key';
import { CredentialPlugin } from '@veramo/credential-w3c';
import { DIDResolutionResult, Resolver } from 'did-resolver';

/**
 * Type definition for the Veramo agent with all required plugins
 */
export type ConfiguredAgent = TAgent<
  IDIDManager & IKeyManager & IResolver
>;

/**
 * Service for managing Veramo agent operations including DID and key management
 */
export class VeramoAgentService {
  private agent: ConfiguredAgent;

  constructor() {
    this.agent = this.createAgent();
  }

  /**
   * Creates and configures a Veramo agent with in-memory storage
   */
  private createAgent(): ConfiguredAgent {
    // In-memory stores
    const memoryKeyStore = new MemoryKeyStore();
    const memoryDIDStore = new MemoryDIDStore();
    const memoryPrivateKeyStore = new MemoryPrivateKeyStore();

    // Secret key for encrypting private keys (in production, use a secure secret)
    const secretKey = '29739248cad1bd1a0fc4d9b75cd4d2990de535baf5caadfdf8d8f86664aa830c';

    // Setup DID resolver for did:key
    const didResolver = new Resolver({
      ...getDidKeyResolver(),
    });

    return createAgent<IDIDManager & IKeyManager & IResolver>({
      plugins: [
        new KeyManager({
          store: memoryKeyStore,
          kms: {
            local: new KeyManagementSystem(memoryPrivateKeyStore),
          },
        }),
        new DIDManager({
          store: memoryDIDStore,
          defaultProvider: 'did:key',
          providers: {
            'did:key': new SphereonKeyDidProvider({
              defaultKms: 'local',
            }),
          },
        }),
        new DIDResolverPlugin({
          resolver: didResolver,
        }),
        new CredentialPlugin(),
      ],
    });
  }

  /**
   * Get the configured Veramo agent instance
   */
  public getAgent(): ConfiguredAgent {
    return this.agent;
  }

  /**
   * Create a new did:key identifier
   * @param keyType - The type of key to use (Ed25519 or Secp256k1)
   */
  public async createIdentifier(keyType: 'Ed25519' | 'Secp256k1' = 'Secp256k1'): Promise<IIdentifier> {
    return await this.agent.didManagerCreate({
      provider: 'did:key',
      kms: 'local',
      options: {
        type: keyType,  // did:key provider expects 'type', not 'keyType'
      },
    });
  }

  /**
   * Resolve a DID to its DID Document
   */
  public async resolveDid(did: string): Promise<DIDResolutionResult> {
    return await this.agent.resolveDid({ didUrl: did });
  }

  /**
   * List all managed identifiers
   */
  public async listIdentifiers(): Promise<IIdentifier[]> {
    return await this.agent.didManagerFind();
  }

  /**
   * Get a specific identifier by DID
   */
  public async getIdentifier(did: string): Promise<IIdentifier> {
    return await this.agent.didManagerGet({ did });
  }
}
