module medichain_contract::medical_records;

use sui::clock::{Self, Clock};
use sui::object::{Self, UID};
use sui::transfer;
use sui::tx_context::{Self, TxContext};

public struct MedicalRecordAnchor has key, store {
    id: UID,
    record_id: vector<u8>,
    record_hash: vector<u8>,
    patient: address,
    created_at: u64,
}

public fun create_record_anchor(
    record_id: vector<u8>,
    record_hash: vector<u8>,
    patient: address,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let anchor = MedicalRecordAnchor {
        id: object::new(ctx),
        record_id,
        record_hash,
        patient,
        created_at: clock::timestamp_ms(clock),
    };

    transfer::public_transfer(anchor, patient);
}

public fun record_id(anchor: &MedicalRecordAnchor): &vector<u8> {
    &anchor.record_id
}

public fun record_hash(anchor: &MedicalRecordAnchor): &vector<u8> {
    &anchor.record_hash
}

public fun patient(anchor: &MedicalRecordAnchor): address {
    anchor.patient
}

public fun created_at(anchor: &MedicalRecordAnchor): u64 {
    anchor.created_at
}