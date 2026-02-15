import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Upload,
  X,
  Users,
  AlertTriangle,
  Lock,
  UserPlus,
  Search
} from 'lucide-react';
import { useTeamStore, usePlayerStore, useConfigStore } from '../../stores';
import { Button, Card, CardContent, Modal } from '../../components/common';
import { formatCurrency, fileToBase64, resizeImage } from '../../utils';

const defaultColors = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', 
  '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6',
  '#6366F1', '#8B5CF6', '#A855F7', '#EC4899'
];

// Get default purse - only use config value, NO hardcoded fallback
function getDefaultPurse(config) {
  return config?.totalPursePerTeam ?? 0;
}

export default function Teams() {
  const teams = useTeamStore(state => state.teams);
  const addTeam = useTeamStore(state => state.addTeam);
  const updateTeam = useTeamStore(state => state.updateTeam);
  const deleteTeam = useTeamStore(state => state.deleteTeam);
  const fetchTeams = useTeamStore(state => state.fetchTeams);
  const retainPlayer = useTeamStore(state => state.retainPlayer);
  const releaseRetainedPlayer = useTeamStore(state => state.releaseRetainedPlayer);
  const players = usePlayerStore(state => state.players);
  const config = useConfigStore(state => state.config);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [purseWarning, setPurseWarning] = useState(null);
  const fileInputRef = useRef(null);
  
  // Retention modal state
  const [showRetentionModal, setShowRetentionModal] = useState(false);
  const [retentionTeam, setRetentionTeam] = useState(null);
  const [retentionSearch, setRetentionSearch] = useState('');
  const [selectedPlayerForRetention, setSelectedPlayerForRetention] = useState(null);
  const [retentionPrice, setRetentionPrice] = useState(0);
  const [retaining, setRetaining] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    logo: null,
    initialPurse: 0
  });
  
  // Update default purse when config loads
  useEffect(() => {
    if (config && !isModalOpen && !editingTeam) {
      setFormData(prev => ({
        ...prev,
        initialPurse: getDefaultPurse(config)
      }));
    }
  }, [config, isModalOpen, editingTeam]);
  
  const openModal = (team = null) => {
    setPurseWarning(null);
    
    if (team) {
      setEditingTeam(team);
      setFormData({
        name: team.name,
        shortName: team.shortName,
        primaryColor: team.primaryColor,
        secondaryColor: team.secondaryColor,
        logo: team.logo,
        initialPurse: team.initialPurse
      });
    } else {
      setEditingTeam(null);
      setFormData({
        name: '',
        shortName: '',
        primaryColor: defaultColors[teams.length % defaultColors.length],
        secondaryColor: '#1E40AF',
        logo: null,
        initialPurse: getDefaultPurse(config)
      });
    }
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTeam(null);
    setPurseWarning(null);
  };
  
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const base64 = await fileToBase64(file);
      const resized = await resizeImage(base64, 200, 200);
      setFormData(prev => ({ ...prev, logo: resized }));
    } catch (error) {
      console.error('Error uploading logo:', error);
    }
  };
  
  // Check if purse change would cause negative remaining
  const checkPurseImpact = (newPurse) => {
    if (!editingTeam) return null;
    
    const spent = editingTeam.initialPurse - editingTeam.remainingPurse;
    const newRemaining = newPurse - spent;
    
    if (newRemaining < 0) {
      return {
        type: 'error',
        message: `This team has spent ${formatCurrency(spent)}. New purse would result in negative balance of ${formatCurrency(newRemaining)}.`
      };
    } else if (spent > 0 && newPurse < editingTeam.initialPurse) {
      return {
        type: 'warning',
        message: `Team has spent ${formatCurrency(spent)}. New remaining purse will be ${formatCurrency(newRemaining)}.`
      };
    }
    return null;
  };
  
  const handlePurseChange = (value) => {
    const numValue = parseInt(value) || 0;
    setFormData(prev => ({ ...prev, initialPurse: numValue }));
    setPurseWarning(checkPurseImpact(numValue));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (formData.initialPurse < 0) {
      alert('Purse cannot be negative');
      return;
    }
    
    // Check for negative remaining on edit
    if (editingTeam) {
      const spent = editingTeam.initialPurse - editingTeam.remainingPurse;
      if (formData.initialPurse < spent) {
        const confirm = window.confirm(
          `Warning: Team has already spent ${formatCurrency(spent)}. ` +
          `Setting purse to ${formatCurrency(formData.initialPurse)} will result in negative balance. ` +
          `Continue anyway?`
        );
        if (!confirm) return;
      }
    }
    
    setSaving(true);
    try {
      if (editingTeam) {
        await updateTeam(editingTeam.id, formData);
      } else {
        await addTeam(formData);
      }
      await fetchTeams();
      closeModal();
    } catch (error) {
      console.error('Error saving team:', error);
      alert('Failed to save team: ' + error.message);
    }
    setSaving(false);
  };
  
  const handleDelete = async (team) => {
    if (isDeleting === team.id) {
      await deleteTeam(team.id);
      await fetchTeams();
      setIsDeleting(null);
    } else {
      setIsDeleting(team.id);
      setTimeout(() => setIsDeleting(null), 3000);
    }
  };
  
  const getTeamPlayers = (teamId) => {
    return players.filter(p => p.soldToTeamId === teamId);
  };
  
  // Get retained players for a team
  const getRetainedPlayers = (teamId) => {
    return players.filter(p => p.isRetained && p.retainedByTeamId === teamId);
  };
  
  // Get available players for retention (not retained, not sold)
  const getAvailableForRetention = () => {
    return players.filter(p => !p.isRetained && p.status === 'available');
  };
  
  // Filter available players by search
  const filteredPlayersForRetention = getAvailableForRetention().filter(p => 
    retentionSearch.trim() === '' || 
    p.name.toLowerCase().includes(retentionSearch.toLowerCase())
  );
  
  // Get tier base price
  const getTierBasePrice = (tierId) => {
    const tier = config?.tiers?.find(t => t.id === tierId);
    return tier?.basePrice || 100000;
  };
  
  // Open retention modal
  const openRetentionModal = (team) => {
    setRetentionTeam(team);
    setRetentionSearch('');
    setSelectedPlayerForRetention(null);
    setRetentionPrice(0);
    setShowRetentionModal(true);
  };
  
  // Handle player selection for retention
  const handleSelectPlayerForRetention = (player) => {
    setSelectedPlayerForRetention(player);
    setRetentionPrice(getTierBasePrice(player.tier));
  };
  
  // Handle retention submit
  const handleRetainPlayer = async () => {
    if (!selectedPlayerForRetention || !retentionTeam || retentionPrice <= 0) return;
    
    setRetaining(true);
    try {
      await retainPlayer(retentionTeam.id, selectedPlayerForRetention.id, retentionPrice);
      setShowRetentionModal(false);
      setSelectedPlayerForRetention(null);
    } catch (error) {
      console.error('Retention failed:', error);
      alert(error.message);
    } finally {
      setRetaining(false);
    }
  };
  
  // Handle release retained player
  const handleReleasePlayer = async (teamId, playerId) => {
    if (!confirm('Are you sure you want to release this retained player?')) return;
    
    try {
      await releaseRetainedPlayer(teamId, playerId);
    } catch (error) {
      console.error('Release failed:', error);
      alert(error.message);
    }
  };
  
  // Max retentions from config
  const maxRetentions = config?.maxRetentionsPerTeam || 3;
  
  // Calculate spent amount for a team
  const getSpentAmount = (team) => {
    return team.initialPurse - team.remainingPurse;
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Teams</h1>
          <p className="text-gray-400 mt-1">
            Manage participating teams in the auction
          </p>
        </div>
        <Button onClick={() => openModal()} icon={Plus}>
          Add Team
        </Button>
      </div>
      
      {/* Teams Grid */}
      {teams.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No teams yet</h3>
            <p className="text-gray-400 mb-6">
              Add teams to start the auction setup
            </p>
            <Button onClick={() => openModal()} icon={Plus}>
              Add First Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {teams.map((team, index) => {
              const teamPlayers = getTeamPlayers(team.id);
              return (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="overflow-hidden">
                    {/* Team Header with Color */}
                    <div 
                      className="h-24 relative"
                      style={{ 
                        background: `linear-gradient(135deg, ${team.primaryColor}, ${team.secondaryColor || team.primaryColor})`
                      }}
                    >
                      <div className="absolute inset-0 bg-black/20" />
                      <div className="absolute -bottom-8 left-4">
                        {team.logo ? (
                          <img 
                            src={team.logo} 
                            alt={team.name}
                            className="w-16 h-16 rounded-xl object-cover border-4 border-[var(--bg-surface)]"
                          />
                        ) : (
                          <div 
                            className="w-16 h-16 rounded-xl border-4 border-[var(--bg-surface)] flex items-center justify-center text-2xl font-bold text-white"
                            style={{ backgroundColor: team.primaryColor }}
                          >
                            {team.shortName?.[0] || team.name?.[0] || 'T'}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <CardContent className="pt-10">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-white">{team.name}</h3>
                          <p className="text-sm text-gray-400">{team.shortName}</p>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => openModal(team)}
                            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(team)}
                            className={`p-2 rounded-lg transition-colors ${
                              isDeleting === team.id 
                                ? 'bg-red-500/20 text-red-400' 
                                : 'hover:bg-white/10 text-gray-400 hover:text-white'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Players</span>
                          <span className="text-white font-medium">
                            {teamPlayers.length} / {config?.maxPlayersPerTeam || 15}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Budget</span>
                          <span className="text-gray-300 font-medium">
                            {formatCurrency(team.initialPurse, { compact: true })}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Remaining</span>
                          <span className={`font-medium ${team.remainingPurse < 0 ? 'text-red-400' : 'text-[var(--bwpl-primary)]'}`}>
                            {formatCurrency(team.remainingPurse, { compact: true })}
                          </span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${team.remainingPurse < 0 ? 'bg-red-500' : 'bg-[var(--bwpl-primary)]'}`}
                            style={{ 
                              width: `${team.initialPurse > 0 ? Math.max(0, Math.min(100, (team.remainingPurse / team.initialPurse) * 100)) : 0}%` 
                            }}
                          />
                        </div>
                        
                        {/* Retained Players Section */}
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Lock className="w-4 h-4 text-amber-400" />
                              <span className="text-sm text-gray-400">Retained</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {getRetainedPlayers(team.id).length}/{maxRetentions}
                            </span>
                          </div>
                          
                          {/* Retained players list */}
                          <div className="space-y-1">
                            {getRetainedPlayers(team.id).map(player => (
                              <div 
                                key={player.id}
                                className="flex items-center justify-between py-1.5 px-2 rounded bg-amber-500/10"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-sm text-white truncate">{player.name}</span>
                                  <span className="text-xs text-amber-400">
                                    {formatCurrency(player.retainedPrice, { compact: true })}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleReleasePlayer(team.id, player.id)}
                                  className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
                                  title="Release player"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                          
                          {/* Add retention button */}
                          {getRetainedPlayers(team.id).length < maxRetentions && (
                            <button
                              onClick={() => openRetentionModal(team)}
                              className="mt-2 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-dashed border-white/20 hover:border-amber-400/50 hover:bg-amber-400/5 text-gray-400 hover:text-amber-400 transition-colors text-sm"
                            >
                              <UserPlus className="w-4 h-4" />
                              <span>Add Retention</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
      
      {/* Add/Edit Team Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingTeam ? 'Edit Team' : 'Add New Team'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo Upload */}
          <div className="flex justify-center">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="relative w-24 h-24 rounded-xl border-2 border-dashed border-white/20 hover:border-[var(--bwpl-primary)] cursor-pointer transition-colors overflow-hidden group"
            >
              {formData.logo ? (
                <>
                  <img 
                    src={formData.logo} 
                    alt="Team logo" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Upload className="w-6 h-6 mb-1" />
                  <span className="text-xs">Logo</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>
          
          {/* Team Name */}
          <div>
            <label className="label">Team Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Willow Warriors"
              className="input-field"
              required
            />
          </div>
          
          {/* Short Name */}
          <div>
            <label className="label">Short Name / Abbreviation</label>
            <input
              type="text"
              value={formData.shortName}
              onChange={(e) => setFormData(prev => ({ ...prev, shortName: e.target.value.toUpperCase().slice(0, 4) }))}
              placeholder="e.g., WW"
              maxLength={4}
              className="input-field"
              required
            />
          </div>
          
          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Primary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="w-12 h-10 rounded cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="input-field flex-1"
                />
              </div>
            </div>
            <div>
              <label className="label">Secondary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                  className="w-12 h-10 rounded cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                  className="input-field flex-1"
                />
              </div>
            </div>
          </div>
          
          {/* Quick Color Picker */}
          <div>
            <label className="label">Quick Colors</label>
            <div className="flex flex-wrap gap-2">
              {defaultColors.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, primaryColor: color }))}
                  className={`w-8 h-8 rounded-lg transition-transform hover:scale-110 ${
                    formData.primaryColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--bg-surface)]' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          
          {/* Initial Purse */}
          <div>
            <label className="label">Initial Purse (₹)</label>
            <input
              type="number"
              value={formData.initialPurse}
              onChange={(e) => handlePurseChange(e.target.value)}
              className={`input-field ${purseWarning?.type === 'error' ? 'border-red-500' : ''}`}
            />
            <p className="text-xs text-gray-400 mt-1">
              {formatCurrency(formData.initialPurse, { compact: true })}
              {editingTeam && getSpentAmount(editingTeam) > 0 && (
                <span className="ml-2 text-amber-400">
                  (Spent: {formatCurrency(getSpentAmount(editingTeam), { compact: true })})
                </span>
              )}
            </p>
            
            {/* Purse change warning/error */}
            {purseWarning && (
              <div className={`flex items-start gap-2 mt-2 p-2 rounded text-sm ${
                purseWarning.type === 'error' 
                  ? 'bg-red-500/10 text-red-400' 
                  : 'bg-amber-500/10 text-amber-400'
              }`}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{purseWarning.message}</span>
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={saving} className="flex-1">
              {editingTeam ? 'Save Changes' : 'Add Team'}
            </Button>
          </div>
        </form>
      </Modal>
      
      {/* Retention Modal */}
      <Modal
        isOpen={showRetentionModal}
        onClose={() => setShowRetentionModal(false)}
        title={`Retain Player - ${retentionTeam?.name || ''}`}
        size="md"
      >
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={retentionSearch}
              onChange={(e) => setRetentionSearch(e.target.value)}
              placeholder="Search player name..."
              className="input-field pl-10"
              autoFocus
            />
          </div>
          
          {/* Player List */}
          <div className="max-h-60 overflow-y-auto space-y-1 border border-white/10 rounded-lg p-2">
            {filteredPlayersForRetention.length === 0 ? (
              <p className="text-center text-gray-400 py-4">No available players</p>
            ) : (
              filteredPlayersForRetention.slice(0, 50).map(player => {
                const tierConfig = config?.tiers?.find(t => t.id === player.tier);
                const isSelected = selectedPlayerForRetention?.id === player.id;
                
                return (
                  <button
                    key={player.id}
                    onClick={() => handleSelectPlayerForRetention(player)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors text-left ${
                      isSelected 
                        ? 'bg-amber-500/20 border border-amber-500/50' 
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {player.photo ? (
                        <img src={player.photo} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs">
                          {player.name?.[0]}
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-white">{player.name}</p>
                        <p className="text-xs text-gray-400">{player.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span 
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ 
                          backgroundColor: `${tierConfig?.color}20`,
                          color: tierConfig?.color 
                        }}
                      >
                        {tierConfig?.name || player.tier}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">
                        Base: {formatCurrency(tierConfig?.basePrice || 0, { compact: true })}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          
          {/* Selected Player & Price */}
          {selectedPlayerForRetention && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="text-white font-medium">{selectedPlayerForRetention.name}</p>
                    <p className="text-xs text-gray-400">{selectedPlayerForRetention.role}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="label">Retention Price</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">₹</span>
                  <input
                    type="number"
                    value={retentionPrice}
                    onChange={(e) => setRetentionPrice(parseInt(e.target.value) || 0)}
                    className="input-field flex-1"
                    min="0"
                    step="10000"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Tier base: {formatCurrency(getTierBasePrice(selectedPlayerForRetention.tier), { compact: true })}
                </p>
              </div>
              
              {/* Purse warning */}
              {retentionTeam && retentionPrice > retentionTeam.remainingPurse && (
                <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/30 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-xs text-red-400">
                    Exceeds remaining purse ({formatCurrency(retentionTeam.remainingPurse, { compact: true })})
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button 
              variant="secondary" 
              onClick={() => setShowRetentionModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRetainPlayer}
              loading={retaining}
              disabled={!selectedPlayerForRetention || retentionPrice <= 0 || (retentionTeam && retentionPrice > retentionTeam.remainingPurse)}
              className="flex-1"
              icon={Lock}
            >
              Retain Player
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}