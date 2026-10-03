import { api, authHeader, createDoctor, createPatient, PATIENT_PASSWORD, uniqueEmail } from '../helpers';

describe('POST /api/v1/auth/register', () => {
  it('registers a patient and returns a session', async () => {
    const email = uniqueEmail('patient');

    const response = await api()
      .post('/api/v1/auth/register')
      .send({ name: 'Ada Lovelace', email, password: PATIENT_PASSWORD, role: 'patient' })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(response.body.data.user).toMatchObject({ email, role: 'patient', name: 'Ada Lovelace' });
    expect(response.body.data.user.passwordHash).toBeUndefined();
  });

  it('registers a doctor with a specialty', async () => {
    const response = await api()
      .post('/api/v1/auth/register')
      .send({
        name: 'Dr House',
        email: uniqueEmail('doctor'),
        password: PATIENT_PASSWORD,
        role: 'doctor',
        specialty: 'Nephrology',
      })
      .expect(201);

    expect(response.body.data.user.specialty).toBe('Nephrology');
  });

  it('rejects a duplicate email with 409', async () => {
    const email = uniqueEmail('patient');
    const payload = { name: 'First', email, password: PATIENT_PASSWORD, role: 'patient' };

    await api().post('/api/v1/auth/register').send(payload).expect(201);
    const response = await api().post('/api/v1/auth/register').send(payload).expect(409);

    expect(response.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('rejects a weak password with 400', async () => {
    const response = await api()
      .post('/api/v1/auth/register')
      .send({ name: 'Weak', email: uniqueEmail('weak'), password: 'password', role: 'patient' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a malformed email', async () => {
    await api()
      .post('/api/v1/auth/register')
      .send({ name: 'Bad Email', email: 'not-an-email', password: PATIENT_PASSWORD, role: 'patient' })
      .expect(400);
  });

  it('requires a specialty for doctor accounts', async () => {
    const response = await api()
      .post('/api/v1/auth/register')
      .send({ name: 'No Specialty', email: uniqueEmail('doctor'), password: PATIENT_PASSWORD, role: 'doctor' })
      .expect(400);

    expect(JSON.stringify(response.body.error.details)).toContain('specialty');
  });

  it('rejects unknown roles', async () => {
    await api()
      .post('/api/v1/auth/register')
      .send({ name: 'Admin', email: uniqueEmail('admin'), password: PATIENT_PASSWORD, role: 'invalid_role' })
      .expect(400);
  });
});

describe('POST /api/v1/auth/login', () => {
  it('signs in with correct credentials', async () => {
    const patient = await createPatient();

    const response = await api()
      .post('/api/v1/auth/login')
      .send({ email: patient.email, password: PATIENT_PASSWORD })
      .expect(200);

    expect(response.body.data.token).toEqual(expect.any(String));
    expect(response.body.data.user.role).toBe('patient');
  });

  it('returns 401 for a wrong password', async () => {
    const patient = await createPatient();
    const response = await api()
      .post('/api/v1/auth/login')
      .send({ email: patient.email, password: 'Wr0ngPassword!' })
      .expect(401);

    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 for an unknown account', async () => {
    await api()
      .post('/api/v1/auth/login')
      .send({ email: uniqueEmail('ghost'), password: PATIENT_PASSWORD })
      .expect(401);
  });

  it('returns 401 for an invalid JWT', async () => {
    const response = await api()
      .get('/api/v1/auth/me')
      .set({ Authorization: 'Bearer not.a.real.token' })
      .expect(401);

    expect(response.body.error.code).toBe('INVALID_TOKEN');
  });

  it('returns 401 when the token is missing', async () => {
    const response = await api().get('/api/v1/auth/me').expect(401);
    expect(response.body.error.code).toBe('TOKEN_MISSING');
  });
});

describe('GET/PATCH /api/v1/auth/me', () => {
  it('returns the authenticated profile', async () => {
    const patient = await createPatient({ name: 'Grace Hopper' });
    const response = await api().get('/api/v1/auth/me').set(authHeader(patient)).expect(200);

    expect(response.body.data.user).toMatchObject({ id: patient.id, name: 'Grace Hopper' });
  });

  it('updates the profile', async () => {
    const doctor = await createDoctor();

    const response = await api()
      .patch('/api/v1/auth/me')
      .set(authHeader(doctor))
      .send({ hospital: 'New Teaching Hospital' })
      .expect(200);

    expect(response.body.data.user.hospital).toBe('New Teaching Hospital');
  });

  it('changes the password and issues a new token', async () => {
    const patient = await createPatient();
    const newPassword = 'Even5tronger!';

    await api()
      .post('/api/v1/auth/me/password')
      .set(authHeader(patient))
      .send({ currentPassword: PATIENT_PASSWORD, newPassword })
      .expect(200);

    await api()
      .post('/api/v1/auth/login')
      .send({ email: patient.email, password: newPassword })
      .expect(200);

    await api()
      .post('/api/v1/auth/login')
      .send({ email: patient.email, password: PATIENT_PASSWORD })
      .expect(401);
  });

  it('rejects a password change with the wrong current password', async () => {
    const patient = await createPatient();
    await api()
      .post('/api/v1/auth/me/password')
      .set(authHeader(patient))
      .send({ currentPassword: 'nope-not-it', newPassword: 'Even5tronger!' })
      .expect(400);
  });
});

describe('GET /api/v1/auth/doctors', () => {
  it('lists doctors for patients to request access from', async () => {
    const patient = await createPatient();
    await createDoctor({ name: 'Dr Maya', specialty: 'Neurology' });

    const response = await api().get('/api/v1/auth/doctors').set(authHeader(patient)).expect(200);

    expect(response.body.data.doctors).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Dr Maya', specialty: 'Neurology' })]),
    );
  });
});
