import mongoose from "mongoose";
import AccessRequest from "../models/AccessRequest.js";

export const checkDoctorPatientAccess = async (
  doctorId: string,
  patientId: string
): Promise<boolean> => {
  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    throw new Error("Invalid doctor ID");
  }

  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    throw new Error("Invalid patient ID");
  }

  const now = new Date();

  const accessRequest = await AccessRequest.findOne({
    doctorId,
    patientId,
    status: "APPROVED",
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: now } },
    ],
  }).lean();

  return !!accessRequest;
};