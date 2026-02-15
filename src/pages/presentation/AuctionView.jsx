import { useMemo, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Star, Shield, Pause, Radio, X, TrendingUp, Target, Award, Zap, User, Trophy, Users, DollarSign, BarChart3, CheckCircle, XCircle } from 'lucide-react';
import { useAuctionStore, usePlayerStore, useTeamStore, useConfigStore, AUCTION_EVENTS } from '../../stores';
import { AnimatedCurrency } from '../../components/common';
import { formatCurrency, getTierInfo, getRoleIcon, canTeamAffordBid, getMaxBid } from '../../utils';

const tierIcons = {
  's-class': Crown,
  'a-class': Star,
  'b-class': Shield,
  'c-class': Zap,
  'd-class': User
};

const tierGradients = {
  's-class': 'from-yellow-600/20 via-amber-900/30 to-purple-900/40',
  'a-class': 'from-slate-400/20 via-slate-600/30 to-blue-900/40',
  'b-class': 'from-amber-700/20 via-amber-800/30 to-gray-900/40',
  'c-class': 'from-blue-500/20 via-blue-700/30 to-indigo-900/40',
  'd-class': 'from-emerald-500/20 via-emerald-700/30 to-teal-900/40'
};

const tierGlows = {
  's-class': '0 0 100px rgba(255, 215, 0, 0.4), 0 0 200px rgba(255, 215, 0, 0.2)',
  'a-class': '0 0 80px rgba(192, 192, 192, 0.3), 0 0 150px rgba(192, 192, 192, 0.15)',
  'b-class': '0 0 60px rgba(205, 127, 50, 0.3), 0 0 120px rgba(205, 127, 50, 0.15)',
  'c-class': '0 0 60px rgba(96, 165, 250, 0.3), 0 0 120px rgba(96, 165, 250, 0.15)',
  'd-class': '0 0 60px rgba(52, 211, 153, 0.3), 0 0 120px rgba(52, 211, 153, 0.15)'
};

// Enhanced Confetti with multiple shapes
function EnhancedConfetti({ active, teamColor }) {
  const colors = teamColor
    ? [teamColor, '#FFD700', '#FFFFFF', '#00FF87', teamColor]
    : ['#FFD700', '#00FF87', '#60A5FA', '#F472B6', '#A855F7', '#FFFFFF'];

  // Generate different shapes
  const pieces = useMemo(() => Array.from({ length: 100 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.8,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
    shape: ['square', 'circle', 'triangle', 'star'][Math.floor(Math.random() * 4)],
    size: Math.random() * 10 + 5,
    duration: Math.random() * 2 + 2
  })), [active]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map(piece => (
        <motion.div
          key={piece.id}
          initial={{
            y: -20,
            x: `${piece.x}vw`,
            opacity: 1,
            rotate: 0,
            scale: 0
          }}
          animate={{
            y: '110vh',
            opacity: [1, 1, 0],
            rotate: piece.rotation + 720,
            scale: [0, 1, 1, 0.5]
          }}
          transition={{
            duration: piece.duration,
            delay: piece.delay,
            ease: 'linear'
          }}
          className="absolute"
          style={{
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.shape !== 'star' ? piece.color : 'transparent',
            borderRadius: piece.shape === 'circle' ? '50%' : piece.shape === 'triangle' ? '0' : '2px',
            clipPath: piece.shape === 'triangle'
              ? 'polygon(50% 0%, 0% 100%, 100% 100%)'
              : piece.shape === 'star'
                ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
                : 'none',
            border: piece.shape === 'star' ? `2px solid ${piece.color}` : 'none'
          }}
        />
      ))}
    </div>
  );
}

