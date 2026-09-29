# MediChain Anchor — Sui Move package

Stores the **integrity proof** of each medical record on Sui Testnet. The medical
document itself never leaves the encrypted database (scope boundary, PRD §4).

```
MedicalRecordRegistry (shared)
        │  anchor_record(record_id, record_hash, patient)
        ▼
MedicalRecordAnchor { record_id, record_hash, patient, created_at }  (shared object)
```

## 1. Install the Sui CLI

```bash
suiup install sui-testnet
sui move build --path sui
```

## 2. Configure a testnet wallet

```bash
sui client new-env --alias medichain-testnet --rpc https://fullnode.testnet.sui.io:443
sui client switch --env medichain-testnet
sui client active-address        # fund with testnet SUI at https://faucet.sui.io)
```

## 3. Publish the package

```bash
sui client publish --path sui --gas-budget 200000000
```

Note the returned **Package ID** and the shared **Registry object id**.

## 4. Point the backend at them

```env
SUI_NETWORK=testnet
SUI_PACKAGE_ID=0x<package-id>
SUI_REGISTRY_ID=0x<registry-object-id>
# only needed for anchoring writes; supply at runtime, never commit
SUI_ENV_MNEMONIC=<devnet-phrase>
```

Without these values the API still works — anchors are recorded as
`SIMULATED` and the verification endpoint reports `UNAVAILABLE` instead of
claiming a chain-backed proof.

## 5. Verify

```bash
sui client object <anchor-object-id>
```

The backend performs the same read through `SuiGrpcClient` and compares
`record_hash` with the digest stored in MongoDB. A match is reported as
`VERIFIED`.
