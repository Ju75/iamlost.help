// src/lib/unique-id.ts
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Generate cryptographically secure random ID in ABC123 format
function generateRandomId(): string {
  const letters = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'; //remove I to not confuse with 1
  const numbers = '123456789'; // remove 0 to not confuse with O
  
  let result = '';
  
  // Generate 3 random letters
  for (let i = 0; i < 3; i++) {
    result += letters[Math.floor(Math.random() * letters.length)];
  }
  
  // Generate 3 random numbers  
  for (let i = 0; i < 3; i++) {
    result += numbers[Math.floor(Math.random() * numbers.length)];
  }
  
  return result;
}

// Check if ID has forbidden patterns
function isValidPattern(id: string): boolean {
  const letters = id.substring(0, 3);
  const numbers = id.substring(3, 6);
  
  // Check for all same character
  if (letters[0] === letters[1] && letters[1] === letters[2]) {
    return false; // AAA123 not allowed
  }
  
  if (numbers[0] === numbers[1] && numbers[1] === numbers[2]) {
    return false; // ABC000 not allowed
  }
  
  // Check for letter repetition patterns
  const letterSet = new Set(letters);
  if (letterSet.size < 3) {
    return false; // AAB, ABA, BAA not allowed
  }
  
  // Check for number repetition patterns
  const numberSet = new Set(numbers);
  if (numberSet.size < 3) {
    return false; // 001, 010, 100 not allowed
  }
  
  return true;
}

// Generate encrypted token for secure URLs
function generateEncryptedToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Generate unique ID with collision detection
export async function generateUniqueId(): Promise<{
  displayId: string;
  encryptedToken: string;
}> {
  const maxAttempts = 100; // Prevent infinite loop
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    // Generate random ID
    const displayId = generateRandomId();
    
    // Check if it meets our pattern requirements
    if (!isValidPattern(displayId)) {
      continue;
    }
    
    // Check for collision in database
    const existingId = await prisma.uniqueId.findUnique({
      where: { displayId },
    });
    
    if (!existingId) {
      // Generate encrypted token
      const encryptedToken = generateEncryptedToken();
      
      // Check token collision too (very unlikely but safe)
      const existingToken = await prisma.uniqueId.findUnique({
        where: { encryptedToken },
      });
      
      if (!existingToken) {
        return {
          displayId,
          encryptedToken,
        };
      }
    }
  }
  
  throw new Error('Failed to generate unique ID after maximum attempts');
}

// Get user ID from display ID (for found item forms)
export async function getUserFromDisplayId(displayId: string): Promise<number | null> {
  try {
    // Normalize the input first
    const normalizedId = normalizeDisplayId(displayId);
    
    const uniqueId = await prisma.uniqueId.findUnique({
      where: { displayId: normalizedId },
      select: { userId: true, status: true },
    });
    
    if (!uniqueId || uniqueId.status !== 'ACTIVE') {
      return null;
    }
    
    return uniqueId.userId;
  } catch (error) {
    console.error('Error getting user from display ID:', error);
    return null;
  }
}

// Get user ID from encrypted token (for QR code scans)
export async function getUserFromEncryptedToken(token: string): Promise<number | null> {
  try {
    const uniqueId = await prisma.uniqueId.findUnique({
      where: { encryptedToken: token },
      select: { userId: true, status: true },
    });
    
    if (!uniqueId || uniqueId.status !== 'ACTIVE') {
      return null;
    }
    
    return uniqueId.userId;
  } catch (error) {
    console.error('Error getting user from encrypted token:', error);
    return null;
  }
}

// Generate QR code URL from encrypted token
export function generateQRCodeURL(encryptedToken: string, baseUrl: string = 'https://iamlost.help'): string {
  return `${baseUrl}/found/${encryptedToken}`;
}

// Generate manual entry URL from display ID
export function generateManualURL(displayId: string, baseUrl: string = 'https://iamlost.help'): string {
  return `${baseUrl}/found?id=${displayId}`;
}

// Validate display ID format
export function isValidDisplayId(displayId: string): boolean {
  if (!displayId || displayId.length !== 6) {
    return false;
  }
  
  const pattern = /^[A-Z]{3}[0-9]{3}$/;
  if (!pattern.test(displayId)) {
    return false;
  }
  
  return isValidPattern(displayId);
}

// Get ID statistics (for admin dashboard)
export async function getIdStatistics() {
  try {
    const [totalGenerated, activeIds, inactiveIds] = await Promise.all([
      prisma.uniqueId.count(),
      prisma.uniqueId.count({ where: { status: 'ACTIVE' } }),
      prisma.uniqueId.count({ where: { status: 'INACTIVE' } }),
    ]);
    
    // Calculate theoretical maximum (13,162,500 from our calculations)
    const theoreticalMax = 13162500;
    const utilizationRate = (totalGenerated / theoreticalMax) * 100;
    
    return {
      totalGenerated,
      activeIds,
      inactiveIds,
      theoreticalMax,
      utilizationRate,
      remainingIds: theoreticalMax - totalGenerated,
    };
  } catch (error) {
    console.error('Error getting ID statistics:', error);
    throw error;
  }
}

// For testing purposes - generate multiple IDs
export async function generateTestIds(count: number = 10): Promise<string[]> {
  const ids: string[] = [];
  
  for (let i = 0; i < count; i++) {
    try {
      const { displayId } = await generateUniqueId();
      ids.push(displayId);
    } catch (error) {
      console.error(`Failed to generate test ID ${i + 1}:`, error);
      break;
    }
  }
  
  return ids;
}

// Normalize user input to handle common mistakes
export function normalizeDisplayId(userInput: string): string {
  if (!userInput) return '';
  
  return userInput
    .toUpperCase()              // Convert to uppercase
    .replace(/0/g, 'O')         // Replace 0 with O (since we don't use 0)
    .replace(/1/g, 'I')         // Replace 1 with I if you remove I from letters
    .replace(/[^A-Z0-9]/g, '')  // Remove any non-alphanumeric characters
    .substring(0, 6);           // Limit to 6 characters
}

// Validate and suggest corrections for user input
export function validateAndSuggestId(userInput: string): {
  isValid: boolean;
  normalizedId: string;
  suggestions?: string[];
  errors?: string[];
} {
  const normalizedId = normalizeDisplayId(userInput);
  const errors: string[] = [];
  const suggestions: string[] = [];
  
  if (!normalizedId) {
    errors.push('Please enter an ID');
    return { isValid: false, normalizedId: '', errors };
  }
  
  if (normalizedId.length !== 6) {
    errors.push('ID must be 6 characters long (example: ABC123)');
  }
  
  const pattern = /^[A-Z]{3}[0-9]{3}$/;
  if (!pattern.test(normalizedId)) {
    errors.push('ID format should be 3 letters followed by 3 numbers (example: ABC123)');
  }
  
  // Check if we made corrections
  if (userInput.toUpperCase() !== normalizedId) {
    suggestions.push(`Did you mean: ${normalizedId}?`);
  }
  
  return {
    isValid: errors.length === 0,
    normalizedId,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    errors: errors.length > 0 ? errors : undefined
  };
}


