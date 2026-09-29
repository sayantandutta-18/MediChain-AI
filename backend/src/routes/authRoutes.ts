import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate, authorize } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { changePasswordSchema, loginSchema, registerSchema, updateProfileSchema } from '../validators/authValidators';

const router = Router();

router.post('/register', authLimiter, validate({ body: registerSchema }), authController.register);
router.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);
router.post('/logout', authenticate, authController.logout);

router.get('/me', authenticate, authController.getMe);
router.patch('/me', authenticate, validate({ body: updateProfileSchema }), authController.updateMe);
router.post('/me/password', authenticate, authLimiter, validate({ body: changePasswordSchema }), authController.changeMyPassword);

router.get('/doctors', authenticate, authorize('patient', 'doctor'), authController.listDoctors);

export default router;
