// @ts-nocheck
/**
 * Simraungadh — Security Utility Module
 * Input sanitization, validation, rate limiting, and XSS prevention
 */

// ====== INPUT SANITIZATION ======

/** Strip HTML tags and dangerous characters from user input */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/** Sanitize text for display (prevents XSS in rendered content) */
export function sanitizeForDisplay(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ====== EMAIL VALIDATION ======

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return EMAIL_REGEX.test(email.trim());
}

// ====== PHONE VALIDATION ======

const NEPAL_PHONE_REGEX = /^(98|97|96|01|02|03|04|05|06|07|08|09)\d{6,8}$/;

export function isValidNepalPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return NEPAL_PHONE_REGEX.test(cleaned);
}

// ====== PASSWORD STRENGTH ======

export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordValidation {
  isValid: boolean;
  strength: PasswordStrength;
  score: number; // 0-4
  errors: string[];
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];
  let score = 0;

  if (password.length < 8) {
    errors.push('Must be at least 8 characters');
  } else {
    score++;
  }

  if (password.length >= 12) score++;

  if (!/[A-Z]/.test(password)) {
    errors.push('Include at least one uppercase letter');
  } else {
    score++;
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Include at least one number');
  } else {
    score++;
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"|,.<>?\/`~]/.test(password)) {
    errors.push('Include a special character (!@#$%...)');
  }

  const strength: PasswordStrength =
    score <= 1 ? 'weak' :
    score === 2 ? 'fair' :
    score === 3 ? 'good' : 'strong';

  return {
    isValid: errors.length === 0 && password.length >= 8,
    strength,
    score: Math.min(score, 4),
    errors,
  };
}

export function getPasswordStrengthColor(strength: PasswordStrength): string {
  switch (strength) {
    case 'weak': return '#ef4444';
    case 'fair': return '#f59e0b';
    case 'good': return '#3b82f6';
    case 'strong': return '#10b981';
  }
}

export function getPasswordStrengthLabel(strength: PasswordStrength): string {
  switch (strength) {
    case 'weak': return 'Weak';
    case 'fair': return 'Fair';
    case 'good': return 'Good';
    case 'strong': return 'Strong 🔒';
  }
}

// ====== RATE LIMITER ======

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

const rateLimitStore: Record<string, RateLimitEntry> = {};

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 1000; // 30 seconds

export function checkRateLimit(key: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = rateLimitStore[key];

  if (!entry) {
    rateLimitStore[key] = { attempts: 1, firstAttempt: now, lockedUntil: null };
    return { allowed: true, retryAfterMs: 0 };
  }

  // Check if currently locked out
  if (entry.lockedUntil && now < entry.lockedUntil) {
    return { allowed: false, retryAfterMs: entry.lockedUntil - now };
  }

  // Reset if window has passed
  if (now - entry.firstAttempt > RATE_LIMIT_WINDOW) {
    rateLimitStore[key] = { attempts: 1, firstAttempt: now, lockedUntil: null };
    return { allowed: true, retryAfterMs: 0 };
  }

  entry.attempts++;

  if (entry.attempts > MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_DURATION;
    return { allowed: false, retryAfterMs: LOCKOUT_DURATION };
  }

  return { allowed: true, retryAfterMs: 0 };
}

export function resetRateLimit(key: string): void {
  delete rateLimitStore[key];
}

// ====== WARD VALIDATION ======

export function isValidWard(ward: string | number): boolean {
  const num = typeof ward === 'string' ? parseInt(ward, 10) : ward;
  return !isNaN(num) && num >= 1 && num <= 11;
}

// ====== FILE VALIDATION ======

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function validateImageFile(file: { uri: string; type?: string; fileSize?: number }): { valid: boolean; error?: string } {
  if (file.type && !ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    return { valid: false, error: 'Only JPG, PNG, and WebP images are allowed' };
  }

  if (file.fileSize && file.fileSize > MAX_FILE_SIZE) {
    return { valid: false, error: 'Image must be less than 10MB' };
  }

  return { valid: true };
}

// ====== CONTENT MODERATION ======

const BLOCKED_PATTERNS = [
  /\b(hack|exploit|injection|xss|sql\s*inject)\b/gi,
];

export function isContentSafe(content: string): boolean {
  if (!content) return true;
  return !BLOCKED_PATTERNS.some(pattern => pattern.test(content));
}


