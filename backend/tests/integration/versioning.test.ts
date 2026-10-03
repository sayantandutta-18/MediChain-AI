import request from 'supertest';
import { api, authHeader, createPatient, uploadRecord } from '../helpers';

describe('Record Versioning API (Feature 10)', () => {
  describe('POST /api/v1/records/:recordId/versions', () => {
    it('allows patient to upload a new version and fetches it', async () => {
      const patient = await createPatient();
      const initialRecord = await uploadRecord(patient, { content: 'Version 1' });
      
      expect(initialRecord.currentVersion).toBe(1);

      // Upload new version
      const newVersionRes = await api()
        .post(`/api/v1/records/${initialRecord.recordId}/versions`)
        .set(authHeader(patient))
        .attach('file', Buffer.from('Version 2', 'utf8'), {
          filename: 'v2.txt',
          contentType: 'text/plain',
        })
        .expect(201);
      
      const updatedRecord = newVersionRes.body.data.record;
      expect(updatedRecord.currentVersion).toBe(2);
      expect(updatedRecord.fileName).toBe('v2.txt');

      // List versions
      const versionsRes = await api()
        .get(`/api/v1/records/${initialRecord.recordId}/versions`)
        .set(authHeader(patient))
        .expect(200);

      const versions = versionsRes.body.data.versions;
      expect(versions).toHaveLength(2);
      expect(versions[0].versionNumber).toBe(2);
      expect(versions[1].versionNumber).toBe(1);

      // Download specific version (v1)
      const downloadV1Res = await api()
        .get(`/api/v1/records/${initialRecord.recordId}/versions/1/download`)
        .set(authHeader(patient))
        .expect(200);
      
      expect(downloadV1Res.text).toBe('Version 1');
      
      // Download specific version (v2)
      const downloadV2Res = await api()
        .get(`/api/v1/records/${initialRecord.recordId}/versions/2/download`)
        .set(authHeader(patient))
        .expect(200);
      
      expect(downloadV2Res.text).toBe('Version 2');
    });
  });
});
