import request from 'supertest';
import { createApp } from '../src/app';
import { signAccessToken } from '../src/utils/jwt';
import { User } from '../src/models/User';
import type { AuthenticatedUser, UserRole } from '../src/types';

export const app = createApp();
export const api = () => request(app);

export const uniqueEmail = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 10)}@medichain.test`;

export const PATIENT_PASSWORD = 'Str0ngPass!23';

export interface TestUser {
  id: string;
  role: UserRole;
  email: string;
  name: string;
  token: string;
}

export const createUser = async (
  role: UserRole,
  overrides: Partial<{ name: string; email: string; password: string; specialty: string; hospital: string }> = {},
): Promise<TestUser> => {
  const email = overrides.email ?? uniqueEmail(role);
  const password = overrides.password ?? PATIENT_PASSWORD;

  const response = await api()
    .post('/api/v1/auth/register')
    .send({
      name: overrides.name ?? `Test ${role}`,
      email,
      password,
      role,
      ...(role === 'doctor'
        ? { specialty: overrides.specialty ?? 'Cardiology', hospital: overrides.hospital ?? 'MediChain General' }
        : {}),
    })
    .expect(201);

  return { ...response.body.data.user, token: response.body.data.token } as TestUser;
};

export const createPatient = (overrides?: Parameters<typeof createUser>[1]) =>
  createUser('patient', overrides);
export const createDoctor = (overrides?: Parameters<typeof createUser>[1]) =>
  createUser('doctor', overrides);

export const authHeader = (user: TestUser | AuthenticatedUser) => ({
  Authorization: `Bearer ${'token' in user ? user.token : signAccessToken(user)}`,
});

export const loginAs = async (email: string, password = PATIENT_PASSWORD) => {
  const response = await api().post('/api/v1/auth/login').send({ email, password }).expect(200);
  return { ...response.body.data.user, token: response.body.data.token } as unknown as TestUser;
};

/** Upload a text record for a patient and return the created summary. */
export const uploadRecord = async (
  patient: TestUser,
  overrides: Partial<{ title: string; category: string; description: string; content: string; fileName: string }> = {},
) => {
  const content = overrides.content ?? 'Haemoglobin 13.2 g/dL. WBC 6.1 x10^9/L. Report appears normal.';

  const response = await api()
    .post('/api/v1/records')
    .set(authHeader(patient))
    .field('title', overrides.title ?? 'Complete Blood Count')
    .field('category', overrides.category ?? 'lab-report')
    .field('description', overrides.description ?? 'Routine panel')
    .attach('file', Buffer.from(content, 'utf8'), {
      filename: overrides.fileName ?? 'blood-panel.txt',
      contentType: 'text/plain',
    })
    .expect(201);

  return response.body.data.record;
};

export const findUser = (id: string) => User.findById(id);
