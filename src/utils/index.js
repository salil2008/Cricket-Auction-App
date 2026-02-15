// ============================================
// CURRENCY FORMATTING
// ============================================

/**
 * Format a number as Indian currency (₹)
 * @param {number} amount - Amount to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, options = {}) {
  const {
    symbol = '₹',
    compact = false,
    showSymbol = true
  } = options;
  
  if (amount === null || amount === undefined) return '-';
  
  if (compact) {
    // Format in lakhs/crores
    if (amount >= 10000000) {
      return `${showSymbol ? symbol : ''}${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `${showSymbol ? symbol : ''}${(amount / 100000).toFixed(2)} L`;
    } else if (amount >= 1000) {
      return `${showSymbol ? symbol : ''}${(amount / 1000).toFixed(1)}K`;
    }
  }
  
  // Indian number formatting
  const formatted = new Intl.NumberFormat('en-IN').format(amount);
  return showSymbol ? `${symbol}${formatted}` : formatted;
}

/**
 * Parse a currency string to number
 * @param {string} value - Currency string to parse
 * @returns {number} Parsed number
 */
export function parseCurrency(value) {
  if (!value) return 0;
  // Remove currency symbol and commas
  const cleaned = value.toString().replace(/[₹,\s]/g, '');
  return parseInt(cleaned, 10) || 0;
}

// ============================================
// CSV PARSING
// ============================================

/**
 * Map role values from CSV to app format
 * Preserves Batting All-Rounder and Bowling All-Rounder as distinct roles
 */
function mapRole(csvRole) {
  const roleMap = {
    'batting all-rounder': 'Batting All-Rounder',
    'batting allrounder': 'Batting All-Rounder',
    'bat all-rounder': 'Batting All-Rounder',
    'bowling all-rounder': 'Bowling All-Rounder',
    'bowling allrounder': 'Bowling All-Rounder',
    'bowl all-rounder': 'Bowling All-Rounder',
    'all-rounder': 'All-Rounder',
    'allrounder': 'All-Rounder',
    'batsman': 'Batsman',
    'batter': 'Batsman',
    'bowler': 'Bowler',
    'wicket keeper': 'Wicket-keeper',
    'wicket-keeper': 'Wicket-keeper',
    'wicketkeeper': 'Wicket-keeper',
    'wk': 'Wicket-keeper',
    'keeper': 'Wicket-keeper'
  };
  
  const normalized = (csvRole || '').toLowerCase().trim();
  return roleMap[normalized] || 'All-Rounder';
}

/**
 * Parse "30s/50s/100s" format to individual values
 * @param {string} value - Format like "19/2/0"
 * @returns {object} { thirties, fifties, hundreds }
 */
function parseMilestones(value) {
  if (!value || value === '-') {
    return { thirties: 0, fifties: 0, hundreds: 0 };
  }
  
  const parts = value.split('/').map(p => parseInt(p.trim()) || 0);
  return {
    thirties: parts[0] || 0,
    fifties: parts[1] || 0,
    hundreds: parts[2] || 0
  };
}

/**
 * Parse CSV text to array of objects
 * Supports both standard format and BWPL format
 * @param {string} csvText - CSV content
 * @returns {array} Array of player objects
 */
