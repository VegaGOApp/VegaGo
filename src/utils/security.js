/**
 * Basic security utilities for VegaGO
 */

/**
 * Sanitizes a string to prevent basic XSS and injection.
 * Removes HTML tags and trims whitespace.
 */
export const sanitizeInput = (text) => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<[^>]*>?/gm, '') // Remove HTML tags
    .trim()
    .substring(0, 200); // Limit length for security and storage
};

/**
 * Validates and sanitizes a URL.
 * Only allows http and https protocols.
 */
export const sanitizeUrl = (url) => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return url;
    }
    return '';
  } catch (e) {
    return '';
  }
};
