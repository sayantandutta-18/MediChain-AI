import mongoose from "mongoose";
import AuditLog from "../models/AuditLog.js";

interface CreateAuditLogData {
  userId: string;
  role: "PATIENT" | "DOCTOR" | "HOSPITAL" | "ADMIN";

  action:
    | "RECORD_CREATED"
    | "RECORD_VIEWED"
    | "RECORD_DOWNLOADED"
    | "RECORD_UPDATED"
    | "RECORD_DELETED"
    | "ACCESS_REQUESTED"
    | "ACCESS_APPROVED"
    | "ACCESS_REJECTED"
    | "ACCESS_REVOKED";

  recordId?: string;
  patientId?: string;
  doctorId?: string;

  status: "SUCCESS" | "FAILED";

  ipAddress?: string;
  userAgent?: string;

  metadata?: Record<string, any>;
}

export const createAuditLog = async (
  data: CreateAuditLogData
) => {
  if (!mongoose.Types.ObjectId.isValid(data.userId)) {
    throw new Error("Invalid user ID");
  }

  if (data.recordId && !mongoose.Types.ObjectId.isValid(data.recordId)) {
    throw new Error("Invalid record ID");
  }

  if (data.patientId && !mongoose.Types.ObjectId.isValid(data.patientId)) {
    throw new Error("Invalid patient ID");
  }

  if (data.doctorId && !mongoose.Types.ObjectId.isValid(data.doctorId)) {
    throw new Error("Invalid doctor ID");
  }

  const auditLog = await AuditLog.create({
    userId: data.userId,
    role: data.role,
    action: data.action,

    recordId: data.recordId,
    patientId: data.patientId,
    doctorId: data.doctorId,

    status: data.status,

    ipAddress: data.ipAddress,
    userAgent: data.userAgent,

    metadata: data.metadata,
  });

  return auditLog;
};


// Get logs related to a particular user
export const getAuditLogsByUser = async (
  userId: string
) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  return AuditLog.find({ userId })
    .sort({ createdAt: -1 });
};


// Get logs related to a patient
export const getAuditLogsByPatient = async (
  patientId: string
) => {
  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    throw new Error("Invalid patient ID");
  }

  return AuditLog.find({ patientId })
    .sort({ createdAt: -1 });
};


// Get logs related to a doctor
export const getAuditLogsByDoctor = async (
  doctorId: string
) => {
  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    throw new Error("Invalid doctor ID");
  }

  return AuditLog.find({ doctorId })
    .sort({ createdAt: -1 });
};


// Get logs related to a medical record
export const getAuditLogsByRecord = async (
  recordId: string
) => {
  if (!mongoose.Types.ObjectId.isValid(recordId)) {
    throw new Error("Invalid record ID");
  }

  return AuditLog.find({ recordId })
    .sort({ createdAt: -1 });
};