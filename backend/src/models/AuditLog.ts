import mongoose, { Document, Schema } from "mongoose";

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId;
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

  recordId?: mongoose.Types.ObjectId;
  patientId?: mongoose.Types.ObjectId;
  doctorId?: mongoose.Types.ObjectId;

  status: "SUCCESS" | "FAILED";

  ipAddress?: string;
  userAgent?: string;

  metadata?: Record<string, any>;

  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    role: {
      type: String,
      enum: ["PATIENT", "DOCTOR", "HOSPITAL", "ADMIN"],
      required: true,
    },

    action: {
      type: String,
      enum: [
        "RECORD_CREATED",
        "RECORD_VIEWED",
        "RECORD_DOWNLOADED",
        "RECORD_UPDATED",
        "RECORD_DELETED",
        "ACCESS_REQUESTED",
        "ACCESS_APPROVED",
        "ACCESS_REJECTED",
        "ACCESS_REVOKED",
      ],
      required: true,
    },

    recordId: {
      type: Schema.Types.ObjectId,
      ref: "MedicalRecord",
    },

    patientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    status: {
      type: String,
      enum: ["SUCCESS", "FAILED"],
      required: true,
    },

    ipAddress: {
      type: String,
    },

    userAgent: {
      type: String,
    },

    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  }
);

// Useful indexes for audit-log queries
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ patientId: 1, createdAt: -1 });
auditLogSchema.index({ doctorId: 1, createdAt: -1 });
auditLogSchema.index({ recordId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

const AuditLog = mongoose.model<IAuditLog>("AuditLog", auditLogSchema);

export default AuditLog;