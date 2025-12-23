/**
 * Format milliseconds to time string based on format setting
 * @param {number} ms - Time in milliseconds (can be negative)
 * @param {string} format - 'auto', 'HH:MM:SS', 'MM:SS', or 'SS'
 * @returns {string} Formatted time string
 */
function formatTime(ms, format = 'auto') {
  const negative = ms < 0;
  const absMs = Math.abs(ms);

  const hours = Math.floor(absMs / 3600000);
  const minutes = Math.floor((absMs % 3600000) / 60000);
  const seconds = Math.floor((absMs % 60000) / 1000);

  const pad = (n) => n.toString().padStart(2, '0');
  const prefix = negative ? '-' : '';

  switch (format) {
    case 'HH:MM:SS':
      return `${prefix}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

    case 'MM:SS':
      const totalMinutes = hours * 60 + minutes;
      return `${prefix}${pad(totalMinutes)}:${pad(seconds)}`;

    case 'SS':
      const totalSeconds = Math.floor(absMs / 1000);
      return `${prefix}${totalSeconds}`;

    case 'auto':
    default:
      if (hours > 0) {
        return `${prefix}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
      } else if (minutes > 0) {
        return `${prefix}${pad(minutes)}:${pad(seconds)}`;
      } else {
        return `${prefix}${pad(seconds)}`;
      }
  }
}

/**
 * Parse a duration string to milliseconds
 * Supports: "5m", "1h30m", "90s", "1:30", "1:30:00", "5000" (ms)
 * @param {string|number} input - Duration input
 * @returns {number} Duration in milliseconds
 */
function parseDuration(input) {
  if (typeof input === 'number') {
    return input;
  }

  const str = input.trim().toLowerCase();

  // Check for HH:MM:SS or MM:SS format
  if (str.includes(':')) {
    const parts = str.split(':').map(Number);
    if (parts.length === 3) {
      const [h, m, s] = parts;
      return (h * 3600 + m * 60 + s) * 1000;
    } else if (parts.length === 2) {
      const [m, s] = parts;
      return (m * 60 + s) * 1000;
    }
  }

  // Check for duration notation (1h30m45s)
  const hourMatch = str.match(/(\d+)h/);
  const minMatch = str.match(/(\d+)m/);
  const secMatch = str.match(/(\d+)s/);

  if (hourMatch || minMatch || secMatch) {
    const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
    const minutes = minMatch ? parseInt(minMatch[1]) : 0;
    const seconds = secMatch ? parseInt(secMatch[1]) : 0;
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }

  // Plain number - assume milliseconds if > 1000, seconds otherwise
  const num = parseInt(str);
  if (!isNaN(num)) {
    return num >= 1000 ? num : num * 1000;
  }

  return 0;
}

module.exports = {
  formatTime,
  parseDuration
};
