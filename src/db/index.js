import Dexie from 'dexie';

// Create the database
export const db = new Dexie('BWPLAuctionDB');

// Define schema - version 2 adds retention support
db.version(2).stores({
  teams: '++id, name, shortName, createdAt',
  players: '++id, name, tier, status, soldToTeamId, isRetained, retainedByTeamId, createdAt',
  config: 'id'
});

// Handle upgrade from version 1
db.version(1).stores({
  teams: '++id, name, shortName, createdAt',
  players: '++id, name, tier, status, soldToTeamId, createdAt',
  config: 'id'
});

// Retention configuration
export const RETENTION_CONFIG = {
  maxRetentionsPerTeam: 3, // Configurable
};

// Default configuration
export const DEFAULT_CONFIG = {
  id: 'config',
  leagueName: 'BWPL',
  leagueFullName: 'Bangalore Willows Premier League',
  seasonYear: 2025,
  clubName: 'Bangalore Willows',
  totalPursePerTeam: 10000000, // 1 Crore
  currency: '₹',
  maxPlayersPerTeam: 15,
  minPlayersPerTeam: 11,
  maxRetentionsPerTeam: 3, // Added for retention
  tiers: [
    {
      id: 's-class',
      name: 'S Class',
      basePrice: 500000,
      color: '#FFD700',
      accentColor: '#FFA500',
      glowColor: 'rgba(255, 215, 0, 0.5)',
      icon: 'crown'
    },
    {
      id: 'a-class',
      name: 'A Class',
      basePrice: 300000,
      color: '#C0C0C0',
      accentColor: '#A8A8A8',
      glowColor: 'rgba(192, 192, 192, 0.5)',
      icon: 'star'
    },
    {
      id: 'b-class',
      name: 'B Class',
      basePrice: 200000,
      color: '#CD7F32',
      accentColor: '#DDA15E',
      glowColor: 'rgba(205, 127, 50, 0.4)',
      icon: 'shield'
    },
    {
      id: 'c-class',
      name: 'C Class',
      basePrice: 100000,
      color: '#60A5FA',
      accentColor: '#3B82F6',
      glowColor: 'rgba(96, 165, 250, 0.4)',
      icon: 'zap'
    },
    {
      id: 'd-class',
      name: 'D Class',
      basePrice: 50000,
      color: '#34D399',
      accentColor: '#10B981',
      glowColor: 'rgba(52, 211, 153, 0.4)',
      icon: 'user'
    }
  ],
  minBidIncrement: 10000,
  bidIncrements: [10000, 25000, 50000, 100000, 500000],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Initialize config if not exists
export async function initializeConfig() {
  const existing = await db.config.get('config');
  if (!existing) {
    await db.config.put(DEFAULT_CONFIG);
  }
  return db.config.get('config');
}

// Team operations
export const teamOperations = {
  async getAll() {
    return db.teams.toArray();
  },
  
  async getById(id) {
    return db.teams.get(id);
  },
  
  async create(team) {
    const now = new Date().toISOString();
    const initialPurse = Math.max(0, parseInt(team.initialPurse) || 0);
    
    const newTeam = {
      ...team,
      initialPurse,
      players: [],
      retainedPlayers: [], // New field for retained players
      remainingPurse: initialPurse,
      createdAt: now,
      updatedAt: now
    };
    const id = await db.teams.add(newTeam);
    return { ...newTeam, id };
  },
  
  async update(id, updates) {
    const now = new Date().toISOString();
    const existingTeam = await db.teams.get(id);
    if (!existingTeam) throw new Error('Team not found');
    
    const updateData = { ...updates, updatedAt: now };
    
    if (updates.initialPurse !== undefined && updates.initialPurse !== existingTeam.initialPurse) {
      const newInitialPurse = Math.max(0, parseInt(updates.initialPurse) || 0);
      const spent = existingTeam.initialPurse - existingTeam.remainingPurse;
      const newRemainingPurse = newInitialPurse - spent;
      
      updateData.initialPurse = newInitialPurse;
      updateData.remainingPurse = newRemainingPurse;
    }
    
    await db.teams.update(id, updateData);
    return db.teams.get(id);
  },
  
  async delete(id) {
    // Reset players sold to this team
    await db.players.where('soldToTeamId').equals(id).modify({
      status: 'available',
      soldToTeamId: null,
      soldPrice: null,
      soldAt: null
    });
    // Reset players retained by this team
    await db.players.where('retainedByTeamId').equals(id).modify({
      isRetained: false,
      retainedByTeamId: null,
      retainedPrice: null,
      status: 'available'
    });
    return db.teams.delete(id);
  },
  
  async addPlayer(teamId, playerId, soldPrice) {
    const team = await db.teams.get(teamId);
    if (!team) throw new Error('Team not found');
    
    const newRemainingPurse = team.remainingPurse - soldPrice;
    if (newRemainingPurse < 0) {
      throw new Error('Insufficient purse balance');
    }
    
    const players = [...(team.players || []), playerId];
    
    await db.teams.update(teamId, {
      players,
      remainingPurse: newRemainingPurse,
      updatedAt: new Date().toISOString()
    });
    
    return db.teams.get(teamId);
  },
  
  async removePlayer(teamId, playerId, soldPrice) {
    const team = await db.teams.get(teamId);
    if (!team) throw new Error('Team not found');
    
    const players = (team.players || []).filter(p => p !== playerId);
    const remainingPurse = team.remainingPurse + soldPrice;
    const cappedRemainingPurse = Math.min(remainingPurse, team.initialPurse);
    
    await db.teams.update(teamId, {
      players,
      remainingPurse: cappedRemainingPurse,
      updatedAt: new Date().toISOString()
    });
    
    return db.teams.get(teamId);
  },
  
  // Retention operations
  async retainPlayer(teamId, playerId, retentionPrice) {
    const team = await db.teams.get(teamId);
    if (!team) throw new Error('Team not found');
    
    const player = await db.players.get(playerId);
    if (!player) throw new Error('Player not found');
    
    if (player.isRetained) {
      throw new Error('Player is already retained');
    }
    
    const config = await db.config.get('config');
    const maxRetentions = config?.maxRetentionsPerTeam || RETENTION_CONFIG.maxRetentionsPerTeam;
    
    const retainedPlayers = team.retainedPlayers || [];
    if (retainedPlayers.length >= maxRetentions) {
      throw new Error(`Maximum ${maxRetentions} retentions allowed per team`);
    }
    
    const newRemainingPurse = team.remainingPurse - retentionPrice;
    if (newRemainingPurse < 0) {
      throw new Error('Insufficient purse for retention');
    }
    
    const now = new Date().toISOString();
    
    // Update player
    await db.players.update(playerId, {
      isRetained: true,
      retainedByTeamId: teamId,
      retainedPrice: retentionPrice,
      status: 'retained',
      soldToTeamId: teamId,
      soldPrice: retentionPrice,
      soldAt: now,
      updatedAt: now
    });
    
    // Update team
    await db.teams.update(teamId, {
      retainedPlayers: [...retainedPlayers, playerId],
      players: [...(team.players || []), playerId],
      remainingPurse: newRemainingPurse,
      updatedAt: now
    });
    
    return { team: await db.teams.get(teamId), player: await db.players.get(playerId) };
  },
  
  async releaseRetainedPlayer(teamId, playerId) {
    const team = await db.teams.get(teamId);
    if (!team) throw new Error('Team not found');
    
    const player = await db.players.get(playerId);
    if (!player) throw new Error('Player not found');
    
    if (!player.isRetained || player.retainedByTeamId !== teamId) {
      throw new Error('Player is not retained by this team');
    }
    
    const retentionPrice = player.retainedPrice || 0;
    const now = new Date().toISOString();
    
    // Update player
    await db.players.update(playerId, {
      isRetained: false,
      retainedByTeamId: null,
      retainedPrice: null,
      status: 'available',
      soldToTeamId: null,
      soldPrice: null,
      soldAt: null,
      updatedAt: now
    });
    
    // Update team - restore purse
    const retainedPlayers = (team.retainedPlayers || []).filter(p => p !== playerId);
    const players = (team.players || []).filter(p => p !== playerId);
    const newRemainingPurse = Math.min(team.remainingPurse + retentionPrice, team.initialPurse);
    
    await db.teams.update(teamId, {
      retainedPlayers,
      players,
      remainingPurse: newRemainingPurse,
      updatedAt: now
    });
    
    return { team: await db.teams.get(teamId), player: await db.players.get(playerId) };
  },
  
  async recalculatePurse(teamId) {
    const team = await db.teams.get(teamId);
    if (!team) throw new Error('Team not found');
    
    const soldPlayers = await db.players.where('soldToTeamId').equals(teamId).toArray();
    const totalSpent = soldPlayers.reduce((sum, p) => sum + (p.soldPrice || p.retainedPrice || 0), 0);
    
    const remainingPurse = team.initialPurse - totalSpent;
    
    await db.teams.update(teamId, {
      remainingPurse,
      players: soldPlayers.map(p => p.id),
      retainedPlayers: soldPlayers.filter(p => p.isRetained).map(p => p.id),
      updatedAt: new Date().toISOString()
    });
    
    return db.teams.get(teamId);
  }
};

// Player operations
export const playerOperations = {
  async getAll() {
    return db.players.toArray();
  },
  
  async getById(id) {
    return db.players.get(id);
  },
  
  async getByStatus(status) {
    return db.players.where('status').equals(status).toArray();
  },
  
  async getByTier(tier) {
    return db.players.where('tier').equals(tier).toArray();
  },
  
  async getByTeam(teamId) {
    return db.players.where('soldToTeamId').equals(teamId).toArray();
  },
  
  // Get only auctionable players (excludes retained)
  async getAuctionable() {
    const all = await db.players.toArray();
    return all.filter(p => !p.isRetained && (p.status === 'available' || p.status === 'unsold'));
  },
  
  async create(player) {
    const now = new Date().toISOString();
    const newPlayer = {
      ...player,
      status: 'available',
      soldPrice: null,
      soldToTeamId: null,
      soldAt: null,
      isRetained: false,
      retainedByTeamId: null,
      retainedPrice: null,
      stats: player.stats || {
        matches: 0,
        innings: 0,
        runs: 0,
        highestScore: 0,
        average: 0,
        strikeRate: 0,
        fifties: 0,
        hundreds: 0,
        wickets: 0,
        bowlingAvg: 0,
        economy: 0,
        bestBowling: '-'
      },
      createdAt: now,
      updatedAt: now
    };
    const id = await db.players.add(newPlayer);
    return { ...newPlayer, id };
  },
  
  async update(id, updates) {
    const now = new Date().toISOString();
    await db.players.update(id, { ...updates, updatedAt: now });
    return db.players.get(id);
  },
  
  async delete(id) {
    const player = await db.players.get(id);
    if (player && player.soldToTeamId) {
      await teamOperations.removePlayer(player.soldToTeamId, id, player.soldPrice || player.retainedPrice || 0);
    }
    return db.players.delete(id);
  },
  
  async markSold(id, teamId, soldPrice) {
    const now = new Date().toISOString();
    await db.players.update(id, {
      status: 'sold',
      soldToTeamId: teamId,
      soldPrice,
      soldAt: now,
      updatedAt: now
    });
    await teamOperations.addPlayer(teamId, id, soldPrice);
    return db.players.get(id);
  },
  
  async markUnsold(id) {
    const now = new Date().toISOString();
    await db.players.update(id, {
      status: 'unsold',
      updatedAt: now
    });
    return db.players.get(id);
  },
  
  async resetToAvailable(id) {
    const player = await db.players.get(id);
    
    // Don't reset retained players
    if (player && player.isRetained) {
      throw new Error('Cannot reset retained player');
    }
    
    if (player && player.soldToTeamId) {
      await teamOperations.removePlayer(player.soldToTeamId, id, player.soldPrice || 0);
    }
    const now = new Date().toISOString();
    await db.players.update(id, {
      status: 'available',
      soldToTeamId: null,
      soldPrice: null,
      soldAt: null,
      updatedAt: now
    });
    return db.players.get(id);
  },
  
  async bulkCreate(players) {
    const now = new Date().toISOString();
    const newPlayers = players.map(p => ({
      ...p,
      status: 'available',
      soldPrice: null,
      soldToTeamId: null,
      soldAt: null,
      isRetained: false,
      retainedByTeamId: null,
      retainedPrice: null,
      stats: p.stats || {
        matches: 0,
        innings: 0,
        runs: 0,
        highestScore: 0,
        average: 0,
        strikeRate: 0,
        fifties: 0,
        hundreds: 0,
        wickets: 0,
        bowlingAvg: 0,
        economy: 0,
        bestBowling: '-'
      },
      createdAt: now,
      updatedAt: now
    }));
    return db.players.bulkAdd(newPlayers);
  },
  
  // Bulk update photos by ID mapping
  async bulkUpdatePhotos(photoMappings) {
    // photoMappings: { playerId: photoDataUrl, ... }
    const now = new Date().toISOString();
    const updates = Object.entries(photoMappings).map(([id, photo]) => 
      db.players.update(parseInt(id), { photo, updatedAt: now })
    );
    await Promise.all(updates);
    return db.players.toArray();
  }
};

// Config operations
export const configOperations = {
  async get() {
    let config = await db.config.get('config');
    if (!config) {
      config = await initializeConfig();
    }
    return config;
  },
  
  async update(updates) {
    const now = new Date().toISOString();
    await db.config.update('config', { ...updates, updatedAt: now });
    return db.config.get('config');
  },
  
  async reset() {
    await db.config.put(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }
};

// ============================================
// CONFIG IMPORT/EXPORT (without players)
// ============================================

/**
 * Export current auction config as JSON
 * Includes: tournament info, tiers, teams, auction rules
 * Does NOT include: players (handled separately)
 */
export async function exportAuctionConfig() {
  const config = await db.config.get('config');
  const teams = await db.teams.toArray();
  
  // Build export object
  const exportData = {
    tournament: {
      name: config?.leagueName || 'BWPL',
      fullName: config?.leagueFullName || 'Bangalore Willows Premier League',
      season: config?.season || '1.0',
      year: config?.seasonYear || new Date().getFullYear(),
      clubName: config?.clubName || 'Bangalore Willows Cricket Club'
    },
    
    purseSettings: {
      defaultPurse: config?.totalPursePerTeam || 10000000,
      currency: config?.currency || '₹',
      minPlayersPerTeam: config?.minPlayersPerTeam || 11,
      maxPlayersPerTeam: config?.maxPlayersPerTeam || 15,
      maxRetentionsPerTeam: config?.maxRetentionsPerTeam || 3
    },
    
    tiers: (config?.tiers || []).map(t => ({
      id: t.id,
      name: t.name,
      basePrice: t.basePrice,
      color: t.color,
      accentColor: t.accentColor,
      icon: t.icon
    })),
    
    teams: teams.map(t => ({
      name: t.name,
      shortName: t.shortName,
      primaryColor: t.primaryColor,
      secondaryColor: t.secondaryColor,
      logo: t.logo || null, // Include logo if stored as base64/URL
      initialPurse: t.initialPurse
    })),
    
    auctionRules: {
      minBidIncrement: config?.minBidIncrement || 10000,
      bidIncrements: config?.bidIncrements || [10000, 25000, 50000, 100000, 500000],
      autoIncrementRules: config?.autoIncrementRules || []
    },
    
    _meta: {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      description: 'BWPL Auction Configuration'
    }
  };
  
  return exportData;
}

/**
 * Validate auction config JSON structure
 * @param {object} data - Config JSON to validate
 * @returns {object} { valid: boolean, errors: string[] }
 */
export function validateAuctionConfig(data) {
  const errors = [];
  
  // Check required sections
  if (!data.tournament) {
    errors.push('Missing "tournament" section');
  } else {
    if (!data.tournament.name) errors.push('Tournament name is required');
  }
  
  if (!data.purseSettings) {
    errors.push('Missing "purseSettings" section');
  } else {
    if (!data.purseSettings.defaultPurse || data.purseSettings.defaultPurse <= 0) {
      errors.push('Default purse must be a positive number');
    }
  }
  
  if (!data.tiers || !Array.isArray(data.tiers) || data.tiers.length === 0) {
    errors.push('At least one tier is required');
  } else {
    data.tiers.forEach((tier, i) => {
      if (!tier.id) errors.push(`Tier ${i + 1}: missing id`);
      if (!tier.name) errors.push(`Tier ${i + 1}: missing name`);
      if (!tier.basePrice || tier.basePrice <= 0) errors.push(`Tier ${i + 1}: invalid basePrice`);
    });
  }
  
  if (!data.teams || !Array.isArray(data.teams)) {
    errors.push('Missing "teams" section (must be an array)');
  } else if (data.teams.length === 0) {
    errors.push('At least one team is required');
  } else {
    data.teams.forEach((team, i) => {
      if (!team.name) errors.push(`Team ${i + 1}: missing name`);
      if (!team.shortName) errors.push(`Team ${i + 1}: missing shortName`);
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Import auction config from JSON
 * REPLACES all existing config and teams (not players)
 * @param {object} data - Config JSON to import
 * @returns {object} { success: boolean, teamsImported: number, message: string }
 */
export async function importAuctionConfig(data) {
  // Validate first
  const validation = validateAuctionConfig(data);
  if (!validation.valid) {
    throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
  }
  
  const now = new Date().toISOString();
  
  // Build config object
  const newConfig = {
    id: 'config',
    leagueName: data.tournament.name,
    leagueFullName: data.tournament.fullName || data.tournament.name,
    season: data.tournament.season || '1.0',
    seasonYear: data.tournament.year || new Date().getFullYear(),
    clubName: data.tournament.clubName || '',
    
    totalPursePerTeam: data.purseSettings.defaultPurse,
    currency: data.purseSettings.currency || '₹',
    minPlayersPerTeam: data.purseSettings.minPlayersPerTeam || 11,
    maxPlayersPerTeam: data.purseSettings.maxPlayersPerTeam || 15,
    maxRetentionsPerTeam: data.purseSettings.maxRetentionsPerTeam || 3,
    
    tiers: data.tiers.map(t => ({
      id: t.id,
      name: t.name,
      basePrice: t.basePrice,
      color: t.color || '#60A5FA',
      accentColor: t.accentColor || t.color || '#3B82F6',
      glowColor: t.glowColor || `${t.color}80`,
      icon: t.icon || 'star'
    })),
    
    minBidIncrement: data.auctionRules?.minBidIncrement || 10000,
    bidIncrements: data.auctionRules?.bidIncrements || [10000, 25000, 50000, 100000, 500000],
    autoIncrementRules: data.auctionRules?.autoIncrementRules || [],
    
    createdAt: now,
    updatedAt: now
  };
  
  // Clear existing teams
  await db.teams.clear();
  
  // Clear existing config and add new
  await db.config.clear();
  await db.config.put(newConfig);
  
  // Add teams
  const teamsToAdd = data.teams.map(t => ({
    name: t.name,
    shortName: t.shortName,
    primaryColor: t.primaryColor || '#3B82F6',
    secondaryColor: t.secondaryColor || '#1E40AF',
    logo: t.logo || null,
    initialPurse: t.initialPurse || data.purseSettings.defaultPurse,
    remainingPurse: t.initialPurse || data.purseSettings.defaultPurse,
    players: [],
    createdAt: now,
    updatedAt: now
  }));
  
  await db.teams.bulkAdd(teamsToAdd);
  
  return {
    success: true,
    teamsImported: teamsToAdd.length,
    tiersImported: newConfig.tiers.length,
    message: `Imported ${teamsToAdd.length} teams and ${newConfig.tiers.length} tiers`
  };
}

// Export/Import functions
export async function exportAllData() {
  const teams = await db.teams.toArray();
  const players = await db.players.toArray();
  const config = await db.config.get('config');
  
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    data: {
      teams,
      players,
      config
    }
  };
}

export async function importAllData(data) {
  if (!data.data) throw new Error('Invalid import format');
  
  await db.teams.clear();
  await db.players.clear();
  await db.config.clear();
  
  if (data.data.teams?.length) {
    await db.teams.bulkAdd(data.data.teams);
  }
  if (data.data.players?.length) {
    await db.players.bulkAdd(data.data.players);
  }
  if (data.data.config) {
    await db.config.put(data.data.config);
  }
  
  return true;
}

export async function clearAllData() {
  await db.teams.clear();
  await db.players.clear();
  await db.config.clear();
  await initializeConfig();
}

// Reset auction without deleting players/teams (preserves retentions)
export async function resetAuctionData() {
  const now = new Date().toISOString();
  
  // Reset non-retained players to available
  const players = await db.players.toArray();
  for (const player of players) {
    if (!player.isRetained) {
      await db.players.update(player.id, {
        status: 'available',
        soldPrice: null,
        soldToTeamId: null,
        soldAt: null,
        updatedAt: now
      });
    }
  }
  
  // Reset team purses (but keep retentions)
  const teams = await db.teams.toArray();
  for (const team of teams) {
    const retainedPlayers = await db.players
      .where('retainedByTeamId')
      .equals(team.id)
      .toArray();
    
    const retentionSpent = retainedPlayers.reduce((sum, p) => sum + (p.retainedPrice || 0), 0);
    
    await db.teams.update(team.id, {
      players: retainedPlayers.map(p => p.id),
      remainingPurse: team.initialPurse - retentionSpent,
      updatedAt: now
    });
  }
  
  return {
    playersReset: players.filter(p => !p.isRetained).length,
    teamsReset: teams.length
  };
}

export default db;