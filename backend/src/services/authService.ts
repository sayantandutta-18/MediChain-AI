import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { User, type IUser } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { signAccessToken } from '../utils/jwt';
import type { AuthenticatedUser, UserRole } from '../types';
import type { ChangePasswordInput, LoginInput, RegisterInput, UpdateProfileInput } from '../validators/authValidators';

export const hashPassword = async (plain: string): Promise<string> =>
  bcrypt.hash(plain, env.bcryptSaltRounds);

export const verifyPassword = async (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);

const toPublicUser = (user: IUser) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  specialty: user.specialty,
  registrationNumber: user.registrationNumber,
  hospital: user.hospital,
  experience: user.experience,
  verificationStatus: user.verificationStatus,
  isActive: user.isActive,
  createdAt: user.createdAt,
  lastLoginAt: user.lastLoginAt,
});

const issueSession = (user: IUser) => {
  const identity: AuthenticatedUser = {
    id: user._id.toString(),
    role: user.role,
    email: user.email,
    name: user.name,
  };
  return { token: signAccessToken(identity), expiresIn: env.jwt.expiresIn, user: toPublicUser(user) };
};

export const registerUser = async (input: RegisterInput) => {
  const existing = await User.exists({ email: input.email });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists.', 'EMAIL_TAKEN');
  }

  const passwordHash = await hashPassword(input.password);

  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role as UserRole,
    ...(input.role === 'doctor'
      ? { specialty: input.specialty, registrationNumber: input.registrationNumber, hospital: input.hospital, experience: input.experience }
      : {}),
  } as Partial<IUser>);

  return issueSession(user);
};

export const loginUser = async (input: LoginInput) => {
  const user = await User.findOne({ email: input.email }).select('+passwordHash +twoFactorSecret');

  // Constant-ish work whether or not the account exists.
  const passwordMatches = user
    ? await verifyPassword(input.password, user.passwordHash)
    : await verifyPassword(input.password, '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin');

  if (!user || !passwordMatches) {
    throw ApiError.unauthorized('Invalid email or password.', 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated.');
  }

  user.lastLoginAt = new Date();
  await user.save();

  
  if (user.isTwoFactorEnabled) {
    if (!(input as any).totpCode) {
      throw ApiError.unauthorized('MFA code required.', 'MFA_REQUIRED');
    }
    const otplib = await import('otplib');
    // @ts-ignore
    const authenticator = otplib.authenticator || otplib.default.authenticator;
    const isValid = authenticator.check((input as any).totpCode, user.twoFactorSecret || '');
    if (!isValid) {
      throw ApiError.unauthorized('Invalid MFA code.', 'INVALID_MFA_CODE');
    }
  }

  return issueSession(user);
};

export const getUserById = async (id: string) => {
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found.', 'USER_NOT_FOUND');
  return user;
};

/** Doctors need a directory entry in order to be discoverable by patients. */
export const listDoctors = async (search?: string) => {
  const filter: Record<string, unknown> = { role: 'doctor', isActive: true };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { specialty: { $regex: search, $options: 'i' } },
      { hospital: { $regex: search, $options: 'i' } },
    ];
  }
  const doctors = await User.find(filter)
    .select('name email specialty registrationNumber hospital experience verificationStatus createdAt')
    .sort({ name: 1 })
    .limit(100)
    .lean<IUser[]>();
  return doctors.map((doc: IUser) => ({
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    specialty: doc.specialty ?? null,
    registrationNumber: doc.registrationNumber ?? null,
    hospital: doc.hospital ?? null,
    experience: doc.experience ?? null,
    verificationStatus: doc.verificationStatus ?? null,
  }));
};

export const updateProfile = async (userId: string, input: UpdateProfileInput) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found.', 'USER_NOT_FOUND');

  if (input.name !== undefined) user.name = input.name;
  if (user.role === 'doctor') {
    if (input.specialty !== undefined) user.specialty = input.specialty;
    if (input.registrationNumber !== undefined) user.registrationNumber = input.registrationNumber;
    if (input.hospital !== undefined) user.hospital = input.hospital;
    if (input.experience !== undefined) user.experience = input.experience;
  }

  await user.save();
  return toPublicUser(user);
};

export const changePassword = async (userId: string, input: ChangePasswordInput) => {
  const user = await User.findById(userId).select('+passwordHash +twoFactorSecret');
  if (!user) throw ApiError.notFound('User not found.', 'USER_NOT_FOUND');

  const matches = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!matches) {
    throw ApiError.badRequest('The current password is incorrect.', 'INVALID_CURRENT_PASSWORD');
  }

  user.passwordHash = await hashPassword(input.newPassword);
  await user.save();
  return issueSession(user);
};

export const me = async (userId: string) => toPublicUser(await getUserById(userId));
