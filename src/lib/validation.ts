// src/lib/validation.ts
import Joi from 'joi';

// User registration validation
export const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot be longer than 100 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'Password is required'
    }),
  
  firstName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .allow('')
    .messages({
      'string.max': 'First name cannot be longer than 50 characters'
    }),
  
  lastName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Last name cannot be longer than 50 characters'
    }),
  
  preferredLanguage: Joi.string()
    .valid('en', 'fr', 'es', 'de', 'it', 'pt', 'nl', 'ja', 'ko')
    .default('en')
    .optional()
});

// User login validation
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

// Change password validation
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),
  
  newPassword: Joi.string()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.max': 'New password cannot be longer than 100 characters',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'New password is required'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required'
    })
});

// Password reset request validation
export const resetRequestSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email is required'
    })
});

// Password reset validation
export const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Reset token is required'
    }),
  
  newPassword: Joi.string()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot be longer than 100 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'Password is required'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required'
    })
});

// Profile update validation
export const updateProfileSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .allow('')
    .messages({
      'string.max': 'First name cannot be longer than 50 characters'
    }),
  
  lastName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Last name cannot be longer than 50 characters'
    }),
  
  phone: Joi.string()
    .pattern(/^\+?[\d\s\-\(\)]{10,20}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Please enter a valid phone number'
    }),
  
  preferredLanguage: Joi.string()
    .valid('en', 'fr', 'es', 'de', 'it', 'pt', 'nl', 'ja', 'ko')
    .optional(),
  
  timezone: Joi.string()
    .optional()
});

// Helper function to validate data
export function validateData<T>(schema: Joi.ObjectSchema, data: any): {
  isValid: boolean;
  data?: T;
  error?: string;
} {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details[0]?.message || 'Validation error';
    return {
      isValid: false,
      error: errorMessage
    };
  }

  return {
    isValid: true,
    data: value as T
  };
}

// Rate limiting validation
export const rateLimitSchema = Joi.object({
  ipAddress: Joi.string().ip().required(),
  endpoint: Joi.string().required(),
  maxAttempts: Joi.number().integer().min(1).default(5),
  windowMinutes: Joi.number().integer().min(1).default(15)
});

// Common validation patterns
export const patterns = {
  // Strong password: at least 8 chars, 1 upper, 1 lower, 1 number
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  
  // Phone number: international format
  phoneNumber: /^\+?[\d\s\-\(\)]{10,20}$/,
  
  // Name: letters, spaces, hyphens, apostrophes
  name: /^[a-zA-Z\s\-']{1,50}$/,
  
  // Unique ID format: ABC123
  uniqueId: /^[A-Z]{3}[0-9]{3}$/,
  
  // Email: standard email validation
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
};
