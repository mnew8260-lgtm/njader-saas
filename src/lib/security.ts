/**
 * lib/security.ts — Security utilities
 * ================================
 * Rate limiting, CSRF protection, security headers
 */

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_AUTH = 5; // 5 auth attempts per minute per IP

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory rate limiting (replace with Vercel KV in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
      if (entry.resetAt < now) rateLimitStore.delete(key);
    }
  }, 5 * 60 * 1000).unref?.();
}

/**
 * Check rate limit for a key (IP + endpoint)
 */
export function checkRateLimit(key: string, max: number = RATE_LIMIT_MAX_AUTH): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true, remaining: max - 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }

  if (entry.count >= max) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { ok: true, remaining: max - entry.count, resetAt: entry.resetAt };
}

/**
 * Get client IP from request headers
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Validate CSRF token (for state-changing requests)
 * For same-origin requests from logged-in users, the JWT cookie is enough
 * protection against CSRF (httpOnly + sameSite=lax).
 */
export function validateOrigin(req: Request, allowedOrigins: string[] = []): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // Allow same-origin (no Origin header for same-site)
  if (allowedOrigins.length === 0) return true; // Skip check if no allowlist

  return allowedOrigins.some((allowed) => {
    try {
      const a = new URL(allowed);
      const o = new URL(origin);
      return a.host === o.host;
    } catch {
      return false;
    }
  });
}

/**
 * Security headers for all responses
 */
export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};

/**
 * Apply security headers to a response
 */
export function applySecurityHeaders(res: Response): Response {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
}

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') return '';
  return input
    .slice(0, maxLength)
    .replace(/[\u0000-\u001F\u007F]/g, '')  // Remove control chars
    .trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

/**
 * Validate username format (alphanumeric + underscore, 3-30 chars)
 */
export function isValidUsername(username: string): boolean {
  return /^[A-Za-z0-9_]{3,30}$/.test(username);
}

/**
 * Strong password validation (8+ chars, uppercase, lowercase, number, special)
 */
export function isStrongPassword(password: string): { ok: boolean; reason?: string } {
  if (password.length < 8) {
    return { ok: false, reason: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' };
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, reason: 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل' };
  }
  if (!/[a-z]/.test(password)) {
    return { ok: false, reason: 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل' };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, reason: 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    return { ok: false, reason: 'كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (!@#$%^&*)' };
  }
  return { ok: true };
}
