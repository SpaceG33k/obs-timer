/**
 * Sanitize a channel name to only allow safe characters.
 * @param {string} channel - Raw channel name
 * @returns {string|null} Sanitized channel name, or null if invalid
 */
function sanitizeChannel(channel) {
  if (!channel || typeof channel !== 'string') return null;
  const sanitized = channel.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return sanitized || null;
}

module.exports = { sanitizeChannel };
