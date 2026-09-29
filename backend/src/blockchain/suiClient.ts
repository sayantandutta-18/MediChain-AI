import { getFullnodeUrl, SuiClient, SuiHTTPTransport } from '@mysten/sui/client';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { sha256 } from '../utils/hash';

export interface AnchorInput {
  recordId: string;
  recordHash: string;
  patientId: string;
}

export interface AnchorResult {
  status: 'ANCHORED' | 'SIMULATED' | 'FAILED';
  network: string;
  onChainHash: string;
  transactionDigest?: string;
  objectId?: string;
  packageId?: string;
  registryId?: string;
  anchoredAt: Date;
  error?: string;
}

export interface OnChainAnchor {
  recordId: string;
  recordHash: string;
  patientId: string;
  objectId: string;
  createdAtMs: number;
}

interface AnchorFields {
  record_id?: unknown;
  record_hash?: unknown;
  patient?: unknown;
  created_at?: unknown;
}

const toNetwork = (): 'testnet' | 'mainnet' | 'devnet' =>
  env.sui.network === 'mainnet' || env.sui.network === 'devnet' ? env.sui.network : 'testnet';

/**
 * TRD-8: Sui Testnet integration.
 *
 * - `SuiGrpcClient` handles the gRPC transport (network probe / read path).
 * - `SuiClient` (JSON-RPC) performs structured object reads and anchor writes.
 *
 * The signing key is only ever supplied through the environment at runtime -
 * it is never committed and never returned by the API.
 *
 * When the Move package is not configured the service degrades to a
 * deterministic *simulated* anchor so the rest of the system stays testable and
 * never overstates the strength of a verification.
 */
class SuiAnchorService {
  private grpcClient: SuiGrpcClient | null = null;

  private jsonRpcClient: SuiClient | null = null;

  get isConfigured(): boolean {
    return Boolean(env.sui.packageId && env.sui.registryId);
  }

  get network(): string {
    return env.sui.network;
  }

  private getGrpc(): SuiGrpcClient {
    if (!this.grpcClient) {
      const network = toNetwork();
      this.grpcClient = new SuiGrpcClient({ network, baseUrl: getFullnodeUrl(network) });
    }
    return this.grpcClient;
  }

  private getJsonRpc(): SuiClient {
    if (!this.jsonRpcClient) {
      const network = toNetwork();
      this.jsonRpcClient = new SuiClient({
        network,
        transport: new SuiHTTPTransport({ url: getFullnodeUrl(network) }),
      });
    }
    return this.jsonRpcClient;
  }

  /**
   * Anchor the SHA-256 digest of a medical record on chain.
   * The medical document itself is NEVER written to the chain (scope boundary).
   */
  async anchor(input: AnchorInput): Promise<AnchorResult> {
    const anchoredAt = new Date();

    if (!this.isConfigured) {
      const objectId = `0x${sha256(`simulated|${env.sui.network}|${input.recordId}|${input.recordHash}`).slice(0, 32)}`;
      logger.warn(
        `Sui package not configured - recorded a SIMULATED anchor for ${input.recordId}. ` +
          'Set SUI_PACKAGE_ID and SUI_REGISTRY_ID to anchor for real.',
      );
      return {
        status: 'SIMULATED',
        network: env.sui.network,
        onChainHash: input.recordHash,
        objectId,
        packageId: 'simulated',
        registryId: 'simulated',
        anchoredAt,
      };
    }

    try {
      if (!env.sui.mnemonic) {
        throw new Error('SUI_ENV_MNEMONIC is required to publish an anchor transaction.');
      }

      const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(env.sui.mnemonic, 'utf8'));

      const tx = new Transaction();
      tx.setSender(keypair.getPublicKey().toSuiAddress());
      tx.moveCall({
        package: env.sui.packageId,
        module: 'medical_record_anchor',
        function: 'anchor_record',
        arguments: [
          tx.object(env.sui.registryId),
          tx.pure.string(input.recordId),
          tx.pure.string(input.recordHash),
          tx.pure.string(input.patientId),
        ],
      });

      const { digest } = await this.getJsonRpc().signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
        options: { showEffects: true },
      });

      // `anchor_record` shares the new MedicalRecordAnchor; the last created
      // object reference in the effects is that anchor.
      const response = await this.getJsonRpc().getTransactionBlock({ digest });
      const created = (response.effects as { created?: { reference?: { objectId?: string } }[] } | undefined)
        ?.created;
      const objectId = created?.[created.length - 1]?.reference?.objectId;

      return {
        status: 'ANCHORED',
        network: env.sui.network,
        onChainHash: input.recordHash,
        transactionDigest: digest,
        objectId,
        packageId: env.sui.packageId,
        registryId: env.sui.registryId,
        anchoredAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown anchoring error';
      logger.error(`Failed to anchor ${input.recordId} on Sui`, message);
      return {
        status: 'FAILED',
        network: env.sui.network,
        onChainHash: input.recordHash,
        packageId: env.sui.packageId,
        registryId: env.sui.registryId,
        anchoredAt,
        error: message.slice(0, 300),
      };
    }
  }

  /** Fetch the anchored object back from chain so the hash can be compared (PRD-5). */
  async readAnchor(objectId: string): Promise<OnChainAnchor | null> {
    const response = await this.getJsonRpc().getObject({ id: objectId, options: { showContent: true } });
    const content = response.data?.content;

    if (!content || content.dataType !== 'moveObject') return null;

    const fields = content.fields as AnchorFields;

    return {
      recordId: String(fields.record_id ?? ''),
      recordHash: String(fields.record_hash ?? ''),
      patientId: String(fields.patient ?? ''),
      objectId: response.data?.objectId ?? objectId,
      createdAtMs: Number(fields.created_at ?? 0),
    };
  }

  /** Sanity check that the configured network is reachable over gRPC / JSON-RPC. */
  async health(): Promise<{ network: string; configured: boolean; reachable: boolean; error?: string }> {
    try {
      if (env.sui.registryId) {
        await this.getGrpc().core.getObjects({ objectIds: [env.sui.registryId] });
      } else {
        await this.getJsonRpc().getLatestCheckpointSequenceNumber();
      }
      return { network: env.sui.network, configured: this.isConfigured, reachable: true };
    } catch (error) {
      return {
        network: env.sui.network,
        configured: this.isConfigured,
        reachable: false,
        error: error instanceof Error ? error.message : 'unreachable',
      };
    }
  }

  reset(): void {
    this.grpcClient = null;
    this.jsonRpcClient = null;
  }
}

export const suiAnchorService = new SuiAnchorService();
