import { SuiGrpcClient } from "@mysten/sui/grpc";

const network = process.env.SUI_NETWORK || "testnet";

const baseUrl =
  process.env.SUI_RPC_URL ||
  "https://fullnode.testnet.sui.io:443";

export const suiClient = new SuiGrpcClient({
  network,
  baseUrl,
});