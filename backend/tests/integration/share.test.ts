import { api, authHeader, createDoctor, createPatient, uploadRecord } from '../helpers';
import { ShareToken } from '../../src/models/ShareToken';

describe('Share API (Feature 04)', () => {
  describe('POST /api/v1/share/generate', () => {
    it('generates a share token for a patient record', async () => {
      const patient = await createPatient();
      const record = await uploadRecord(patient);
      
      const response = await api()
        .post('/api/v1/share/generate')
        .set(authHeader(patient))
        .send({ recordId: record.recordId, durationHours: 48 })
        .expect(200);
      
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.expiresAt).toBeDefined();

      const tokenInDb = await ShareToken.findOne({ token: response.body.data.token });
      expect(tokenInDb).not.toBeNull();
      expect(tokenInDb!.type).toBe('RECORD');
    });

    it('rejects doctors from generating tokens', async () => {
      const doctor = await createDoctor();
      await api().post('/api/v1/share/generate').set(authHeader(doctor)).send({ recordId: '123' }).expect(403);
    });

    it('rejects if patient does not own record', async () => {
      const patient1 = await createPatient();
      const record1 = await uploadRecord(patient1);
      
      const patient2 = await createPatient();
      await api()
        .post('/api/v1/share/generate')
        .set(authHeader(patient2))
        .send({ recordId: record1.recordId })
        .expect(404);
    });
  });

  describe('GET /api/v1/share/access/:token', () => {
    it('allows public access to record metadata with valid token', async () => {
      const patient = await createPatient();
      const record = await uploadRecord(patient);
      
      const shareRes = await api()
        .post('/api/v1/share/generate')
        .set(authHeader(patient))
        .send({ recordId: record.recordId })
        .expect(200);
      
      const token = shareRes.body.data.token;

      const accessRes = await api().get(`/api/v1/share/access/${token}`).expect(200);
      
      expect(accessRes.body.data.patientName).toBe(patient.name);
      expect(accessRes.body.data.record.title).toBe(record.title);
      expect(accessRes.body.data.record.category).toBe(record.category);
    });

    it('allows downloading the record file with valid token', async () => {
      const patient = await createPatient();
      const record = await uploadRecord(patient, { fileName: 'testfile.txt', content: 'secure_content' });
      
      const shareRes = await api()
        .post('/api/v1/share/generate')
        .set(authHeader(patient))
        .send({ recordId: record.recordId })
        .expect(200);
      
      const token = shareRes.body.data.token;

      const downloadRes = await api().get(`/api/v1/share/access/${token}/download`).expect(200);
      
      expect(downloadRes.text).toBe('secure_content');
      expect(downloadRes.headers['content-type']).toContain('text/plain');
      expect(downloadRes.headers['content-disposition']).toContain('filename="testfile.txt"');
    });

    it('rejects expired tokens', async () => {
      const patient = await createPatient();
      const record = await uploadRecord(patient);
      
      const shareRes = await api()
        .post('/api/v1/share/generate')
        .set(authHeader(patient))
        .send({ recordId: record.recordId })
        .expect(200);
      const token = shareRes.body.data.token;

      await ShareToken.updateOne({ token }, { expiresAt: new Date(Date.now() - 1000) });

      await api().get(`/api/v1/share/access/${token}`).expect(403);
    });
  });
});
