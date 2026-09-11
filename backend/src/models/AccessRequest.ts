import mongoose, { Document, Schema } from "mongoose";

export interface IAccessRequest extends Document {
  doctorId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;

  status: "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";

  requestedAt: Date;
  approvedAt?: Date;
  expiresAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const accessRequestSchema = new Schema<IAccessRequest>(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    patientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "REVOKED"],
      default: "PENDING",
    },

    requestedAt: {
      type: Date,
      default: Date.now,
    },

    approvedAt: {
      type: Date,
      default: undefined,
    },

    expiresAt: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

const AccessRequest = mongoose.model<IAccessRequest>(
  "AccessRequest",
  accessRequestSchema
);

export default AccessRequest;