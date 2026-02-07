(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.TimerUtils = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  /**
   * Format milliseconds to time string based on format setting
   * @param {number} ms - Time in milliseconds (can be negative)
   * @param {string} format - 'auto', 'HH:MM:SS', 'MM:SS', or 'SS'
   * @returns {string} Formatted time string
   */
  function formatTime(ms, format) {
    if (format === undefined) format = 'auto';
    var negative = ms < 0;
    var absMs = Math.abs(ms);

    var hours = Math.floor(absMs / 3600000);
    var minutes = Math.floor((absMs % 3600000) / 60000);
    var seconds = Math.floor((absMs % 60000) / 1000);

    var pad = function (n) { return n.toString().padStart(2, '0'); };
    var prefix = negative ? '-' : '';

    switch (format) {
      case 'HH:MM:SS':
        return prefix + pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);

      case 'MM:SS':
        var totalMinutes = hours * 60 + minutes;
        return prefix + pad(totalMinutes) + ':' + pad(seconds);

      case 'SS':
        var totalSeconds = Math.floor(absMs / 1000);
        return prefix + totalSeconds;

      case 'auto':
      default:
        if (hours > 0) {
          return prefix + pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
        } else if (minutes > 0) {
          return prefix + pad(minutes) + ':' + pad(seconds);
        } else {
          return prefix + pad(seconds);
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

    var str = input.trim().toLowerCase();

    // Check for HH:MM:SS or MM:SS format
    if (str.includes(':')) {
      var parts = str.split(':').map(Number);
      if (parts.length === 3) {
        return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
      } else if (parts.length === 2) {
        return (parts[0] * 60 + parts[1]) * 1000;
      }
    }

    // Check for duration notation (1h30m45s)
    var durationMatch = str.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    if (durationMatch && durationMatch[0].length > 0) {
      var hours = durationMatch[1] ? parseInt(durationMatch[1]) : 0;
      var minutes = durationMatch[2] ? parseInt(durationMatch[2]) : 0;
      var seconds = durationMatch[3] ? parseInt(durationMatch[3]) : 0;
      return (hours * 3600 + minutes * 60 + seconds) * 1000;
    }

    // Plain number - treat as seconds
    var num = parseInt(str);
    if (!isNaN(num)) {
      return num * 1000;
    }

    return 0;
  }

  return { formatTime: formatTime, parseDuration: parseDuration };
});
