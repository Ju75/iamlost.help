// src/lib/auth.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  preferredLanguage: string;
  status: string;
}

export interface AuthResult {
  user: User;
  token: string;
}

// Password hashing utilities
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// JWT token utilities
export function signToken(userId: number): string {
  if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET environment variable is not set');
  }
  
  return jwt.sign(
    { userId },
    process.env.NEXTAUTH_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    if (!process.env.NEXTAUTH_SECRET) {
      throw new Error('NEXTAUTH_SECRET environment variable is not set');
    }
    
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET) as { userId: number };
    return decoded;
  } catch {
    return null;
  }
}

// User registration
export async function registerUser({
  email,
  password,
  firstName,
  lastName,
  preferredLanguage = 'en'
}: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  preferredLanguage?: string;
}): Promise<AuthResult> {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (existingUser) {
    throw new Error('User already exists with this email');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      preferredLanguage,
      emailVerificationToken: generateVerificationToken()
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      preferredLanguage: true,
      status: true
    }
  });

  // Generate JWT token
  const token = signToken(user.id);

  return { user, token };
}

// User login - FIXED to allow PENDING users
export async function loginUser(email: string, password: string): Promise<AuthResult> {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      preferredLanguage: true,
      status: true,
      passwordHash: true
    }
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // FIXED: Allow both ACTIVE and PENDING users to log in
  // PENDING users need to complete their registration
  if (user.status !== 'ACTIVE' && user.status !== 'PENDING') {
    throw new Error('Account is suspended or deleted');
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  // Remove password hash from response
  const { passwordHash, ...userWithoutPassword } = user;

  // Generate JWT token
  const token = signToken(user.id);

  return { user: userWithoutPassword, token };
}

// Get user from token - FIXED to allow PENDING users
export async function getUserFromToken(token: string): Promise<User | null> {
  const decoded = verifyToken(token);
  if (!decoded) return null;

  const user = await prisma.user.findUnique({
    where: { 
      id: decoded.userId,
      status: { in: ['ACTIVE', 'PENDING'] } // Allow both ACTIVE and PENDING
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      preferredLanguage: true,
      status: true
    }
  });

  return user;
}

// Middleware for protected routes
export async function requireAuth(token?: string): Promise<User> {
  if (!token) {
    throw new Error('Authentication required');
  }

  const user = await getUserFromToken(token);
  if (!user) {
    throw new Error('Invalid or expired token');
  }

  return user;
}

// Change password
export async function changePassword(
  userId: number, 
  currentPassword: string, 
  newPassword: string
): Promise<void> {
  // Get user with current password hash
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isCurrentPasswordValid) {
    throw new Error('Current password is incorrect');
  }

  // Hash new password
  const newPasswordHash = await hashPassword(newPassword);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash }
  });
}

// Password reset token generation
export async function generatePasswordResetToken(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (!user) {
    // Don't reveal that email doesn't exist
    return;
  }

  const resetToken = generateVerificationToken();
  const resetExpires = new Date(Date.now() + 3600000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires
    }
  });

  // TODO: Send email with reset token
  console.log(`Password reset token for ${email}: ${resetToken}`);
}

// Reset password with token
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpires: {
        gt: new Date()
      }
    }
  });

  if (!user) {
    throw new Error('Invalid or expired reset token');
  }

  const newPasswordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newPasswordHash,
      passwordResetToken: null,
      passwordResetExpires: null
    }
  });
}

// Utility function to generate random tokens
function generateVerificationToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Log user activity
export async function logUserActivity(
  userId: number,
  action: string,
  details?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details,
        ipAddress,
        userAgent
      }
    });
  } catch (error) {
    console.error('Failed to log user activity:', error);
  }
}

// Close Prisma connection
export async function closeDatabaseConnection(): Promise<void> {
  await prisma.$disconnect();
}
