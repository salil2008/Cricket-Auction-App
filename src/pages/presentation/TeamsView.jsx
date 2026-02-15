import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTeamStore, usePlayerStore, useConfigStore } from '../../stores';
import { formatCurrency } from '../../utils';

export default function TeamsView() {
  const teams = useTeamStore(state => state.teams);
  const players = usePlayerStore(state => state.players);
  const config = useConfigStore(state => state.config);
  
  // Get players for each team with safe calculations
  const teamData = useMemo(() => {
    return teams.map(team => {
      const teamPlayers = players.filter(p => p.soldToTeamId === team.id);
      const totalSpent = teamPlayers.reduce((sum, p) => sum + (p.soldPrice || 0), 0);
      
      // Safe percentage calculation
      const purseUsed = team.initialPurse > 0 
        ? Math.max(0, Math.min(100, ((team.initialPurse - team.remainingPurse) / team.initialPurse) * 100))
        : 0;
      
      return {
        ...team,
        players: teamPlayers,
        totalSpent,
        purseUsed,
        isOverBudget: team.remainingPurse < 0
      };
    });
  }, [teams, players]);
  
  // Grid layout based on team count
  const gridCols = teams.length <= 4 ? 2 : 3;
  
  return (
    <div className="h-full p-8 flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-6 mb-2">
          <img src="/bwpl-2026-logo.png" alt="BWPL 2026" className="w-24 h-auto" />
          <div>
            <h1 className="text-4xl font-display text-white tracking-wide">
              TEAM <span className="text-[var(--bwpl-primary)]">STANDINGS</span>
            </h1>
            <p className="text-gray-400">Season {config?.seasonYear}</p>
          </div>
        </div>
      </motion.div>
      
      {/* Teams Grid */}
      <div 
        className={`flex-1 grid gap-6`}
        style={{ 
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
          gridAutoRows: '1fr'
        }}
      >
        {teamData.map((team, index) => (
          <motion.div
            key={team.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="glass rounded-2xl overflow-hidden flex flex-col"
          >
            {/* Team Header */}
            <div 
              className="p-4 flex items-center gap-4"
              style={{ 
                background: `linear-gradient(135deg, ${team.primaryColor}40, ${team.primaryColor}20)`
              }}
            >
              {team.logo ? (
                <img 
                  src={team.logo}
                  alt={team.name}
                  className="w-16 h-16 rounded-xl object-cover"
                />
              ) : (
                <div 
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold text-white"
                  style={{ backgroundColor: team.primaryColor }}
                >
                  {team.shortName}
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white">{team.name}</h2>
                <p className="text-sm text-gray-300">{team.players.length} Players</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-[var(--bwpl-primary)]">
                  {formatCurrency(team.remainingPurse, { compact: true })}
                </p>
                <p className="text-xs text-gray-400">Remaining</p>
              </div>
            </div>
            
            {/* Purse Bar */}
            <div className="px-4 py-2">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${100 - team.purseUsed}%` }}
                  transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                  className={`h-full rounded-full ${team.isOverBudget ? 'bg-red-500' : ''}`}
                  style={{ backgroundColor: team.isOverBudget ? undefined : team.primaryColor }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-gray-400">Spent: {formatCurrency(team.totalSpent, { compact: true })}</span>
                <span className={team.isOverBudget ? 'text-red-400' : 'text-gray-400'}>
                  {team.isOverBudget ? 'Over budget!' : `${team.purseUsed.toFixed(0)}% used`}
                </span>
              </div>
            </div>
            
            {/* Players List */}
            <div className="flex-1 p-4 overflow-y-auto">
              {team.players.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No players yet</p>
              ) : (
                <div className="space-y-2">
                  {team.players.map((player, i) => (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 + i * 0.05 }}
                      className="flex items-center gap-3 p-2 rounded-lg bg-white/5"
                    >
                      {player.photo ? (
                        <img 
                          src={player.photo}
                          alt={player.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-lg">
                          🏏
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{player.name}</p>
                        <p className="text-xs text-gray-400">{player.role}</p>
                      </div>
                      <span className="text-sm font-medium text-[var(--bwpl-primary)]">
                        {formatCurrency(player.soldPrice, { compact: true })}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
