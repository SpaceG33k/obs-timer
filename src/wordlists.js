const crypto = require('crypto');

// Word lists for timer name generation (150 each = 2.25M combinations with numbers)
const adjectives = [
  // Speed/Energy
  'swift', 'quick', 'rapid', 'brisk', 'zippy', 'speedy', 'hasty', 'fleet', 'nimble', 'agile',
  // Brightness/Color
  'bright', 'vivid', 'golden', 'silver', 'amber', 'crimson', 'azure', 'coral', 'scarlet', 'indigo',
  'jade', 'violet', 'ruby', 'emerald', 'sapphire', 'ivory', 'pearl', 'onyx', 'bronze', 'copper',
  // Personality
  'bold', 'brave', 'clever', 'witty', 'gentle', 'kind', 'proud', 'noble', 'loyal', 'fierce',
  'eager', 'daring', 'gallant', 'valiant', 'humble', 'honest', 'steady', 'trusty', 'merry', 'jolly',
  // Size/Scale
  'mighty', 'grand', 'epic', 'mega', 'ultra', 'cosmic', 'stellar', 'vast', 'giant', 'tiny',
  'atomic', 'quantum', 'infinite', 'micro', 'macro', 'prime', 'apex', 'chief', 'supreme', 'total',
  // Temperature/Weather
  'warm', 'cool', 'sunny', 'frosty', 'stormy', 'misty', 'breezy', 'icy', 'fiery', 'blazing',
  'arctic', 'tropic', 'balmy', 'crisp', 'foggy', 'windy', 'humid', 'arid', 'polar', 'solar',
  // Tech/Modern
  'cyber', 'neon', 'digital', 'pixel', 'sonic', 'laser', 'plasma', 'nano', 'retro', 'turbo',
  'hyper', 'super', 'alpha', 'beta', 'proto', 'sigma', 'omega', 'gamma', 'theta', 'zeta',
  // Mood/Feeling
  'calm', 'glad', 'happy', 'lucky', 'serene', 'mellow', 'zen', 'chill', 'groovy', 'funky',
  'zesty', 'peppy', 'snappy', 'lively', 'cheerful', 'radiant', 'gleaming', 'glowing', 'shiny', 'glossy',
  // Quality/Character
  'keen', 'wise', 'sharp', 'clear', 'fresh', 'neat', 'pure', 'fair', 'true', 'real',
  'elite', 'ace', 'slick', 'sleek', 'smooth', 'royal', 'regal', 'primal', 'wild', 'free'
];

const nouns = [
  // Animals - Land
  'falcon', 'tiger', 'eagle', 'wolf', 'hawk', 'bear', 'lion', 'fox', 'owl', 'dragon',
  'phoenix', 'raven', 'cobra', 'panther', 'lynx', 'jaguar', 'cheetah', 'leopard', 'cougar', 'puma',
  'badger', 'moose', 'bison', 'elk', 'stag', 'hound', 'mastiff', 'boxer', 'husky', 'collie',
  // Animals - Air/Water
  'crane', 'heron', 'swan', 'condor', 'osprey', 'kite', 'sparrow', 'robin', 'finch', 'wren',
  'shark', 'whale', 'otter', 'seal', 'dolphin', 'marlin', 'barracuda', 'manta', 'orca', 'kraken',
  // Insects/Reptiles
  'mantis', 'hornet', 'wasp', 'beetle', 'spider', 'viper', 'python', 'iguana', 'gecko', 'raptor',
  // Space/Celestial
  'comet', 'nova', 'star', 'moon', 'sun', 'meteor', 'pulsar', 'cosmos', 'galaxy', 'planet',
  'nebula', 'quasar', 'orbit', 'aurora', 'zenith', 'vertex', 'titan', 'atlas', 'helios', 'luna',
  // Nature - Elements
  'storm', 'wave', 'flame', 'frost', 'spark', 'blaze', 'ember', 'inferno', 'glacier', 'tundra',
  'thunder', 'bolt', 'surge', 'geyser', 'torrent', 'rapids', 'cascade', 'current', 'tide', 'gust',
  // Nature - Terrain
  'canyon', 'mesa', 'cliff', 'ridge', 'peak', 'summit', 'valley', 'grove', 'meadow', 'delta',
  'reef', 'lagoon', 'atoll', 'cove', 'fjord', 'oasis', 'dune', 'marsh', 'thicket', 'glade',
  // Abstract/Tech
  'crystal', 'prism', 'nexus', 'pulse', 'matrix', 'cipher', 'vector', 'codec', 'kernel', 'daemon',
  'beacon', 'signal', 'echo', 'vortex', 'horizon', 'photon', 'proton', 'neutron', 'quark', 'flux',
  // Objects/Structures
  'arrow', 'blade', 'shield', 'hammer', 'anvil', 'forge', 'vault', 'tower', 'spire', 'bastion'
];

/**
 * Generate a random timer name using cryptographically secure randomness
 * @returns {string} Timer name in format "adjective-noun-number"
 */
function generateTimerName() {
  const adj = adjectives[crypto.randomInt(adjectives.length)];
  const noun = nouns[crypto.randomInt(nouns.length)];
  const num = crypto.randomInt(100);
  return `${adj}-${noun}-${num}`;
}

module.exports = { generateTimerName };
