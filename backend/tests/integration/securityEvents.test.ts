import request from 'supertest';
import { api, authHeader, createPatient, loginAs } from '../helpers';
import { SecurityEvent } from '../../src/models/SecurityEvent';

describe('Security Center & Privacy Dashboard API', () => {
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
  describe('GET /api/v1/security/privacy-dashboard', () => {
    it('returns privacy dashboard metrics', async () => {
      const patient = await createPatient();
      await loginAs(patient.email);

      const res = await api()
        .get('/api/v1/security/privacy-dashboard')
        .set(authHeader(patient))
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.activeGrants).toBe(0);
      expect(res.body.data.activeShareLinks).toBe(0);
      expect(res.body.data.recentPrivacyEvents).toBeInstanceOf(Array);
      });

  
});

  describe('POST /api/v1/security/privacy-dashboard/revoke-all', () => {
    it('revokes all access requests and share tokens', async () => {
      const patient = await createPatient();
      await loginAs(patient.email);

      const res = await api()
        .post('/api/v1/security/privacy-dashboard/revoke-all')
        .set(authHeader(patient))
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toMatch(/revoked/i);
      });

  
});
  });

  
  });

  describe('Suspicious Access Detection (Feature 24)', () => {
    it('flags UNAUTHORIZED_ACCESS_ATTEMPT after 5 failed logins from same IP', async () => {
      const patient = await createPatient();
      const ip = '192.168.1.55';

      for (let i = 0; i < 4; i++) {
        await api().post('/api/v1/auth/login').set('X-Forwarded-For', ip).send({ email: patient.email, password: 'wrong' }).expect(401);
      }

      let events = await SecurityEvent.find({ ipAddress: ip, type: 'UNAUTHORIZED_ACCESS_ATTEMPT' });
      expect(events).toHaveLength(0);

      await api().post('/api/v1/auth/login').set('X-Forwarded-For', ip).send({ email: patient.email, password: 'wrong' }).expect(401);

      events = await SecurityEvent.find({ ipAddress: ip, type: 'UNAUTHORIZED_ACCESS_ATTEMPT' });
      expect(events).toHaveLength(1);
      expect(events[0]!.severity).toBe('high');
      expect((events[0]!.details as any).reason).toContain('Brute force');
    });
  });
