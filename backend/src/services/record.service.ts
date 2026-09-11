import mongoose from "mongoose";

import MedicalRecord from "../models/MedicalRecord.js";

import { checkDoctorPatientAccess } from "./accessControl.service.js";

interface CreateRecordData {
  patientId: string;
  title: string;
  type: string;
  date: Date;
  provider?: string;
  hospital?: string;
  summary?: string;
  fileUrl?: string;
  fileHash?: string;

  // Encryption data
  encryptedData?: Buffer;
  iv?: string;
  authTag?: string;
  encrypted?: boolean;
}

// =====================================================
// CREATE MEDICAL RECORD
// =====================================================

export const createMedicalRecord = async (
  data: CreateRecordData
) => {
  const {
    patientId,
    title,
    type,
    date,
    provider,
    hospital,
    summary,
    fileUrl,
    fileHash,
    encryptedData,
    iv,
    authTag,
    encrypted = false,
  } = data;

  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    throw new Error("Invalid patient ID");
  }

  const record = await MedicalRecord.create({
    patientId,
    title,
    type,
    date,
    provider,
    hospital,
    summary,
    fileUrl,
    fileHash,
    encryptedData,
    iv,
    authTag,
    encrypted,
  });

  return record;
};

// =====================================================
// GET MEDICAL RECORD BY ID
// =====================================================

export const getMedicalRecordById = async (
  recordId: string
) => {
  if (!mongoose.Types.ObjectId.isValid(recordId)) {
    throw new Error("Invalid medical record ID");
  }

  const record = await MedicalRecord.findById(recordId);

  return record;
};

// =====================================================
// GET ALL MEDICAL RECORDS FOR PATIENT
// =====================================================

export const getMedicalRecordsByPatient = async (
  patientId: string
) => {
  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    throw new Error("Invalid patient ID");
  }

  const records = await MedicalRecord
    .find({ patientId })
    .select("-encryptedData -iv -authTag")
    .sort({ createdAt: -1 });

  return records;
};

// =====================================================
// GET MEDICAL RECORDS FOR DOCTOR
// =====================================================

export const getMedicalRecordsForDoctor = async (
  doctorId: string,
  patientId: string
) => {
  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    throw new Error("Invalid doctor ID");
  }

  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    throw new Error("Invalid patient ID");
  }

  // Check whether doctor has approved and non-expired access
  const hasAccess = await checkDoctorPatientAccess(
    doctorId,
    patientId
  );

  if (!hasAccess) {
    throw new Error(
      "Doctor does not have valid access to this patient's records"
    );
  }

  const records = await MedicalRecord
    .find({ patientId })
    .select("-encryptedData -iv -authTag")
    .sort({ createdAt: -1 });

  return records;
};

// =====================================================
// UPDATE MEDICAL RECORD
// =====================================================

export const updateMedicalRecord = async (
  recordId: string,
  patientId: string,
  data: {
    title?: string;
    type?: string;
    date?: Date;
    provider?: string;
    hospital?: string;
    summary?: string;
  }
) => {
  if (!mongoose.Types.ObjectId.isValid(recordId)) {
    throw new Error("Invalid medical record ID");
  }

  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    throw new Error("Invalid patient ID");
  }

  const record = await MedicalRecord.findOneAndUpdate(
    {
      _id: recordId,
      patientId: patientId,
    },
    {
      $set: data,
    },
    {
      new: true,
      runValidators: true,
    }
  )
    .select("-encryptedData -iv -authTag");

  return record;
};

// =====================================================
// DELETE MEDICAL RECORD
// =====================================================

export const deleteMedicalRecord = async (
  recordId: string,
  patientId: string
) => {
  if (!mongoose.Types.ObjectId.isValid(recordId)) {
    throw new Error("Invalid medical record ID");
  }

  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    throw new Error("Invalid patient ID");
  }

  const record = await MedicalRecord.findOneAndDelete({
    _id: recordId,
    patientId: patientId,
  });

  return record;
};