// Sparkle/Firework effect
function Sparkles({ active, centerX = 50, centerY = 50 }) {
  const sparkles = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
    id: i,
    angle: (i / 20) * 360,
    distance: Math.random() * 150 + 100,
    delay: Math.random() * 0.3,
    size: Math.random() * 4 + 2
  })), [active]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {sparkles.map(sparkle => {
        const radians = (sparkle.angle * Math.PI) / 180;
        const endX = Math.cos(radians) * sparkle.distance;
        const endY = Math.sin(radians) * sparkle.distance;

        return (
          <motion.div
            key={sparkle.id}
            className="absolute rounded-full bg-yellow-300"
            style={{
              left: `${centerX}%`,
              top: `${centerY}%`,
              width: sparkle.size,
              height: sparkle.size,
              boxShadow: '0 0 10px #FFD700, 0 0 20px #FFD700'
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
            animate={{
              x: endX,
              y: endY,
              opacity: [0, 1, 1, 0],
              scale: [0, 1.5, 1, 0]
            }}
            transition={{
              duration: 1,
              delay: sparkle.delay,
              ease: 'easeOut'
            }}
          />
        );
      })}
    </div>
  );
}

// Player Stats Modal
function PlayerStatsModal({ player, isOpen, onClose, tierConfig }) {
  if (!isOpen || !player) return null;

  const stats = player.stats || {};

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="bg-[#1a1a2e] rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="p-6 relative"
            style={{
              background: `linear-gradient(135deg, ${tierConfig?.color}30, ${tierConfig?.color}10)`
            }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              {player.photo ? (
                <img
                  src={player.photo}
                  alt={player.name}
                  className="w-24 h-24 rounded-xl object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-xl bg-white/10 flex items-center justify-center text-4xl">
                  {getRoleIcon(player.role)}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-white">{player.name}</h2>
                <p className="text-gray-400">{player.role} • {player.battingStyle}</p>
                {player.bowlingStyle && (
                  <p className="text-gray-500 text-sm">{player.bowlingStyle}</p>
                )}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[var(--bwpl-primary)]" />
              Career Statistics
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Batting Stats */}
              <StatCard label="Matches" value={stats.matches || 0} />
              <StatCard label="Innings" value={stats.innings || 0} />
              <StatCard label="Runs" value={stats.runs || 0} highlight />
              <StatCard label="Highest" value={stats.highestScore || 0} />
              <StatCard label="Average" value={stats.average?.toFixed(2) || '0.00'} />
              <StatCard label="Strike Rate" value={stats.strikeRate?.toFixed(2) || '0.00'} />
              <StatCard label="50s" value={stats.fifties || 0} />
              <StatCard label="100s" value={stats.hundreds || 0} highlight={stats.hundreds > 0} />
            </div>

            {/* Bowling Stats */}
            {(stats.wickets > 0 || player.role?.toLowerCase().includes('bowl') || player.role?.toLowerCase().includes('all-rounder')) && (
              <>
                <h3 className="text-lg font-semibold text-white mt-6 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-[var(--bwpl-primary)]" />
                  Bowling Statistics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Wickets" value={stats.wickets || 0} highlight />
                  <StatCard label="Bowling Avg" value={stats.bowlingAvg?.toFixed(2) || '-'} />
                  <StatCard label="Economy" value={stats.economy?.toFixed(2) || '-'} />
                  <StatCard label="Best" value={stats.bestBowling || '-'} />
                </div>
              </>
            )}

            {/* Previous Team (for RTM info) */}
            {player.previousTeamId && (
              <div className="mt-6 p-4 bg-white/5 rounded-lg">
                <div className="flex items-center gap-2 text-amber-400">
                  <Award className="w-5 h-5" />
                  <span className="font-medium">RTM Eligible</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  Previous team has Right to Match option
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Stat Card Component
function StatCard({ label, value, highlight }) {
  return (
    <div className={`p-3 rounded-lg ${highlight ? 'bg-[var(--bwpl-primary)]/10' : 'bg-white/5'}`}>
      <p className={`text-2xl font-bold ${highlight ? 'text-[var(--bwpl-primary)]' : 'text-white'}`}>
        {value}
      </p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

// Auction Status Indicator
function AuctionStatus({ isLive, isPaused }) {
  if (!isLive) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/80 border border-gray-600">
        <div className="w-3 h-3 rounded-full bg-gray-500" />
        <span className="text-sm font-medium text-gray-400">Auction Offline</span>
      </div>
    );
  }

  if (isPaused) {
    return (
      <motion.div
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-900/50 border border-amber-500"
      >
        <Pause className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-medium text-amber-400">Paused</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      animate={{ opacity: [1, 0.7, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-900/50 border border-red-500"
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
        className="w-3 h-3 rounded-full bg-red-500"
      />
      <span className="text-sm font-medium text-red-400">LIVE</span>
    </motion.div>
  );
}

export default function AuctionView() {
  const { currentPlayerId, currentBid, currentBiddingTeamId, lastEvent, lastEventId, isLive, isPaused } = useAuctionStore();
  const players = usePlayerStore(state => state.players);
  const teams = useTeamStore(state => state.teams);
  const config = useConfigStore(state => state.config);

  const [showSold, setShowSold] = useState(false);
  const [showUnsold, setShowUnsold] = useState(false);
  const [soldToTeam, setSoldToTeam] = useState(null);
  const [soldPrice, setSoldPrice] = useState(0);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);

  // Track processed events to prevent duplicate animations
  const processedEventRef = useRef(null);

  // Get current player
  const currentPlayer = useMemo(() => {
    if (!currentPlayerId) return null;
    return players.find(p => p.id === currentPlayerId);
  }, [currentPlayerId, players]);

  // Get bidding team
  const biddingTeam = useMemo(() => {
    if (!currentBiddingTeamId) return null;
    return teams.find(t => t.id === currentBiddingTeamId);
  }, [currentBiddingTeamId, teams]);

  // Get tier config
  const tierConfig = useMemo(() => {
    if (!currentPlayer) return null;
    return config?.tiers?.find(t => t.id === currentPlayer.tier);
  }, [currentPlayer, config]);

  // Handle sold/unsold events - use lastEventId for reliable detection
  useEffect(() => {
    if (!lastEvent || !lastEventId) return;

    // Skip if we already processed this event
    if (processedEventRef.current === lastEventId) return;

    console.log('Processing event:', lastEvent.type, lastEventId);

    if (lastEvent.type === AUCTION_EVENTS.PLAYER_SOLD) {
      processedEventRef.current = lastEventId;
      const team = teams.find(t => t.id === lastEvent.payload.teamId);
      setSoldToTeam(team);
      setSoldPrice(lastEvent.payload.price);
      setShowSold(true);
      setShowSparkles(true);
      setTimeout(() => {
        setShowSold(false);
        setShowSparkles(false);
      }, 4000);
    }

    if (lastEvent.type === AUCTION_EVENTS.PLAYER_UNSOLD) {
      processedEventRef.current = lastEventId;
      setShowUnsold(true);
      setTimeout(() => setShowUnsold(false), 3000);
    }
  }, [lastEventId, lastEvent, teams]);

  const TierIcon = tierIcons[currentPlayer?.tier] || Shield;

  // Calculate auction statistics for waiting screen
  const auctionStats = useMemo(() => {
    const soldPlayers = players.filter(p => p.status === 'sold');
    const unsoldPlayers = players.filter(p => p.status === 'unsold');
    const availablePlayers = players.filter(p => p.status === 'available');

    // Top 3 highest bids
    const topBids = [...soldPlayers]
      .sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0))
      .slice(0, 3)
      .map(p => ({
        ...p,
        team: teams.find(t => t.id === p.soldToTeamId)
      }));

    // Highest single bid
    const highestBid = topBids[0] || null;

    // Total money spent
    const totalSpent = soldPlayers.reduce((sum, p) => sum + (p.soldPrice || 0), 0);

    // Average price
    const avgPrice = soldPlayers.length > 0 ? totalSpent / soldPlayers.length : 0;

    // Most active team (most players bought)
    const teamPlayerCounts = {};
    soldPlayers.forEach(p => {
      if (p.soldToTeamId) {
        teamPlayerCounts[p.soldToTeamId] = (teamPlayerCounts[p.soldToTeamId] || 0) + 1;
      }
    });
    const mostActiveTeamId = Object.entries(teamPlayerCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const mostActiveTeam = mostActiveTeamId ? teams.find(t => t.id === mostActiveTeamId) : null;
    const mostActiveCount = teamPlayerCounts[mostActiveTeamId] || 0;

    // Highest spending team
    const teamSpending = {};
    soldPlayers.forEach(p => {
      if (p.soldToTeamId) {
        teamSpending[p.soldToTeamId] = (teamSpending[p.soldToTeamId] || 0) + (p.soldPrice || 0);
      }
    });
    const highestSpendingTeamId = Object.entries(teamSpending).sort((a, b) => b[1] - a[1])[0]?.[0];
    const highestSpendingTeam = highestSpendingTeamId ? teams.find(t => t.id === highestSpendingTeamId) : null;
    const highestSpendingAmount = teamSpending[highestSpendingTeamId] || 0;

    // Recent sales (last 3)
    const recentSales = [...soldPlayers]
      .sort((a, b) => new Date(b.soldAt) - new Date(a.soldAt))
      .slice(0, 3)
      .map(p => ({
        ...p,
        team: teams.find(t => t.id === p.soldToTeamId)
      }));

    // Tier breakdown
    const tierBreakdown = {};
    config?.tiers?.forEach(tier => {
      const tierPlayers = soldPlayers.filter(p => p.tier === tier.id);
      tierBreakdown[tier.id] = {
        count: tierPlayers.length,
        total: players.filter(p => p.tier === tier.id).length,
        spent: tierPlayers.reduce((sum, p) => sum + (p.soldPrice || 0), 0)
      };
    });

    return {
      sold: soldPlayers.length,
      unsold: unsoldPlayers.length,
      available: availablePlayers.length,
      total: players.length,
      topBids,
      highestBid,
      totalSpent,
      avgPrice,
      mostActiveTeam,
      mostActiveCount,
      highestSpendingTeam,
      highestSpendingAmount,
      recentSales,
      tierBreakdown
    };
  }, [players, teams, config]);

  if (!currentPlayer) {
    return (
      <div className="h-full flex flex-col relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-[var(--bwpl-primary)]/20 to-transparent rounded-full"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.1, 0.15, 0.1]
            }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-purple-500/20 to-transparent rounded-full"
          />
        </div>

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <span className="text-2xl font-display text-white/80">
              {config?.leagueName || 'BWPL'} AUCTION {config?.seasonYear}
            </span>
            <AuctionStatus isLive={isLive} isPaused={isPaused} />
          </div>

          {/* Progress */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-400">Progress</div>
              <div className="text-xl font-bold text-white">
                {auctionStats.sold + auctionStats.unsold} / {auctionStats.total}
              </div>
            </div>
            <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((auctionStats.sold + auctionStats.unsold) / Math.max(1, auctionStats.total)) * 100}%` }}
                className="h-full bg-gradient-to-r from-[var(--bwpl-primary)] to-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex-1 p-6 pt-0">
          {auctionStats.sold === 0 && auctionStats.unsold === 0 ? (
            // No auction activity yet
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full flex flex-col items-center justify-center"
            >
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="mb-8"
              >
                <motion.img
                  src="/bwpl-2026-logo.png"
                  alt="BWPL 2026"
                  className="w-64 h-auto"
                  animate={{
                    filter: [
                      'drop-shadow(0 0 20px rgba(227,24,55,0.3))',
                      'drop-shadow(0 0 40px rgba(227,24,55,0.5))',
                      'drop-shadow(0 0 20px rgba(227,24,55,0.3))'
                    ]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                />
              </motion.div>
              <h2 className="text-4xl font-display font-bold text-white mb-3">
                {isLive ? 'Ready for Auction' : 'Auction Not Started'}
              </h2>
              <p className="text-xl text-gray-400">
                {isLive ? 'Waiting for next player...' : 'Waiting for auction to begin...'}
              </p>
              {auctionStats.available > 0 && (
                <div className="mt-8 px-6 py-3 bg-white/5 rounded-full border border-[var(--bwpl-primary)]/30">
                  <span className="text-gray-300">{auctionStats.available} players available for auction</span>
                </div>
              )}
            </motion.div>
          ) : (
            // Show auction stats
            <div className="h-full grid grid-cols-12 gap-6">
              {/* Left Column - Top Bids & Stats */}
              <div className="col-span-5 flex flex-col gap-6">
                {/* Highest Bid Card */}
                {auctionStats.highestBid && (
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-gradient-to-br from-yellow-500/20 to-amber-900/20 rounded-2xl p-6 border border-yellow-500/30"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Trophy className="w-6 h-6 text-yellow-400" />
                      <span className="text-yellow-400 font-semibold text-lg">Highest Bid</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                        {auctionStats.highestBid.photo ? (
                          <img src={auctionStats.highestBid.photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-white">{auctionStats.highestBid.name}</h3>
                        <p className="text-gray-400">{auctionStats.highestBid.role}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: auctionStats.highestBid.team?.primaryColor }}
                          />
                          <span className="text-sm text-gray-300">{auctionStats.highestBid.team?.name}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-yellow-400">
                          {formatCurrency(auctionStats.highestBid.soldPrice, { compact: true })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/5 rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-green-400" />
                      <span className="text-gray-400 text-sm">Players Sold</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{auctionStats.sold}</div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-white/5 rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-[var(--bwpl-primary)]" />
                      <span className="text-gray-400 text-sm">Total Spent</span>
                    </div>
                    <div className="text-3xl font-bold text-white">
                      {formatCurrency(auctionStats.totalSpent, { compact: true })}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/5 rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-5 h-5 text-purple-400" />
                      <span className="text-gray-400 text-sm">Average Price</span>
                    </div>
                    <div className="text-3xl font-bold text-white">
                      {formatCurrency(auctionStats.avgPrice, { compact: true })}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="bg-white/5 rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <X className="w-5 h-5 text-red-400" />
                      <span className="text-gray-400 text-sm">Unsold</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{auctionStats.unsold}</div>
                  </motion.div>
                </div>

                {/* Most Active Team */}
                {auctionStats.mostActiveTeam && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/5 rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Award className="w-5 h-5 text-blue-400" />
                      <span className="text-gray-400 text-sm">Most Active Team</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: auctionStats.mostActiveTeam.primaryColor }}
                      >
                        {auctionStats.mostActiveTeam.logo ? (
                          <img src={auctionStats.mostActiveTeam.logo} alt="" className="w-8 h-8 object-contain" />
                        ) : (
                          auctionStats.mostActiveTeam.shortName?.slice(0, 2)
                        )}
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-white">{auctionStats.mostActiveTeam.name}</div>
                        <div className="text-sm text-gray-400">{auctionStats.mostActiveCount} players acquired</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Center Column - Waiting Message */}
              <div className="col-span-3 flex flex-col items-center justify-center">
                <motion.div
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="mb-6"
                >
                  <motion.img
                    src="/bwpl-2026-logo.png"
                    alt="BWPL 2026"
                    className="w-36 h-auto"
                    animate={{
                      filter: [
                        'drop-shadow(0 0 15px rgba(227,24,55,0.3))',
                        'drop-shadow(0 0 30px rgba(227,24,55,0.5))',
                        'drop-shadow(0 0 15px rgba(227,24,55,0.3))'
                      ]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                  />
                </motion.div>
                <h2 className="text-2xl font-display font-bold text-white mb-2 text-center">
                  Next Player Coming Up
                </h2>
                <p className="text-gray-400 text-center">
                  {auctionStats.available} players remaining
                </p>

                {/* Animated dots */}
                <div className="flex gap-2 mt-4">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                      className="w-3 h-3 rounded-full bg-[var(--bwpl-primary)]"
                    />
                  ))}
                </div>
              </div>

              {/* Right Column - Top 3 Bids & Recent */}
              <div className="col-span-4 flex flex-col gap-6">
                {/* Top 3 Bids */}
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white/5 rounded-2xl p-5 border border-white/10 flex-1"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-[var(--bwpl-primary)]" />
                    <span className="text-white font-semibold">Top 3 Highest Bids</span>
                  </div>
                  <div className="space-y-3">
                    {auctionStats.topBids.map((player, idx) => (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * idx }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-yellow-500 text-black' :
                            idx === 1 ? 'bg-gray-400 text-black' :
                              'bg-amber-700 text-white'
                          }`}>
                          {idx + 1}
                        </div>
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                          {player.photo ? (
                            <img src={player.photo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">👤</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium truncate">{player.name}</div>
                          <div className="text-xs text-gray-400 flex items-center gap-1">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: player.team?.primaryColor }}
                            />
                            {player.team?.shortName}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${idx === 0 ? 'text-yellow-400' : 'text-white'}`}>
                            {formatCurrency(player.soldPrice, { compact: true })}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {auctionStats.topBids.length === 0 && (
                      <div className="text-center text-gray-500 py-8">
                        No bids yet
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Highest Spending Team */}
                {auctionStats.highestSpendingTeam && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="bg-gradient-to-r from-[var(--bwpl-primary)]/20 to-purple-500/20 rounded-xl p-4 border border-[var(--bwpl-primary)]/30"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="w-5 h-5 text-[var(--bwpl-primary)]" />
                      <span className="text-gray-400 text-sm">Highest Spender</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: auctionStats.highestSpendingTeam.primaryColor }}
                        >
                          {auctionStats.highestSpendingTeam.logo ? (
                            <img src={auctionStats.highestSpendingTeam.logo} alt="" className="w-6 h-6 object-contain" />
                          ) : (
                            auctionStats.highestSpendingTeam.shortName?.slice(0, 2)
                          )}
                        </div>
                        <span className="text-white font-medium">{auctionStats.highestSpendingTeam.shortName}</span>
                      </div>
                      <div className="text-xl font-bold text-[var(--bwpl-primary)]">
                        {formatCurrency(auctionStats.highestSpendingAmount, { compact: true })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full p-8 bg-gradient-to-br ${tierGradients[currentPlayer.tier]}`}>
      {/* Enhanced Confetti for sold */}
      <EnhancedConfetti active={showSold} teamColor={soldToTeam?.primaryColor} />
      <Sparkles active={showSparkles} />

      {/* Main Content */}
      <div className="h-full flex flex-col">
        {/* Top Bar - League Name, Tier & Status */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <span className="text-2xl font-display text-white/80">
              {config?.leagueName || 'BWPL'} AUCTION {config?.seasonYear}
            </span>
            {/* Status Indicator */}
            <AuctionStatus isLive={isLive} isPaused={isPaused} />
          </div>

          {/* Tier Badge */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="flex items-center gap-3 px-6 py-3 rounded-full"
            style={{
              background: `linear-gradient(135deg, ${tierConfig?.color}40, ${tierConfig?.color}20)`,
              boxShadow: tierGlows[currentPlayer.tier]
            }}
          >
            <TierIcon
              className="w-8 h-8"
              style={{ color: tierConfig?.color }}
            />
            <span
              className="text-xl font-bold uppercase tracking-wider"
              style={{ color: tierConfig?.color }}
            >
              {tierConfig?.name || 'Player'}
            </span>
          </motion.div>
        </motion.div>

        {/* Player Card - Redesigned with smaller photo */}
        <div className="flex-1 flex flex-col gap-6">

          {/* Top: Player Info Bar */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-6 p-4 glass rounded-2xl"
          >
            {/* Compact Photo */}
            <div
              className="relative w-28 h-28 rounded-2xl overflow-hidden flex-shrink-0 cursor-pointer group"
              style={{ boxShadow: tierGlows[currentPlayer.tier] }}
              onClick={() => setShowStatsModal(true)}
            >
              {currentPlayer.photo ? (
                <img
                  src={currentPlayer.photo}
                  alt={currentPlayer.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                  <span className="text-4xl">{getRoleIcon(currentPlayer.role)}</span>
                </div>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Stats
                </span>
              </div>
            </div>

            {/* Player Details */}
            <div className="flex-1 min-w-0">
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-4xl font-display text-white truncate"
              >
                {currentPlayer.name}
              </motion.h1>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-3 mt-2"
              >
                <span className="text-lg text-gray-300">{currentPlayer.role}</span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400">{currentPlayer.battingStyle}</span>
                {currentPlayer.bowlingStyle && currentPlayer.bowlingStyle !== '-' && (
                  <>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-400">{currentPlayer.bowlingStyle}</span>
                  </>
                )}
              </motion.div>
            </div>

            {/* Tier Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-1"
            >
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: `${tierConfig?.color}20`,
                  border: `2px solid ${tierConfig?.color}`
                }}
              >
                <TierIcon
                  className="w-8 h-8"
                  style={{ color: tierConfig?.color }}
                />
              </div>
              <span
                className="text-sm font-semibold"
                style={{ color: tierConfig?.color }}
              >
                {tierConfig?.name}
              </span>
            </motion.div>
          </motion.div>

          {/* Middle: Current Bid - Hero Element */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex-1 glass rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden"
          >
            {/* Animated background */}
            <div className="absolute inset-0 opacity-20">
              <div
                className="absolute inset-0 animate-pulse"
                style={{
                  background: `radial-gradient(circle at center, ${tierConfig?.color}40, transparent 70%)`
                }}
              />
            </div>

            <p className="text-xl text-gray-400 mb-4 relative z-10">Current Bid</p>

            <div className="relative z-10">
              <AnimatedCurrency
                value={currentBid}
                className="text-8xl font-display tracking-tight"
                style={{ color: tierConfig?.color }}
              />
            </div>

            {/* Base Price */}
            <p className="text-gray-500 mt-2 relative z-10">
              Base: {formatCurrency(tierConfig?.basePrice || 0)}
            </p>

            {/* Bidding Team */}
            <AnimatePresence mode="wait">
              {biddingTeam && (
                <motion.div
                  key={biddingTeam.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mt-8 flex items-center gap-4 px-8 py-4 rounded-full relative z-10"
                  style={{
                    backgroundColor: `${biddingTeam.primaryColor}30`,
                    border: `2px solid ${biddingTeam.primaryColor}`
                  }}
                >
                  {biddingTeam.logo ? (
                    <img
                      src={biddingTeam.logo}
                      alt={biddingTeam.name}
                      className="w-14 h-14 rounded-xl object-cover"
                    />
                  ) : (
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold text-white"
                      style={{ backgroundColor: biddingTeam.primaryColor }}
                    >
                      {biddingTeam.shortName?.[0]}
                    </div>
                  )}
                  <span className="text-3xl font-display text-white">{biddingTeam.name}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* No bidder yet */}
            {!biddingTeam && currentBid > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 text-gray-500 relative z-10"
              >
                Awaiting bids...
              </motion.p>
            )}
          </motion.div>

          {/* Bottom: Quick Stats - BWPL Format */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-3"
          >
            {[
              { label: 'Matches', value: currentPlayer.stats?.matches || 0 },
              { label: 'Runs', value: currentPlayer.stats?.runs || 0 },
              { label: 'Avg', value: currentPlayer.stats?.average?.toFixed(1) || '-' },
              { label: 'SR', value: currentPlayer.stats?.strikeRate?.toFixed(0) || '-' },
              { label: 'Wkts', value: currentPlayer.stats?.wickets || 0 },
              { label: 'Econ', value: currentPlayer.stats?.economy?.toFixed(1) || '-' },
              { label: '30/50/100', value: `${currentPlayer.stats?.thirties || 0}/${currentPlayer.stats?.fifties || 0}/${currentPlayer.stats?.hundreds || 0}` },
              { label: 'Dismiss', value: currentPlayer.stats?.dismissals || 0 }
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 + i * 0.03 }}
                className="glass rounded-xl p-2 md:p-3 text-center"
              >
                <p className="text-lg md:text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Bottom: Team Purses with Affordability */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 flex justify-center gap-3 flex-wrap"
        >
          {teams.map(team => {
            const isActive = currentBiddingTeamId === team.id;
            const affordability = canTeamAffordBid(team, currentBid, config);
            const maxBid = getMaxBid(team, config);
            const canAfford = affordability.canAfford;
            const isSquadFull = affordability.isSquadFull;
            const isNegative = team.remainingPurse < 0;

            return (
              <motion.div
                key={team.id}
                animate={{
                  scale: isActive ? 1.1 : 1,
                  boxShadow: isActive ? `0 0 30px ${team.primaryColor}` : 'none'
                }}
                className={`
                  relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                  ${isActive ? 'bg-white/20 ring-2 ring-white/50' : 'bg-white/5'}
                  ${!canAfford ? 'opacity-60' : ''}
                `}
              >
                {/* Affordability indicator */}
                <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center ${isSquadFull ? 'bg-orange-500' : canAfford ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                  {isSquadFull ? (
                    <Users className="w-3.5 h-3.5 text-white" />
                  ) : canAfford ? (
                    <CheckCircle className="w-4 h-4 text-white" />
                  ) : (
                    <XCircle className="w-4 h-4 text-white" />
                  )}
                </div>

                {team.logo ? (
                  <img src={team.logo} alt={team.name} className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: team.primaryColor }}
                  >
                    {team.shortName}
                  </div>
                )}
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">{team.shortName}</p>
                  <p className={`text-xs ${isNegative ? 'text-red-400' : 'text-gray-400'}`}>
                    Purse: {formatCurrency(team.remainingPurse, { compact: true })}
                  </p>
                  <p className={`text-xs font-medium ${isSquadFull ? 'text-orange-400' : canAfford ? 'text-green-400' : 'text-red-400'
                    }`}>
                    {isSquadFull
                      ? 'Squad Full'
                      : `Max: ${formatCurrency(maxBid, { compact: true })}`
                    }
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* SOLD Overlay */}
      <AnimatePresence>
        {showSold && soldToTeam && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60"
          >
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="text-center"
            >
              {/* Team Logo */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="mb-8"
              >
                {soldToTeam.logo ? (
                  <img
                    src={soldToTeam.logo}
                    alt={soldToTeam.name}
                    className="w-40 h-40 rounded-3xl object-cover mx-auto"
                    style={{ boxShadow: `0 0 60px ${soldToTeam.primaryColor}` }}
                  />
                ) : (
                  <div
                    className="w-40 h-40 rounded-3xl flex items-center justify-center text-6xl font-bold text-white mx-auto"
                    style={{
                      backgroundColor: soldToTeam.primaryColor,
                      boxShadow: `0 0 60px ${soldToTeam.primaryColor}`
                    }}
                  >
                    {soldToTeam.shortName}
                  </div>
                )}
              </motion.div>

              {/* SOLD Text */}
              <motion.div
                initial={{ scale: 3, opacity: 0, rotate: -15 }}
                animate={{ scale: 1, opacity: 1, rotate: -8 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                className="mb-4"
              >
                <span
                  className="text-8xl font-display tracking-wider px-12 py-4 rounded-xl inline-block"
                  style={{
                    color: '#22C55E',
                    textShadow: '0 0 30px rgba(34, 197, 94, 0.5)',
                    border: '6px solid #22C55E'
                  }}
                >
                  SOLD!
                </span>
              </motion.div>

              {/* Price */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-5xl font-display text-white"
              >
                {formatCurrency(soldPrice)}
              </motion.p>

              {/* Team Name */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-2xl text-gray-300 mt-4"
              >
                to {soldToTeam.name}
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UNSOLD Overlay */}
      <AnimatePresence>
        {showUnsold && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60"
          >
            <motion.div
              initial={{ scale: 3, opacity: 0, rotate: -15 }}
              animate={{ scale: 1, opacity: 1, rotate: -8 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <span
                className="text-8xl font-display tracking-wider px-12 py-4 rounded-xl inline-block"
                style={{
                  color: '#EF4444',
                  textShadow: '0 0 30px rgba(239, 68, 68, 0.5)',
                  border: '6px solid #EF4444'
                }}
              >
                UNSOLD
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player Stats Modal */}
      <PlayerStatsModal
        player={currentPlayer}
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        tierConfig={tierConfig}
      />
    </div>
  );
}