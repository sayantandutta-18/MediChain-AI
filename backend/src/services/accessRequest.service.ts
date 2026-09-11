import mongoose from "mongoose";
import AccessRequest from "../models/AccessRequest.js";

// Doctor creates an access request
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

  // Check if an active request already exists
  const existingRequest = await AccessRequest.findOne({
    doctorId,
    patientId,
    status: { $in: ["PENDING", "APPROVED"] },
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

// Get requests received by a patient
export const getPatientAccessRequests = async (patientId: string) => {
  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    throw new Error("Invalid patient ID");
  }

  return AccessRequest.find({ patientId })
    .populate("doctorId", "name email walletAddress")
    .sort({ createdAt: -1 });
};

// Get requests created by a doctor
export const getDoctorAccessRequests = async (doctorId: string) => {
  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    throw new Error("Invalid doctor ID");
  }

  return AccessRequest.find({ doctorId })
    .populate("patientId", "name email walletAddress")
    .sort({ createdAt: -1 });
};

// Patient approves a request
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

  const request = await AccessRequest.findOne({
    _id: requestId,
    patientId,
  });

  if (!request) {
    throw new Error("Access request not found");
  }

  if (request.status !== "PENDING") {
    throw new Error("Only pending requests can be approved");
  }

  const approvedAt = new Date();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  request.status = "APPROVED";
  request.approvedAt = approvedAt;
  request.expiresAt = expiresAt;

  await request.save();

  return request;
};

// Patient rejects a request
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
    throw new Error("Only pending requests can be rejected");
  }

  request.status = "REJECTED";

  await request.save();

  return request;
};

// Patient revokes approved access
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
    throw new Error("Only approved access can be revoked");
  }

  request.status = "REVOKED";

  await request.save();

  return request;
};