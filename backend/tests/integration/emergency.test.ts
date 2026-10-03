import { api, authHeader, createDoctor, createPatient } from '../helpers';
import { ShareToken } from '../../src/models/ShareToken';

describe('Emergency API', () => {
  describe('GET /api/v1/emergency', () => {
    it('returns empty profile initially', async () => {
      const patient = await createPatient();
      const response = await api().get('/api/v1/emergency').set(authHeader(patient)).expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.bloodGroup).toBeNull();
      expect(response.body.data.allergies).toEqual([]);
      expect(response.body.data.organDonor).toBe(false);
    });

    it('prevents doctors from having an emergency profile', async () => {
      const doctor = await createDoctor();
      await api().get('/api/v1/emergency').set(authHeader(doctor)).expect(403);
    });
  });

  describe('PUT /api/v1/emergency', () => {
    it('updates emergency profile fields', async () => {
      const patient = await createPatient();
      const response = await api()
        .put('/api/v1/emergency')
        .set(authHeader(patient))
        .send({
          bloodGroup: 'O+',
          allergies: ['Peanuts'],
          organDonor: true,
          emergencyContactName: 'Jane Doe'
        })
        .expect(200);
      
      expect(response.body.data.bloodGroup).toBe('O+');
      expect(response.body.data.allergies).toEqual(['Peanuts']);
      expect(response.body.data.organDonor).toBe(true);
      expect(response.body.data.emergencyContactName).toBe('Jane Doe');
    });
  });

  describe('POST /api/v1/emergency/share', () => {
    it('generates a share token', async () => {
      const patient = await createPatient();
      const response = await api().post('/api/v1/emergency/share').set(authHeader(patient)).expect(200);
      
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.expiresAt).toBeDefined();

      const tokenInDb = await ShareToken.findOne({ token: response.body.data.token });
      expect(tokenInDb).not.toBeNull();
      expect(tokenInDb!.type).toBe('EMERGENCY');
    });
  });

  describe('GET /api/v1/emergency/access/:token', () => {
    it('allows public access with valid token', async () => {
      const patient = await createPatient();
      
      await api()
        .put('/api/v1/emergency')
        .set(authHeader(patient))
        .send({ bloodGroup: 'AB-', organDonor: true })
        .expect(200);

      const shareRes = await api().post('/api/v1/emergency/share').set(authHeader(patient)).expect(200);
      const token = shareRes.body.data.token;

      const accessRes = await api().get(`/api/v1/emergency/access/${token}`).expect(200);
      
      expect(accessRes.body.data.patientName).toBe(patient.name);
      expect(accessRes.body.data.profile.bloodGroup).toBe('AB-');
      expect(accessRes.body.data.profile.organDonor).toBe(true);
    });

    it('rejects expired tokens', async () => {
      const patient = await createPatient();
      const shareRes = await api().post('/api/v1/emergency/share').set(authHeader(patient)).expect(200);
      const token = shareRes.body.data.token;

      await ShareToken.updateOne({ token }, { expiresAt: new Date(Date.now() - 1000) });

      await api().get(`/api/v1/emergency/access/${token}`).expect(403);
    });

    it('rejects revoked tokens', async () => {
      const patient = await createPatient();
      const shareRes = await api().post('/api/v1/emergency/share').set(authHeader(patient)).expect(200);
      const token = shareRes.body.data.token;

      await ShareToken.updateOne({ token }, { isRevoked: true });

      await api().get(`/api/v1/emergency/access/${token}`).expect(403);
    });
  });
});
