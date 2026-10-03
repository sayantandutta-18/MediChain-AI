import request from 'supertest';
import { api, authHeader, createPatient, loginAs } from '../helpers';
import { SecurityEvent } from '../../src/models/SecurityEvent';

describe('Security Center API (Feature 19)', () => {
  describe('GET /api/v1/security/events', () => {
    it('returns a list of security events for the user', async () => {
      const patient = await createPatient();

      // Seed a test event
      await SecurityEvent.create({
        userId: patient.id,
        type: 'LOGIN_FAILED',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest/Test',
        severity: 'medium',
        details: { email: patient.email },
      });

      const res = await api()
        .get('/api/v1/security/events')
        .set(authHeader(patient))
        .expect(200);

      await loginAs(patient.email);

      const res2 = await api().get('/api/v1/security/events').set(authHeader(patient)).expect(200);

      expect(res2.body.success).toBe(true);
      expect(res2.body.data.items).toHaveLength(2);
      
      const types = res2.body.data.items.map((i: any) => i.type);
      expect(types).toContain('LOGIN_FAILED');
    });
  });
});
