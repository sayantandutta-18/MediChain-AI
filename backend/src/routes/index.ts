import { Router } from 'express';
import * as healthController from '../controllers/healthController';
import authRoutes from './authRoutes';
import recordRoutes from './recordRoutes';
import accessRequestRoutes from './accessRequestRoutes';
import auditLogRoutes from './auditLogRoutes';
import aiRoutes from './aiRoutes';

const router = Router();

// TRD-11: fixed API surface so the frontend can generate a reliable client.
router.get('/health', healthController.health);
router.use('/auth', authRoutes);
router.use('/records', recordRoutes);
router.use('/access-requests', accessRequestRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/ai', aiRoutes);

export default router;
