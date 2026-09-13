import mongoose from "mongoose";
import AccessRequest from "../models/AccessRequest.js";

// =====================================================
// DOCTOR CREATES AN ACCESS REQUEST
// =====================================================

export const createAccessRequest = async (
  doctorId: string,
  patientId: string
) => {
  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    throw new Error("Invalid doctor ID");
  }

  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    throw new Error("Invalid patient ID");
  }

  // Prevent requesting access to yourself
  if (doctorId === patientId) {
    throw new Error(
      "Doctor cannot request access to their own account"
    );
  }

  // Check if an active request already exists
  const existingRequest = await AccessRequest.findOne({
    doctorId,
    patientId,
    status: {
      $in: ["PENDING", "APPROVED"],
    },
  });

  if (existingRequest) {
    throw new Error("Access request already exists");
  }

  const request = await AccessRequest.create({
    doctorId,
    patientId,
    status: "PENDING",
  });

  return request;
};

// =====================================================
// GET REQUESTS RECEIVED BY A PATIENT
// =====================================================

export const getPatientAccessRequests = async (
  patientId: string
) => {
  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    throw new Error("Invalid patient ID");
  }

  return AccessRequest.find({
    patientId,
  })
    .populate(
      "doctorId",
      "name email walletAddress"
    )
    .sort({
      createdAt: -1,
    });
};

// =====================================================
// GET REQUESTS CREATED BY A DOCTOR
// =====================================================

export const getDoctorAccessRequests = async (
  doctorId: string
) => {
  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    throw new Error("Invalid doctor ID");
  }

  return AccessRequest.find({
    doctorId,
  })
    .populate(
      "patientId",
      "name email walletAddress"
    )
    .sort({
      createdAt: -1,
    });
};

// =====================================================
// PATIENT APPROVES A REQUEST
// =====================================================

export const approveAccessRequest = async (
  requestId: string,
  patientId: string,
  expiryDays: number = 7
) => {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw new Error("Invalid access request ID");
  }

  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    throw new Error("Invalid patient ID");
  }

  // Validate expiry period
  if (
    !Number.isInteger(expiryDays) ||
    expiryDays <= 0
  ) {
    throw new Error(
      "Expiry days must be a positive integer"
    );
  }

  const request = await AccessRequest.findOne({
    _id: requestId,
    patientId,
  });

  if (!request) {
    throw new Error("Access request not found");
  }

  if (request.status !== "PENDING") {
    throw new Error(
      "Only pending requests can be approved"
    );
  }

  const approvedAt = new Date();

  const expiresAt = new Date(approvedAt);
  expiresAt.setDate(
    expiresAt.getDate() + expiryDays
  );

  request.status = "APPROVED";
  request.approvedAt = approvedAt;
  request.expiresAt = expiresAt;

  await request.save();

  return request;
};

// =====================================================
// PATIENT REJECTS A REQUEST
// =====================================================

export const rejectAccessRequest = async (
  requestId: string,
  patientId: string
) => {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw new Error("Invalid access request ID");
  }

  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    throw new Error("Invalid patient ID");
  }

  const request = await AccessRequest.findOne({
    _id: requestId,
    patientId,
  });

  if (!request) {
    throw new Error("Access request not found");
  }

  if (request.status !== "PENDING") {
    throw new Error(
      "Only pending requests can be rejected"
    );
  }

  request.status = "REJECTED";

  await request.save();

  return request;
};

// =====================================================
// PATIENT REVOKES APPROVED ACCESS
// =====================================================

export const revokeAccessRequest = async (
  requestId: string,
  patientId: string
) => {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw new Error("Invalid access request ID");
  }

  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    throw new Error("Invalid patient ID");
  }

  const request = await AccessRequest.findOne({
    _id: requestId,
    patientId,
  });

  if (!request) {
    throw new Error("Access request not found");
  }

  if (request.status !== "APPROVED") {
    throw new Error(
      "Only approved access can be revoked"
    );
  }

  request.status = "REVOKED";

  await request.save();

  return request;
};