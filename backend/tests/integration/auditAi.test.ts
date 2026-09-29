import { api, authHeader, createDoctor, createPatient, uploadRecord } from '../helpers';

describe('Audit trail (TRD-10)', () => {
  it('records authentication events', async () => {
    const patient = await createPatient();

    const response = await api().get('/api/v1/audit-logs').set(authHeader(patient)).expect(200);
    const actions = response.body.data.items.map((item: { action: string }) => item.action);

    expect(actions).toContain('auth.register');
  });

  it('records record upload, view and download events', async () => {
    const patient = await createPatient();
    const record = await uploadRecord(patient);

    await api().get(`/api/v1/records/${record.recordId}`).set(authHeader(patient)).expect(200);
    await api().get(`/api/v1/records/${record.recordId}/download`).set(authHeader(patient)).expect(200);
    await api().get(`/api/v1/records/${record.recordId}/verify`).set(authHeader(patient)).expect(200);

    const response = await api().get('/api/v1/audit-logs?limit=100').set(authHeader(patient)).expect(200);
    const actions = response.body.data.items.map((item: { action: string }) => item.action);

    expect(actions).toEqual(expect.arrayContaining(['record.upload', 'record.view', 'record.download', 'record.verify']));
  });

  it('records the access request lifecycle', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();

    const created = await api()
      .post('/api/v1/access-requests')
      .set(authHeader(doctor))
      .send({ patientId: patient.id, reason: 'Checking recovery progress after surgery.' })
      .expect(201);

    await api()
      .post(`/api/v1/access-requests/${created.body.data.accessRequest.id}/decision`)
      .set(authHeader(patient))
      .send({ action: 'APPROVE', durationDays: 7 })
      .expect(200);

    const doctorLog = await api().get('/api/v1/audit-logs?limit=100').set(authHeader(doctor)).expect(200);
    const patientLog = await api().get('/api/v1/audit-logs?limit=100').set(authHeader(patient)).expect(200);

    expect(doctorLog.body.data.items.map((i: { action: string }) => i.action)).toContain('access.request');
    expect(patientLog.body.data.items.map((i: { action: string }) => i.action)).toContain('access.approve');
  });

  it('records denied access attempts with FAILURE', async () => {
    const patient = await createPatient();
    const attacker = await createPatient();
    const record = await uploadRecord(patient);

    await api().get(`/api/v1/records/${record.recordId}`).set(authHeader(attacker)).expect(403);

    const response = await api().get('/api/v1/audit-logs?result=FAILURE').set(authHeader(attacker)).expect(200);

    expect(response.body.data.items.length).toBeGreaterThan(0);
    expect(response.body.data.items.every((item: { result: string }) => item.result === 'FAILURE')).toBe(true);
  });

  it('never returns another actor’s audit trail', async () => {
    const patient = await createPatient();
    const other = await createPatient();
    await uploadRecord(patient, { title: 'Confidential' });

    const response = await api().get('/api/v1/audit-logs?limit=100').set(authHeader(other)).expect(200);

    // `other` only ever sees their own events - never the patient's uploads.
    const resourceIds = response.body.data.items.map((item: { resourceId: string | null }) => item.resourceId);
    const actions = response.body.data.items.map((item: { action: string }) => item.action);

    expect(resourceIds.every((id: string | null) => id === null)).toBe(true);
    expect(actions).not.toContain('record.upload');
    expect(actions).toEqual(['auth.register']);
  });

  it('requires authentication', async () => {
    const response = await api().get('/api/v1/audit-logs').expect(401);
    expect(response.body.error.code).toBe('TOKEN_MISSING');
  });

  it('supports filtering by action', async () => {
    const patient = await createPatient();
    await uploadRecord(patient);

    const response = await api().get('/api/v1/audit-logs?action=record.upload').set(authHeader(patient)).expect(200);

    expect(response.body.data.items.length).toBeGreaterThan(0);
    expect(response.body.data.items.every((item: { action: string }) => item.action === 'record.upload')).toBe(true);
  });
});

describe('AI module (TRD-15)', () => {
  it('returns a controlled 503 when the provider is not configured', async () => {
    const patient = await createPatient();
    const record = await uploadRecord(patient);

    const response = await api()
      .post('/api/v1/ai/analyze')
      .set(authHeader(patient))
      .send({ recordId: record.recordId })
      .expect(503);

    expect(response.body.error.code).toBe('AI_NOT_CONFIGURED');
    expect(response.body.error.message).toMatch(/not configured/i);
  });

  it('reports AI configuration status', async () => {
    const patient = await createPatient();
    const response = await api().get('/api/v1/ai/status').set(authHeader(patient)).expect(200);

    expect(response.body.data.ai.configured).toBe(false);
  });

  it('requires authentication', async () => {
    await api().post('/api/v1/ai/analyze').send({ recordId: 'med_abc123' }).expect(401);
  });

  it('validates the request body before calling the provider', async () => {
    const patient = await createPatient();
    await api().post('/api/v1/ai/analyze').set(authHeader(patient)).send({}).expect(400);
  });

  it('does not let a doctor analyze a record they are not approved for', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();
    const record = await uploadRecord(patient);

    await api()
      .post('/api/v1/ai/analyze')
      .set(authHeader(doctor))
      .send({ recordId: record.recordId })
      .expect(403);
  });
});

describe('Health endpoint (TRD-19)', () => {
  it('reports dependency status', async () => {
    const response = await api().get('/api/v1/health').expect(200);

    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.dependencies.database.connected).toBe(true);
    expect(response.body.data.dependencies.blockchain.network).toBe('testnet');
  });
});

describe('Unknown routes', () => {
  it('returns a structured 404', async () => {
    const response = await api().get('/api/v1/does-not-exist').expect(404);
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});
