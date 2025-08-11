import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '@/lib/auth';
import { validateData } from '@/lib/validation';
import Joi from 'joi';

const prisma = new PrismaClient();

// Enhanced registration schema
const enhancedRegisterSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  emailConfirmation: Joi.string().valid(Joi.ref('email')).required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
  firstName: Joi.string().trim().max(50).required(),
  lastName: Joi.string().trim().max(50).required(),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]{10,20}$/).optional().allow(''),
  address: Joi.string().max(200).optional().allow(''),
  city: Joi.string().max(100).optional().allow(''),
  postalCode: Joi.string().max(20).optional().allow(''),
  country: Joi.string().length(2).default('FR'),
  preferredLanguage: Joi.string().valid('en', 'fr', 'es', 'de', 'it').default('en'),
  agreeToTerms: Joi.boolean().valid(true).required(),
  marketingConsent: Joi.boolean().default(false)
});

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 POST endpoint called');
    
    const body = await request.json();
    console.log('📝 Request body received:', Object.keys(body));
    
    // Validate input
    const validation = validateData(enhancedRegisterSchema, body);
    if (!validation.isValid) {
      console.log('❌ Validation failed:', validation.error);
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      postalCode,
      country,
      password,
      preferredLanguage,
      marketingConsent
    } = validation.data!;

    console.log('✅ Data validated, checking for existing user...');

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      console.log('❌ User already exists:', email);
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);
    console.log('🔐 Password hashed');

    // Get UTM parameters from headers
    const utmSource = request.headers.get('utm-source') || 'direct';
    const utmMedium = request.headers.get('utm-medium');
    const utmCampaign = request.headers.get('utm-campaign');

    // Generate verification token
    const emailVerificationToken = Math.random().toString(36).substring(2, 15) + 
                                  Math.random().toString(36).substring(2, 15);

    console.log('💾 Creating user in database...');

    // Create user with PENDING status
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        phone: phone || null,
        address: address || null,
        city: city || null,
        postalCode: postalCode || null,
        country: country || 'FR',
        preferredLanguage: preferredLanguage || 'en',
        status: 'PENDING',
        registrationStep: 'INFO_COLLECTED',
        reminderCount: 0,
        statusChangedAt: new Date(),
        utmSource,
        utmMedium,
        utmCampaign,
        emailVerificationToken,
        emailVerified: false
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        registrationStep: true
      }
    });

    console.log('✅ User created with ID:', user.id);

    // Log the registration start
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REGISTRATION_STEP1_COMPLETED',
        resourceType: 'User',
        resourceId: user.id,
        details: JSON.stringify({
          step: 'INFO_COLLECTED',
          hasPhone: !!phone,
          hasAddress: !!address,
          marketingConsent,
          utmSource
        }),
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });

    console.log(`✅ User registration step 1 completed: ${user.email} (ID: ${user.id})`);

    return NextResponse.json({
      success: true,
      userId: user.id,
      message: 'Information saved successfully',
      nextStep: 'plan-selection'
    });

  } catch (error: any) {
    console.error('❌ Register step 1 error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save information' },
      { status: 500 }
    );
  }
}
