import { api, authHeader, createDoctor, createPatient, uploadRecord, type TestUser } from '../helpers';

/**
 * Returns the supertest request object (NOT awaited) so `.expect()` chaining
 * keeps working. Deliberately not `async`.
 */
const listNotifications = (user: TestUser, query = '') =>
  api().get(`/api/v1/notifications${query}`).set(authHeader(user));

describe('Feature 02 — Notification Center', () => {
  it('starts with an empty inbox for a brand new account', async () => {
    const patient = await createPatient();
    const response = await listNotifications(patient).expect(200);

    expect(response.body.data.items).toEqual([]);
    expect(response.body.data.pagination.total).toBe(0);
  });

  it('notifies the patient when a doctor requests access', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();

    await api()
      .post('/api/v1/access-requests')
      .set(authHeader(doctor))
      .send({ patientId: patient.id, reason: 'Reviewing my latest blood panel results.' })
      .expect(201);

    const response = await listNotifications(patient).expect(200);

    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0]).toMatchObject({
      type: 'access.requested',
      severity: 'warning',
      read: false,
    });
    expect(response.body.data.items[0].link).toBe('/access-requests');
  });

  it('notifies the doctor on approval and on revocation', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();

    const created = await api()
      .post('/api/v1/access-requests')
      .set(authHeader(doctor))
      .send({ patientId: patient.id, reason: 'Reviewing my latest blood panel results.' })
      .expect(201);

    await api()
      .post(`/api/v1/access-requests/${created.body.data.accessRequest.id}/decision`)
      .set(authHeader(patient))
      .send({ action: 'APPROVE', durationDays: 3 })
      .expect(200);

    const afterApproval = await listNotifications(doctor).expect(200);
    expect(afterApproval.body.data.items[0].type).toBe('access.approved');
    expect(afterApproval.body.data.items[0].severity).toBe('success');

    await api()
      .post(`/api/v1/access-requests/${created.body.data.accessRequest.id}/revoke`)
      .set(authHeader(patient))
      .send({ reason: 'done' })
      .expect(200);

    const afterRevoke = await listNotifications(doctor).expect(200);
    expect(afterRevoke.body.data.items[0].type).toBe('access.revoked');
  });

  it('notifies the patient about a rejection', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();

    const created = await api()
      .post('/api/v1/access-requests')
      .set(authHeader(doctor))
      .send({ patientId: patient.id, reason: 'Reviewing my latest blood panel results.' })
      .expect(201);

    await api()
      .post(`/api/v1/access-requests/${created.body.data.accessRequest.id}/decision`)
      .set(authHeader(patient))
      .send({ action: 'REJECT' })
      .expect(200);

    const inbox = await listNotifications(doctor).expect(200);
    expect(inbox.body.data.items[0].type).toBe('access.rejected');
  });

  it('notifies the patient when a record is uploaded', async () => {
    const patient = await createPatient();
    await uploadRecord(patient, { title: 'Notified Report' });

    const response = await listNotifications(patient).expect(200);
    expect(response.body.data.items[0]).toMatchObject({ type: 'record.uploaded', severity: 'success' });
  });

  it('reports an unread summary for the bell badge', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();

    await api()
      .post('/api/v1/access-requests')
      .set(authHeader(doctor))
      .send({ patientId: patient.id, reason: 'Reviewing my latest blood panel results.' })
      .expect(201);

    const response = await api().get('/api/v1/notifications/summary').set(authHeader(patient)).expect(200);

    expect(response.body.data.summary.unread).toBe(1);
    expect(response.body.data.summary.latest.type).toBe('access.requested');
  });

  it('marks a single notification read and updates the unread count', async () => {
    const patient = await createPatient();
    await uploadRecord(patient);

    const before = await listNotifications(patient).expect(200);
    const id = before.body.data.items[0].id;

    await api().post(`/api/v1/notifications/${id}/read`).set(authHeader(patient)).expect(200);

    const after = await listNotifications(patient, '?unreadOnly=true').expect(200);
    expect(after.body.data.items).toHaveLength(0);
  });

  it('marks everything read at once', async () => {
    const patient = await createPatient();
    await uploadRecord(patient, { title: 'One' });
    await uploadRecord(patient, { title: 'Two' });

    const response = await api().post('/api/v1/notifications/read-all').set(authHeader(patient)).expect(200);
    expect(response.body.data.updated).toBe(2);

    const unread = await listNotifications(patient, '?unreadOnly=true').expect(200);
    expect(unread.body.data.items).toHaveLength(0);
  });

  // --- security: notifications must be strictly per-recipient ---------------
  it('never exposes another user’s notifications', async () => {
    const patient = await createPatient();
    const stranger = await createPatient();
    const doctor = await createDoctor();

    await api()
      .post('/api/v1/access-requests')
      .set(authHeader(doctor))
      .send({ patientId: patient.id, reason: 'Reviewing my latest blood panel results.' })
      .expect(201);

    const strangerInbox = await listNotifications(stranger).expect(200);
    expect(strangerInbox.body.data.items).toEqual([]);

    const strangerSummary = await api()
      .get('/api/v1/notifications/summary')
      .set(authHeader(stranger))
      .expect(200);
    expect(strangerSummary.body.data.summary.unread).toBe(0);
  });

  it('refuses to mark another user’s notification as read', async () => {
    const patient = await createPatient();
    const attacker = await createPatient();
    await uploadRecord(patient);

    const inbox = await listNotifications(patient).expect(200);
    const victimNotificationId = inbox.body.data.items[0].id;

    await api()
      .post(`/api/v1/notifications/${victimNotificationId}/read`)
      .set(authHeader(attacker))
      .expect(404);

    // Confirm it is still unread for the real owner.
    const stillUnread = await listNotifications(patient, '?unreadOnly=true').expect(200);
    expect(stillUnread.body.data.items).toHaveLength(1);
  });

  it('refuses to delete another user’s notification', async () => {
    const patient = await createPatient();
    const attacker = await createPatient();
    await uploadRecord(patient);

    const inbox = await listNotifications(patient).expect(200);
    const victimNotificationId = inbox.body.data.items[0].id;

    await api()
      .delete(`/api/v1/notifications/${victimNotificationId}`)
      .set(authHeader(attacker))
      .expect(404);

    const ownerInbox = await listNotifications(patient).expect(200);
    expect(ownerInbox.body.data.items).toHaveLength(1);
  });

  it('requires authentication', async () => {
    await api().get('/api/v1/notifications').expect(401);
    await api().get('/api/v1/notifications/summary').expect(401);
  });

  it('rejects a malformed notification id', async () => {
    const patient = await createPatient();
    await api().post('/api/v1/notifications/not-a-real-id/read').set(authHeader(patient)).expect(400);
  });

  it('never stores medical content in the notification body', async () => {
    const patient = await createPatient();
    const sensitive = 'Haemoglobin 11.2 g/dL (low) - SECRET MARKER';
    await uploadRecord(patient, { content: sensitive, title: 'CBC' });

    const response = await listNotifications(patient).expect(200);
    const serialised = JSON.stringify(response.body.data.items);
    expect(serialised).not.toContain('SECRET MARKER');
    expect(serialised).not.toContain('11.2');
  });
});