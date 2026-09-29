import { api, authHeader, createDoctor, createPatient, uploadRecord } from '../helpers';
import { AccessRequest } from '../../src/models/AccessRequest';

const requestAccess = async (doctor: Awaited<ReturnType<typeof createDoctor>>, patientId: string, reason = 'Reviewing my latest blood panel results.') => {
  const response = await api()
    .post('/api/v1/access-requests')
    .set(authHeader(doctor))
    .send({ patientId, reason })
    .expect(201);
  return response.body.data.accessRequest;
};

const decide = async (
  patient: Awaited<ReturnType<typeof createPatient>>,
  requestId: string,
  body: Record<string, unknown> = { action: 'APPROVE', durationDays: 7 },
) => {
  const response = await api()
    .post(`/api/v1/access-requests/${requestId}/decision`)
    .set(authHeader(patient))
    .send(body)
    .expect(200);
  return response.body.data.accessRequest;
};

describe('Access request lifecycle (TRD-9)', () => {
  it('runs PENDING -> APPROVED with a time bounded expiry', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();

    const created = await requestAccess(doctor, patient.id);
    expect(created.status).toBe('PENDING');
    expect(created.doctor.id).toBe(doctor.id);
    expect(created.patient.id).toBe(patient.id);

    const approved = await decide(patient, created.id, { action: 'APPROVE', durationDays: 3 });
    expect(approved.status).toBe('APPROVED');
    expect(approved.expiresAt).toBeTruthy();
    expect(new Date(approved.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(approved.expired).toBe(false);
  });

  it('runs PENDING -> REJECTED', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();

    const created = await requestAccess(doctor, patient.id);
    const rejected = await decide(patient, created.id, { action: 'REJECT', decisionNote: 'Not relevant' });

    expect(rejected.status).toBe('REJECTED');
    expect(rejected.decisionNote).toBe('Not relevant');
  });

  it('revokes an approved grant', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();

    const created = await requestAccess(doctor, patient.id);
    await decide(patient, created.id);

    const response = await api()
      .post(`/api/v1/access-requests/${created.id}/revoke`)
      .set(authHeader(patient))
      .send({ reason: 'Treatment completed' })
      .expect(200);

    expect(response.body.data.accessRequest.status).toBe('REVOKED');
    expect(response.body.data.accessRequest.revokedAt).toBeTruthy();
  });

  it('only allows a patient to decide their own request', async () => {
    const patient = await createPatient();
    const otherPatient = await createPatient();
    const doctor = await createDoctor();

    const created = await requestAccess(doctor, patient.id);

    const response = await api()
      .post(`/api/v1/access-requests/${created.id}/decision`)
      .set(authHeader(otherPatient))
      .send({ action: 'APPROVE', durationDays: 5 })
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects a second decision on an already decided request (409)', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();

    const created = await requestAccess(doctor, patient.id);
    await decide(patient, created.id);

    const response = await api()
      .post(`/api/v1/access-requests/${created.id}/decision`)
      .set(authHeader(patient))
      .send({ action: 'REJECT' })
      .expect(409);

    expect(response.body.error.code).toBe('REQUEST_ALREADY_DECIDED');
  });

  it('rejects a duplicate open request (409)', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();

    await requestAccess(doctor, patient.id);
    const response = await api()
      .post('/api/v1/access-requests')
      .set(authHeader(doctor))
      .send({ patientId: patient.id, reason: 'Asking a second time for the same thing.' })
      .expect(409);

    expect(response.body.error.code).toBe('ACCESS_REQUEST_EXISTS');
  });

  it('denies request creation to patients', async () => {
    const patient = await createPatient();
    const other = await createPatient();

    await api()
      .post('/api/v1/access-requests')
      .set(authHeader(patient))
      .send({ patientId: other.id, reason: 'I would like to see your records please.' })
      .expect(403);
  });

  it('rejects a request to an unknown patient', async () => {
    const doctor = await createDoctor();
    await api()
      .post('/api/v1/access-requests')
      .set(authHeader(doctor))
      .send({ patientId: '507f1f77bcf86cd799439011', reason: 'A valid length reason here.' })
      .expect(404);
  });

  it('rejects a request that targets a doctor', async () => {
    const doctor = await createDoctor();
    const otherDoctor = await createDoctor();

    await api()
      .post('/api/v1/access-requests')
      .set(authHeader(doctor))
      .send({ patientId: otherDoctor.id, reason: 'I would like to see your records please.' })
      .expect(400);
  });

  it('requires a meaningful reason', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();

    await api()
      .post('/api/v1/access-requests')
      .set(authHeader(doctor))
      .send({ patientId: patient.id, reason: 'short' })
      .expect(400);
  });

  it('requires durationDays in order to approve', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();

    const created = await requestAccess(doctor, patient.id);
    await api()
      .post(`/api/v1/access-requests/${created.id}/decision`)
      .set(authHeader(patient))
      .send({ action: 'APPROVE' })
      .expect(400);
  });

  it('cannot revoke a request that is not approved', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();

    const created = await requestAccess(doctor, patient.id);
    await api()
      .post(`/api/v1/access-requests/${created.id}/revoke`)
      .set(authHeader(patient))
      .send({})
      .expect(409);
  });
});

