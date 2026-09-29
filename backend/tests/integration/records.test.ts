import { api, authHeader, createDoctor, createPatient, uploadRecord } from '../helpers';
import { MedicalRecord } from '../../src/models/MedicalRecord';
import { sha256 } from '../../src/utils/hash';

describe('POST /api/v1/records (upload pipeline, TRD-5)', () => {
  it('encrypts, hashes, stores and anchors a record', async () => {
    const patient = await createPatient();
    const content = 'Blood glucose 92 mg/dL - within normal range.';

    const record = await uploadRecord(patient, { content });

    // SHA-256 of the *plaintext* file, stored in MongoDB (TRD-7)
    expect(record.fileHash).toBe(sha256(content));
    expect(record.fileHash).toHaveLength(64);
    // The digest, never the document, is anchored
    expect(record.blockchain.onChainHash).toBe(record.fileHash);
    expect(record.blockchain.status).toMatch(/ANCHORED|SIMULATED/);
    expect(record.blockchain.objectId).toBeTruthy();

    // The stored blob is ciphertext
    const stored = await MedicalRecord.findOne({ recordId: record.recordId }).select('+encryptedFile');
    expect(stored!.encryptedFile.data).not.toContain('glucose');
    expect(stored!.encryptedFile.algorithm).toBe('aes-256-gcm');
  });

  it('requires an authenticated patient', async () => {
    await api()
      .post('/api/v1/records')
      .field('title', 'Anonymous upload')
      .attach('file', Buffer.from('data'), { filename: 'a.txt', contentType: 'text/plain' })
      .expect(401);
  });

  it('denies upload to doctor accounts', async () => {
    const doctor = await createDoctor();
    const response = await api()
      .post('/api/v1/records')
      .set(authHeader(doctor))
      .field('title', 'Doctor upload')
      .attach('file', Buffer.from('data'), { filename: 'a.txt', contentType: 'text/plain' })
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects an unsupported file type', async () => {
    const patient = await createPatient();
    const response = await api()
      .post('/api/v1/records')
      .set(authHeader(patient))
      .field('title', 'Executable upload')
      .attach('file', Buffer.from('MZ'), { filename: 'evil.exe', contentType: 'application/x-msdownload' })
      .expect(415);

    expect(response.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('rejects a missing file', async () => {
    const patient = await createPatient();
    await api()
      .post('/api/v1/records')
      .set(authHeader(patient))
      .field('title', 'No file here')
      .expect(400);
  });

  it('rejects a title that is too short', async () => {
    const patient = await createPatient();
    await api()
      .post('/api/v1/records')
      .set(authHeader(patient))
      .field('title', 'x')
      .attach('file', Buffer.from('data'), { filename: 'a.txt', contentType: 'text/plain' })
      .expect(400);
  });
});

describe('GET /api/v1/records', () => {
  it('lists only the caller’s own records for a patient', async () => {
    const mine = await createPatient();
    const other = await createPatient();

    await uploadRecord(mine, { title: 'Mine A' });
    await uploadRecord(mine, { title: 'Mine B' });
    await uploadRecord(other, { title: 'Theirs' });

    const response = await api().get('/api/v1/records').set(authHeader(mine)).expect(200);

    expect(response.body.data.items).toHaveLength(2);
    expect(response.body.data.items.map((r: { title: string }) => r.title).sort()).toEqual(['Mine A', 'Mine B']);
    expect(response.body.data.pagination.total).toBe(2);
  });

  it('returns an empty list when the patient has no records', async () => {
    const patient = await createPatient();
    const response = await api().get('/api/v1/records').set(authHeader(patient)).expect(200);

    expect(response.body.data.items).toEqual([]);
  });

  it('supports search and category filters', async () => {
    const patient = await createPatient();
    await uploadRecord(patient, { title: 'Lipid Panel', category: 'lab-report' });
    await uploadRecord(patient, { title: 'Chest X-Ray', category: 'imaging' });

    const response = await api()
      .get('/api/v1/records?category=imaging')
      .set(authHeader(patient))
      .expect(200);

    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].title).toBe('Chest X-Ray');
  });

  it('rejects an out-of-range limit', async () => {
    const patient = await createPatient();
    await api().get('/api/v1/records?limit=9999').set(authHeader(patient)).expect(400);
  });
});

describe('GET /api/v1/records/:recordId', () => {
  it('returns the record for the owner', async () => {
    const patient = await createPatient();
    const record = await uploadRecord(patient);

    const response = await api().get(`/api/v1/records/${record.recordId}`).set(authHeader(patient)).expect(200);

    expect(response.body.data.record.recordId).toBe(record.recordId);
    expect(response.body.data.record.patient.id).toBe(patient.id);
  });

  it('returns 404 for an unknown record id', async () => {
    const patient = await createPatient();
    await api().get('/api/v1/records/med_doesnotexist1234').set(authHeader(patient)).expect(404);
  });

  it('returns 403 when a patient requests another patient’s record (cross-patient isolation)', async () => {
    const owner = await createPatient();
    const attacker = await createPatient();
    const record = await uploadRecord(owner);

    const response = await api()
      .get(`/api/v1/records/${record.recordId}`)
      .set(authHeader(attacker))
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});

describe('GET /api/v1/records/:recordId/download', () => {
  it('returns the decrypted original file to the owner', async () => {
    const patient = await createPatient();
    const content = 'Potassium 4.1 mmol/L - normal.';
    const record = await uploadRecord(patient, { content, fileName: 'electrolytes.txt' });

    const response = await api()
      .get(`/api/v1/records/${record.recordId}/download`)
      .set(authHeader(patient))
      .expect(200);

    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.headers['content-disposition']).toContain('electrolytes.txt');
    expect(response.text ?? response.body.toString()).toBe(content);
  });

  it('denies download to another patient', async () => {
    const owner = await createPatient();
    const attacker = await createPatient();
    const record = await uploadRecord(owner);

    await api()
      .get(`/api/v1/records/${record.recordId}/download`)
      .set(authHeader(attacker))
      .expect(403);
  });
});

describe('PATCH / DELETE /api/v1/records/:recordId', () => {
  it('lets the owner update metadata', async () => {
    const patient = await createPatient();
    const record = await uploadRecord(patient);

    const response = await api()
      .patch(`/api/v1/records/${record.recordId}`)
      .set(authHeader(patient))
      .send({ title: 'Renamed report', description: 'Updated description' })
      .expect(200);

    expect(response.body.data.record.title).toBe('Renamed report');
  });

  it('lets the owner delete the record', async () => {
    const patient = await createPatient();
    const record = await uploadRecord(patient);

    await api().delete(`/api/v1/records/${record.recordId}`).set(authHeader(patient)).expect(200);
    await api().get(`/api/v1/records/${record.recordId}`).set(authHeader(patient)).expect(404);
  });

  it('denies deletion by another patient', async () => {
    const owner = await createPatient();
    const attacker = await createPatient();
    const record = await uploadRecord(owner);

    await api().delete(`/api/v1/records/${record.recordId}`).set(authHeader(attacker)).expect(403);
  });

  it('rejects an update with no fields', async () => {
    const patient = await createPatient();
    const record = await uploadRecord(patient);

    await api().patch(`/api/v1/records/${record.recordId}`).set(authHeader(patient)).send({}).expect(400);
  });
});

describe('GET /api/v1/records/:recordId/verify (PRD-5)', () => {
  it('reports a matching hash', async () => {
    const patient = await createPatient();
    const record = await uploadRecord(patient);

    const response = await api()
      .get(`/api/v1/records/${record.recordId}/verify`)
      .set(authHeader(patient))
      .expect(200);

    expect(response.body.data.verification.mongoHash).toBe(record.fileHash);
    expect(response.body.data.verification.status).toMatch(/VERIFIED|SIMULATED|UNAVAILABLE/);
  });

  it('reports a MISMATCH when the stored hash is altered', async () => {
    const patient = await createPatient();
    const record = await uploadRecord(patient);

    await MedicalRecord.updateOne({ recordId: record.recordId }, { $set: { fileHash: 'b'.repeat(64) } });

    const response = await api()
      .get(`/api/v1/records/${record.recordId}/verify`)
      .set(authHeader(patient))
      .expect(200);

    expect(response.body.data.verification.status).toBe('MISMATCH');
    expect(response.body.data.verification.match).toBe(false);
  });

  it('denies verification to another patient', async () => {
    const owner = await createPatient();
    const attacker = await createPatient();
    const record = await uploadRecord(owner);

    await api()
      .get(`/api/v1/records/${record.recordId}/verify`)
      .set(authHeader(attacker))
      .expect(403);
  });
});

describe('GET /api/v1/records/stats', () => {
  it('summarises the caller’s records', async () => {
    const patient = await createPatient();
    await uploadRecord(patient, { category: 'lab-report' });
    await uploadRecord(patient, { category: 'imaging' });

    const response = await api().get('/api/v1/records/stats').set(authHeader(patient)).expect(200);

    expect(response.body.data.stats.total).toBe(2);
    expect(response.body.data.stats.anchored).toBe(2);
    expect(response.body.data.stats.categories).toHaveLength(2);
  });
});

describe('CORS policy (TRD-16)', () => {
  it('allows a same-origin write that arrived through a reverse proxy', async () => {
    // Browsers send Origin on every non-GET request, even same-origin ones, so a
    // proxied deployment (nginx -> /api) must not be broken by that.
    const response = await api()
      .post('/api/v1/auth/login')
      .set('Origin', 'https://records.medichain.example')
      .set('X-Forwarded-Host', 'records.medichain.example')
      .send({ email: 'nobody@example.com', password: 'Str0ngPass!23' });

    expect(response.status).toBe(401);
    expect(response.headers['access-control-allow-origin']).toBe('https://records.medichain.example');
  });

  it('allows an explicitly configured origin', async () => {
    const response = await api()
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({ email: 'nobody@example.com', password: 'Str0ngPass!23' });

    expect(response.status).toBe(401);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('rejects a disallowed cross-origin write with 403, never 500', async () => {
    const response = await api()
      .post('/api/v1/auth/login')
      .set('Origin', 'https://evil.example')
      .set('X-Forwarded-Host', 'records.medichain.example')
      .send({ email: 'nobody@example.com', password: 'Str0ngPass!23' })
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(JSON.stringify(response.body.error.details)).toContain('CORS_ORIGIN_DENIED');
  });

  it('never echoes a disallowed origin back', async () => {
    const response = await api()
      .post('/api/v1/auth/login')
      .set('Origin', 'https://evil.example')
      .set('X-Forwarded-Host', 'records.medichain.example')
      .send({ email: 'nobody@example.com', password: 'Str0ngPass!23' });

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
