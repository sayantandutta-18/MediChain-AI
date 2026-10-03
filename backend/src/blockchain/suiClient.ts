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
      const url = env.sui.rpcUrl || getFullnodeUrl(network);
      this.jsonRpcClient = new SuiClient({
        network,
        transport: new SuiHTTPTransport({ url }),
      });
    }
    return this.jsonRpcClient;
  }

  /** Builds the signing key from either credential style the SDK accepts. */
  private getKeypair(): Ed25519Keypair {
    if (env.sui.privateKey) {
      return Ed25519Keypair.fromSecretKey(Buffer.from(env.sui.privateKey.trim()));
    }
    if (env.sui.mnemonic) {
      return Ed25519Keypair.fromSecretKey(Buffer.from(env.sui.mnemonic, 'utf8'));
    }
    throw new Error('No Sui signing credential configured (set SUI_PRIVATE_KEY or SUI_ENV_MNEMONIC).');
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
      const keypair = this.getKeypair();

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

  /**
   * Reachability probe.
   *
   * Uses gRPC deliberately: the public Sui fullnode has deprecated JSON-RPC, so
   * probing it over JSON-RPC would always fail and would report the network as
   * unreachable even when gRPC is healthy. `getReferenceGasPrice` is a cheap,
   * side-effect-free liveness call (verified returning a value against testnet).
   *
   * `configured` stays false until both a published Move package id and the
   * shared registry object id are supplied - we never imply a live chain anchor
   * that cannot actually be addressed.
   */
  async health(): Promise<{ network: string; configured: boolean; reachable: boolean; rpcMode: string; error?: string }> {
    const rpcMode = env.sui.rpcUrl ? 'custom-jsonrpc' : 'default';
    try {
      await this.getGrpc().core.getReferenceGasPrice();
      return {
        network: env.sui.network,
        configured: this.isConfigured,
        reachable: true,
        rpcMode,
      };
    } catch (grpcError) {
      try {
        // A custom JSON-RPC endpoint may still be usable for reads.
        await this.getJsonRpc().getLatestCheckpointSequenceNumber();
        return {
          network: env.sui.network,
          configured: this.isConfigured,
          reachable: true,
          rpcMode,
        };
      } catch {
        return {
          network: env.sui.network,
          configured: this.isConfigured,
          reachable: false,
          rpcMode,
          error: grpcError instanceof Error ? grpcError.message.slice(0, 200) : 'unreachable',
        };
      }
    }
  }

  reset(): void {
    this.grpcClient = null;
    this.jsonRpcClient = null;
  }
}

export const suiAnchorService = new SuiAnchorService();