describe('Access request visibility', () => {
  it('shows the inbox to the patient and the outbox to the doctor', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();
    const created = await requestAccess(doctor, patient.id);

    const inbox = await api().get('/api/v1/access-requests').set(authHeader(patient)).expect(200);
    const outbox = await api().get('/api/v1/access-requests').set(authHeader(doctor)).expect(200);

    expect(inbox.body.data.items).toHaveLength(1);
    expect(inbox.body.data.items[0].id).toBe(created.id);
    expect(outbox.body.data.items).toHaveLength(1);
  });

  it('never leaks another patient’s requests', async () => {
    const patient = await createPatient();
    const stranger = await createPatient();
    const doctor = await createDoctor();
    await requestAccess(doctor, patient.id);

    const response = await api().get('/api/v1/access-requests').set(authHeader(stranger)).expect(200);
    expect(response.body.data.items).toHaveLength(0);
  });

  it('lists approved relationships on both sides', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();
    const created = await requestAccess(doctor, patient.id);
    await decide(patient, created.id);

    const doctorView = await api().get('/api/v1/access-requests/relationships').set(authHeader(doctor)).expect(200);
    const patientView = await api().get('/api/v1/access-requests/relationships').set(authHeader(patient)).expect(200);

    expect(doctorView.body.data.relationships).toHaveLength(1);
    expect(doctorView.body.data.relationships[0].patient.id).toBe(patient.id);
    expect(patientView.body.data.relationships[0].doctor.id).toBe(doctor.id);
  });

  it('reports access statistics', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();
    const created = await requestAccess(doctor, patient.id);
    await decide(patient, created.id);

    const response = await api().get('/api/v1/access-requests/stats').set(authHeader(patient)).expect(200);

    expect(response.body.data.stats.approved).toBe(1);
    expect(response.body.data.stats.pending).toBe(0);
  });
});

describe('Consent driven record access (PRD-4)', () => {
  it('denies a doctor before the patient approves (pending request -> 403)', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();
    const record = await uploadRecord(patient);

    await requestAccess(doctor, patient.id);

    const response = await api()
      .get(`/api/v1/records/${record.recordId}`)
      .set(authHeader(doctor))
      .expect(403);

    expect(response.body.error.details.code).toBe('ACCESS_PENDING');
  });

  it('denies a doctor who never requested access (403)', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();
    const record = await uploadRecord(patient);

    const response = await api()
      .get(`/api/v1/records/${record.recordId}`)
      .set(authHeader(doctor))
      .expect(403);

    expect(response.body.error.details.code).toBe('NO_ACCESS');
  });

  it('grants a doctor access after an unexpired approval', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();
    const record = await uploadRecord(patient);
    const created = await requestAccess(doctor, patient.id);
    await decide(patient, created.id, { action: 'APPROVE', durationDays: 7 });

    const response = await api()
      .get(`/api/v1/records/${record.recordId}`)
      .set(authHeader(doctor))
      .expect(200);

    expect(response.body.data.record.recordId).toBe(record.recordId);
  });

  it('denies the doctor once access is revoked (403)', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();
    const record = await uploadRecord(patient);
    const created = await requestAccess(doctor, patient.id);
    await decide(patient, created.id);

    await api().post(`/api/v1/access-requests/${created.id}/revoke`).set(authHeader(patient)).send({}).expect(200);

    await api().get(`/api/v1/records/${record.recordId}`).set(authHeader(doctor)).expect(403);
  });

  it('denies the doctor once the approval has expired (403)', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();
    const record = await uploadRecord(patient);
    const created = await requestAccess(doctor, patient.id);
    await decide(patient, created.id, { action: 'APPROVE', durationDays: 5 });

    // Fast-forward past the expiry.
    await AccessRequest.updateOne(
      { _id: created.id },
      { $set: { expiresAt: new Date(Date.now() - 60_000) } },
    );

    const response = await api()
      .get(`/api/v1/records/${record.recordId}`)
      .set(authHeader(doctor))
      .expect(403);

    expect(response.body.error.details.code).toBe('ACCESS_EXPIRED');
  });

  it('denies the doctor once access is rejected (403)', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();
    const record = await uploadRecord(patient);
    const created = await requestAccess(doctor, patient.id);
    await decide(patient, created.id, { action: 'REJECT' });

    await api().get(`/api/v1/records/${record.recordId}`).set(authHeader(doctor)).expect(403);
  });

  it('denies download, list and verify for an unapproved doctor', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();
    const record = await uploadRecord(patient);

    await api().get(`/api/v1/records/${record.recordId}/download`).set(authHeader(doctor)).expect(403);
    await api().get(`/api/v1/records/${record.recordId}/verify`).set(authHeader(doctor)).expect(403);

    const list = await api().get('/api/v1/records').set(authHeader(doctor)).expect(200);
    expect(list.body.data.items).toHaveLength(0);
  });

  it('shows approved records in the doctor list', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();
    await uploadRecord(patient, { title: 'Shared report' });
    const created = await requestAccess(doctor, patient.id);
    await decide(patient, created.id);

    const list = await api().get('/api/v1/records').set(authHeader(doctor)).expect(200);

    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.items[0].title).toBe('Shared report');
  });

  it('denies doctor update and delete of patient records (403)', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();
    const record = await uploadRecord(patient);
    const created = await requestAccess(doctor, patient.id);
    await decide(patient, created.id);

    const update = await api()
      .patch(`/api/v1/records/${record.recordId}`)
      .set(authHeader(doctor))
      .send({ title: 'Doctor edited this' })
      .expect(403);

    const removal = await api()
      .delete(`/api/v1/records/${record.recordId}`)
      .set(authHeader(doctor))
      .expect(403);

    expect(update.body.error.code).toBe('FORBIDDEN');
    expect(removal.body.error.code).toBe('FORBIDDEN');
  });

  it('does not let one approved doctor inherit another doctor’s access', async () => {
    const patient = await createPatient();
    const approvedDoctor = await createDoctor();
    const otherDoctor = await createDoctor();
    const record = await uploadRecord(patient);

    const created = await requestAccess(approvedDoctor, patient.id);
    await decide(patient, created.id);

    await api().get(`/api/v1/records/${record.recordId}`).set(authHeader(otherDoctor)).expect(403);
  });
});
