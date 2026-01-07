/**
 * Invite Code Utility Functions
 * 
 * Handles generation and validation of invite codes
 */

// ==========================================
// Constants
// ==========================================

/** Number of codes to generate per user */
export const CODES_PER_USER = 10;

/** Invite code prefix */
const CODE_PREFIX = "AXIS";

// ==========================================
// Functions
// ==========================================

/**
 * Generate a single random invite code
 * Format: AXIS-[USER_PREFIX]-[RANDOM]
 * 
 * @param userId - User ID to use as prefix
 * @returns Invite code string
 */
export function generateInviteCode(userId: string): string {
  const userPrefix = userId.slice(0, 4).toUpperCase();
  const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${CODE_PREFIX}-${userPrefix}-${randomString}`;
}

/**
 * Generate multiple invite codes for a user
 * 
 * @param userId - User ID
 * @param count - Number of codes to generate
 * @returns Array of invite codes
 */
export function generateInviteCodes(userId: string, count: number = CODES_PER_USER): string[] {
  const codes: string[] = [];
  const usedCodes = new Set<string>();

  while (codes.length < count) {
    const code = generateInviteCode(userId);
    
    // Ensure uniqueness
    if (!usedCodes.has(code)) {
      codes.push(code);
      usedCodes.add(code);
    }
  }

  return codes;
}

/**
 * Validate invite code format
 * 
 * @param code - Code to validate
 * @returns True if valid format
 */
export function validateInviteCodeFormat(code: string): boolean {
  const pattern = /^AXIS-[A-Z0-9]{4}-[A-Z0-9]{6}$/;
  return pattern.test(code);
}

/**
 * Extract user prefix from invite code
 * 
 * @param code - Invite code
 * @returns User prefix or null if invalid
 */
export function extractUserPrefix(code: string): string | null {
  if (!validateInviteCodeFormat(code)) {
    return null;
  }

  const parts = code.split('-');
  return parts[1];
}