export function parsePlayerCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\r/g, ''));
  const players = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;
    
    const player = {
      stats: {}
    };
    
    headers.forEach((header, index) => {
      const value = (values[index] || '').trim().replace(/\r/g, '');
      
      // Map CSV columns to player fields
      switch (header) {
        // Name mappings
        case 'name':
        case 'full name':
        case 'fullname':
        case 'player name':
        case 'playername':
          player.name = value;
          break;
        
        // Role mappings
        case 'role':
        case 'preferred skill':
        case 'preferredskill':
        case 'skill':
        case 'type':
          player.role = mapRole(value);
          // Store original role for reference
          player.originalRole = value;
          break;
        
        // Style mappings
        case 'batting_style':
        case 'battingstyle':
        case 'batting style':
          player.battingStyle = value || 'Right-hand bat';
          break;
        
        case 'bowling_style':
        case 'bowlingstyle':
        case 'bowling style':
          player.bowlingStyle = value || '-';
          break;
        
        // Tier mapping
        case 'tier':
        case 'category':
          // Map tier values to standard format (s-class, a-class, etc.)
          const tierValue = value?.toLowerCase().trim();
          const tierMap = {
            's': 's-class', 's-class': 's-class', 'sclass': 's-class', 'elite': 's-class',
            'a': 'a-class', 'a-class': 'a-class', 'aclass': 'a-class',
            'b': 'b-class', 'b-class': 'b-class', 'bclass': 'b-class',
            'c': 'c-class', 'c-class': 'c-class', 'cclass': 'c-class',
            'd': 'd-class', 'd-class': 'd-class', 'dclass': 'd-class', 'regular': 'd-class'
          };
          player.tier = tierMap[tierValue] || 'c-class'; // Default to C-class
          break;
        
        // Basic stats
        case 'matches':
        case 'match':
        case 'games':
          player.stats.matches = parseInt(value) || 0;
          break;
        
        case 'runs':
        case 'total runs':
          player.stats.runs = parseInt(value) || 0;
          break;
        
        // Batting stats
        case 'average':
        case 'avg':
        case 'bat avg':
        case 'batting avg':
        case 'batting average':
          player.stats.average = parseFloat(value) || 0;
          break;
        
        case 'strike_rate':
        case 'strikerate':
        case 'sr':
        case 'bat sr':
        case 'batting sr':
        case 'batting strike rate':
          player.stats.strikeRate = parseFloat(value) || 0;
          break;
        
        case 'highest_score':
        case 'highestscore':
        case 'hs':
        case 'highest':
          player.stats.highestScore = parseInt(value) || 0;
          break;
        
        // Milestones - separate fields
        case 'fifties':
        case '50s':
          player.stats.fifties = parseInt(value) || 0;
          break;
        
        case 'hundreds':
        case '100s':
          player.stats.hundreds = parseInt(value) || 0;
          break;
        
        case 'thirties':
        case '30s':
          player.stats.thirties = parseInt(value) || 0;
          break;
        
        // Combined milestones format: "30s/50s/100s"
        case '30s/50s/100s':
        case 'milestones':
          const milestones = parseMilestones(value);
          player.stats.thirties = milestones.thirties;
          player.stats.fifties = milestones.fifties;
          player.stats.hundreds = milestones.hundreds;
          break;
        
        // Bowling stats
        case 'wickets':
        case 'wkts':
          player.stats.wickets = parseInt(value) || 0;
          break;
        
        case 'economy':
        case 'econ':
        case 'eco':
          player.stats.economy = parseFloat(value) || 0;
          break;
        
        case 'bowl sr':
        case 'bowling sr':
        case 'bowling_strike_rate':
        case 'bowlingstrikerate':
        case 'bowling strike rate':
          player.stats.bowlingStrikeRate = parseFloat(value) || 0;
          break;
        
        case 'bowl avg':
        case 'bowling avg':
        case 'bowling_average':
        case 'bowlingaverage':
        case 'bowling average':
          player.stats.bowlingAverage = parseFloat(value) || 0;
          break;
        
        // Fielding stats
        case 'dismissals':
        case 'catches':
        case 'ct':
          player.stats.dismissals = parseInt(value) || 0;
          break;
        
        // ID for photo matching
        case 'id':
        case 'player_id':
        case 'playerid':
          player.externalId = value; // Store for photo matching
          break;
        
        // Photo
        case 'photo':
        case 'photo_url':
        case 'image':
          player.photo = value;
          break;
        
        // Notes
        case 'notes':
        case 'comments':
          player.notes = value;
          break;
        
        default:
          break;
      }
    });
    
    // Set defaults if not provided
    if (!player.battingStyle) {
      player.battingStyle = 'Right-hand bat';
    }
    if (!player.bowlingStyle) {
      // Infer bowling style from role
      const roleLower = player.role?.toLowerCase() || '';
      if (roleLower === 'bowler' || roleLower.includes('bowling all-rounder')) {
        player.bowlingStyle = 'Right-arm medium';
      } else {
        player.bowlingStyle = '-';
      }
    }
    if (!player.tier) {
      player.tier = 'c-class';
    }
    
    if (player.name) {
      players.push(player);
    }
  }
  
  return players;
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  
  return values;
}

/**
 * Generate CSV template for player import (BWPL format)
 */
export function generatePlayerCSVTemplate() {
  const headers = [
    'Full Name',
    'Preferred Skill',
    'Tier',
    'Matches',
    'Runs',
    'Bat Avg',
    'Bat SR',
    '30s/50s/100s',
    'Wickets',
    'Eco',
    'Bowl SR',
    'Bowl Avg',
    'Dismissals',
    'id'
  ];
  
  const exampleRows = [
    [
      'Rahul Sharma',
      'Batting All-Rounder',
      'A',
      '45',
      '1250',
      '32.5',
      '128.5',
      '8/5/1',
      '12',
      '7.2',
      '24.5',
      '28.3',
      '15',
      '00001'
    ],
    [
      'Vijay Kumar',
      'Bowler',
      'B',
      '38',
      '120',
      '8.5',
      '75.0',
      '0/0/0',
      '52',
      '6.8',
      '18.2',
      '20.5',
      '8',
      '00002'
    ]
  ];
  
  return headers.join(',') + '\n' + exampleRows.map(row => row.join(',')).join('\n');
}

