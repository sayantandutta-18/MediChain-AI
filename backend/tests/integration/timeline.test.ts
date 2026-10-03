import request from 'supertest';
import { api, authHeader, createPatient, uploadRecord } from '../helpers';

describe('Medical Timeline API (Feature 05)', () => {
  describe('GET /api/v1/records/timeline', () => {
    it('returns chronological events across multiple records and versions', async () => {
      const patient = await createPatient();
      
      const record1 = await uploadRecord(patient, { title: 'First Upload', content: 'v1 text' });
      const record2 = await uploadRecord(patient, { title: 'Second Upload', content: 'another text' });
      
      // Upload a new version for record1
      await api()
        .post(`/api/v1/records/${record1.recordId}/versions`)
        .set(authHeader(patient))
        .attach('file', Buffer.from('v2 text', 'utf8'), {
          filename: 'v2.txt',
          contentType: 'text/plain',
        })
        .expect(201);
        
      const res = await api()
        .get('/api/v1/records/timeline')
        .set(authHeader(patient))
        .expect(200);
        
      const timeline = res.body.data.timeline;
      
      expect(timeline).toHaveLength(3);
      
      // The newest should be the updated version of record1
      expect(timeline[0].type).toBe('UPDATED');
      expect(timeline[0].versionNumber).toBe(2);
      expect(timeline[0].title).toBe('First Upload');
      
      // The other two should be CREATED types
      const types = timeline.slice(1).map((t: any) => t.type);
      expect(types).toEqual(['CREATED', 'CREATED']);
    });
  });
});
