// src/lib/auth.ts - SIMPLIFIED VERSION TO FIX LOGIN
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
  registrationStep?: string;
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

// User login - SIMPLIFIED to ensure it works
export async function loginUser(email: string, password: string): Promise<AuthResult> {
  console.log('🔐 Login attempt for:', email);
  
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
      registrationStep: true,
      passwordHash: true
    }
  });

  if (!user) {
    console.log('❌ User not found:', email);
    throw new Error('Invalid email or password');
  }

  console.log('✅ User found:', user.email, 'Status:', user.status);

  // Allow both ACTIVE and PENDING users to log in
  if (user.status !== 'ACTIVE' && user.status !== 'PENDING') {
    console.log('❌ User status not allowed:', user.status);
    throw new Error('Account is suspended or deleted');
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    console.log('❌ Invalid password for:', email);
    throw new Error('Invalid email or password');
  }

  console.log('✅ Password verified for:', email);

  // Remove password hash from response
  const { passwordHash, ...userWithoutPassword } = user;

  // Generate JWT token
  const token = signToken(user.id);

  console.log('✅ Login successful for:', email);

  return { user: userWithoutPassword, token };
}

// Get user from token - SIMPLIFIED
export async function getUserFromToken(token: string): Promise<User | null> {
  try {
    const decoded = verifyToken(token);
    if (!decoded) return null;

    const user = await prisma.user.findUnique({
      where: { 
        id: decoded.userId,
        status: { in: ['ACTIVE', 'PENDING'] }
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        preferredLanguage: true,
        status: true,
        registrationStep: true
      }
    });

    return user;
  } catch (error) {
    console.error('Error getting user from token:', error);
    return null;
  }
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

// Utility function to generate random tokens
function generateVerificationToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}