// ============================================
// IMAGE UTILITIES
// ============================================

/**
 * Convert a File to base64 data URL
 * @param {File} file - File to convert
 * @returns {Promise<string>} Base64 data URL
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Resize an image to max dimensions
 * @param {string} dataUrl - Base64 data URL
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @returns {Promise<string>} Resized base64 data URL
 */
export function resizeImage(dataUrl, maxWidth = 400, maxHeight = 400) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = dataUrl;
  });
}

// ============================================
// MISC UTILITIES
// ============================================

/**
 * Generate a unique ID
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Debounce function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Deep clone an object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Get player role icon
 */
export function getRoleIcon(role) {
  const roleLower = role?.toLowerCase() || '';
  
  if (roleLower === 'batsman' || roleLower === 'batter') {
    return '🏏';
  }
  if (roleLower === 'bowler') {
    return '🎯';
  }
  if (roleLower.includes('batting all-rounder') || roleLower === 'batting all-rounder') {
    return '🏏⭐'; // Bat primary
  }
  if (roleLower.includes('bowling all-rounder') || roleLower === 'bowling all-rounder') {
    return '🎯⭐'; // Bowl primary
  }
  if (roleLower.includes('all-rounder') || roleLower === 'allrounder') {
    return '⭐';
  }
  if (roleLower.includes('wicket') || roleLower === 'keeper' || roleLower === 'wk') {
    return '🧤';
  }
  
  return '🏏';
}

/**
 * Get tier display info
 */
export function getTierInfo(tierId) {
  const tiers = {
    's-class': {
      id: 's-class',
      name: 'S-Class',
      icon: '👑',
      color: '#FFD700',
      colorClass: 'badge-sclass'
    },
    'a-class': {
      id: 'a-class',
      name: 'A-Class',
      icon: '⭐',
      color: '#C0C0C0',
      colorClass: 'badge-aclass'
    },
    'b-class': {
      id: 'b-class',
      name: 'B-Class',
      icon: '🛡️',
      color: '#CD7F32',
      colorClass: 'badge-bclass'
    },
    'c-class': {
      id: 'c-class',
      name: 'C-Class',
      icon: '⚡',
      color: '#60A5FA',
      colorClass: 'badge-cclass'
    },
    'd-class': {
      id: 'd-class',
      name: 'D-Class',
      icon: '🌱',
      color: '#34D399',
      colorClass: 'badge-dclass'
    }
  };
  return tiers[tierId] || tiers['c-class'];
}

/**
 * Get status badge info
 */
export function getStatusInfo(status) {
  const statuses = {
    available: {
      label: 'Available',
      colorClass: 'badge-available'
    },
    sold: {
      label: 'Sold',
      colorClass: 'badge-sold'
    },
    unsold: {
      label: 'Unsold',
      colorClass: 'badge-unsold'
    }
  };
  return statuses[status] || statuses.available;
}

/**
 * Calculate max bid a team can make
 */
export function getMaxBid(team, config) {
  if (!team || !config) return 0;
  
  const currentPlayers = team.players?.length || 0;
  const minPlayers = config.minPlayersPerTeam || 11;
  const minBid = config.tiers?.[config.tiers.length - 1]?.basePrice || 100;
  
  // Reserve amount for remaining required players
  const playersNeeded = Math.max(0, minPlayers - currentPlayers - 1);
  const reserveAmount = playersNeeded * minBid;
  
  return Math.max(0, team.remainingPurse - reserveAmount);
}

/**
 * Check if a team can afford a bid
 */
export function canTeamAffordBid(team, bidAmount, config) {
  if (!team) return { canAfford: false, reason: 'No team' };
  
  const maxPlayers = config?.maxPlayersPerTeam || 15;
  const currentPlayers = team.players?.length || 0;
  
  if (currentPlayers >= maxPlayers) {
    return { canAfford: false, reason: 'Squad full', isSquadFull: true };
  }
  
  const maxBid = getMaxBid(team, config);
  
  if (bidAmount > maxBid) {
    return { canAfford: false, reason: `Max bid: ${formatCurrency(maxBid, { compact: true })}` };
  }
  
  return { canAfford: true };
}

/**
 * Get affordability status for all teams
 */
export function getTeamsAffordability(teams, bidAmount, config) {
  const results = teams.map(team => ({
    team,
    ...canTeamAffordBid(team, bidAmount, config)
  }));
  
  const teamsCanAfford = results.filter(r => r.canAfford).length;
  
  return {
    results,
    teamsCanAfford,
    noTeamCanAfford: teamsCanAfford === 0
  };
}