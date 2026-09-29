/// MediChain-AI integrity anchor (TRD-8).
///
/// Only integrity metadata is ever written on chain:
///   * record_id   - the opaque, non-identifying record id
///   * record_hash - the SHA-256 hexadecimal digest of the document
///   * patient     - the patient identifier the record belongs to
///   * created_at  - anchor timestamp in milliseconds
///
/// The medical document itself is never stored on chain.
module medichain::medical_record_anchor {
    use std::string::String;
    use sui::event;

    /// Shared registry so any authorised publisher can anchor a record digest.
    public struct MedicalRecordRegistry has key {
        id: UID,
        anchor_count: u64,
    }

    /// The on-chain representation of a record's integrity proof.
    public struct MedicalRecordAnchor has key, store {
        id: UID,
        record_id: String,
        record_hash: String,
        patient: String,
        created_at: u64,
    }

    /// Emitted so indexers can follow every anchor.
    public struct RecordAnchored has drop {
        record_id: String,
        record_hash: String,
        anchor_id: ID,
    }

    fun init(ctx: &mut TxContext) {
        ctx.share_object(MedicalRecordRegistry {
            id: object::new(ctx),
            anchor_count: 0,
        });
    }

    /// Anchor a SHA-256 digest for a medical record.
    public entry fun anchor_record(
        registry: &mut MedicalRecordRegistry,
        record_id: String,
        record_hash: String,
        patient: String,
        ctx: &mut TxContext,
    ) {
        assert!(!record_id.is_empty(), E_EMPTY_RECORD_ID);
        assert!(record_hash.length() == 64, E_INVALID_HASH);

        registry.anchor_count = registry.anchor_count + 1;

        let anchor = MedicalRecordAnchor {
            id: object::new(ctx),
            record_id,
            record_hash,
            patient,
            created_at: ctx.timestamp(),
        };

        let anchor_id = object::id(&anchor);
        let anchored_record_id = anchor.record_id;
        let anchored_record_hash = anchor.record_hash;

        transfer::share_object(anchor);

        event::emit(RecordAnchored {
            record_id: anchored_record_id,
            record_hash: anchored_record_hash,
            anchor_id,
        });
    }

    /// Read back the digest - the backend compares this with MongoDB (PRD-5).
    public fun record_hash(anchor: &MedicalRecordAnchor): String {
        anchor.record_hash
    }

    public fun record_id(anchor: &MedicalRecordAnchor): String {
        anchor.record_id
    }

    public fun patient(anchor: &MedicalRecordAnchor): String {
        anchor.patient
    }

    public fun created_at(anchor: &MedicalRecordAnchor): u64 {
        anchor.created_at
    }

    public fun anchor_count(registry: &MedicalRecordRegistry): u64 {
        registry.anchor_count
    }

    // --- errors ---------------------------------------------------------------
    const E_EMPTY_RECORD_ID: u64 = 1;
    const E_INVALID_HASH: u64 = 2;
}
