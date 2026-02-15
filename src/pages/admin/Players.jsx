import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Upload,
  Download,
  Search,
  Filter,
  UserCircle,
  RotateCcw,
  X,
  Award,
  Image,
  FolderUp,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { usePlayerStore, useTeamStore, useConfigStore } from '../../stores';
import { Button, Card, CardContent, Modal } from '../../components/common';
import { 
  formatCurrency, 
  fileToBase64, 
  resizeImage, 
  parsePlayerCSV,
  generatePlayerCSVTemplate,
  getTierInfo,
  getStatusInfo,
  getRoleIcon
} from '../../utils';

const roles = ['Batsman', 'Bowler', 'Batting All-Rounder', 'Bowling All-Rounder', 'All-Rounder', 'Wicket-keeper'];
const battingStyles = ['Right-hand bat', 'Left-hand bat'];
const bowlingStyles = [
  'Right-arm fast',
  'Right-arm medium',
  'Right-arm off-break',
  'Right-arm leg-break',
  'Left-arm fast',
  'Left-arm medium',
  'Left-arm orthodox',
  'Left-arm chinaman',
  '-'
];

export default function Players() {
  const players = usePlayerStore(state => state.players);
  const addPlayer = usePlayerStore(state => state.addPlayer);
  const updatePlayer = usePlayerStore(state => state.updatePlayer);
  const deletePlayer = usePlayerStore(state => state.deletePlayer);
  const resetPlayer = usePlayerStore(state => state.resetPlayer);
  const bulkAddPlayers = usePlayerStore(state => state.bulkAddPlayers);
  const bulkUpdatePhotos = usePlayerStore(state => state.bulkUpdatePhotos);
  const teams = useTeamStore(state => state.teams);
  const config = useConfigStore(state => state.config);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [importData, setImportData] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState(new Set());
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  
  // Photo upload state
  const [showPhotoUploadModal, setShowPhotoUploadModal] = useState(false);
  const [photoUploadResults, setPhotoUploadResults] = useState({ matched: [], unmatched: [] });
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  
  const fileInputRef = useRef(null);
  const csvInputRef = useRef(null);
  const photoFolderInputRef = useRef(null);
  
  const defaultFormData = {
    name: '',
    photo: null,
    role: 'Batsman',
    battingStyle: 'Right-hand bat',
    bowlingStyle: '-',
    tier: 'd-class',
    notes: '',
    previousTeamId: null, // For RTM (Right to Match)
    stats: {
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
    }
  };
  
  const [formData, setFormData] = useState(defaultFormData);
  
  // Filtered players
  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTier = filterTier === 'all' || player.tier === filterTier;
      const matchesStatus = filterStatus === 'all' || player.status === filterStatus;
      return matchesSearch && matchesTier && matchesStatus;
    });
  }, [players, searchQuery, filterTier, filterStatus]);
  
  // Selection handlers
  const togglePlayerSelection = (playerId) => {
    setSelectedPlayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };
  
  const toggleSelectAll = () => {
    if (selectedPlayers.size === filteredPlayers.length) {
      setSelectedPlayers(new Set());
    } else {
      setSelectedPlayers(new Set(filteredPlayers.map(p => p.id)));
    }
  };
  
  const clearSelection = () => {
    setSelectedPlayers(new Set());
  };
  
  const isAllSelected = filteredPlayers.length > 0 && selectedPlayers.size === filteredPlayers.length;
  const isSomeSelected = selectedPlayers.size > 0;
  
  // Bulk delete handlers
  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      for (const playerId of selectedPlayers) {
        await deletePlayer(playerId);
      }
      setSelectedPlayers(new Set());
      setShowBulkDeleteModal(false);
    } catch (error) {
      console.error('Error bulk deleting players:', error);
      alert('Failed to delete some players');
    }
    setBulkDeleting(false);
  };
  
  const handleDeleteAll = async () => {
    setBulkDeleting(true);
    try {
      for (const player of players) {
        await deletePlayer(player.id);
      }
      setSelectedPlayers(new Set());
      setShowDeleteAllModal(false);
    } catch (error) {
      console.error('Error deleting all players:', error);
      alert('Failed to delete all players');
    }
    setBulkDeleting(false);
  };
  
  // Handle folder upload for photos
  // Photos should be named by externalId (from CSV 'id' column) e.g., 00057.jpg
  const handlePhotoFolderUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setUploadingPhotos(true);
    const matched = [];
    const unmatched = [];
    
    try {
      // Build lookup maps for matching photos to players
      // Priority 1: externalId (from CSV 'id' column) - e.g., "00057"
      // Priority 2: internal database id - e.g., "1", "2", "3"
      const externalIdMap = new Map();
      const internalIdMap = new Map();
      
      players.forEach(p => {
        // Map by externalId (from CSV) - primary matching method
        if (p.externalId) {
          externalIdMap.set(String(p.externalId), p);
        }
        // Also map by internal id as fallback
        internalIdMap.set(String(p.id), p);
      });
      
      for (const file of files) {
        // Get filename without extension (e.g., "00057.jpg" → "00057")
        const fileName = file.name.replace(/\.[^/.]+$/, '');
        
        // Try to match: first by externalId, then by internal id
        let player = externalIdMap.get(fileName) || internalIdMap.get(fileName);
        
        if (player) {
          try {
            const base64 = await fileToBase64(file);
            const resized = await resizeImage(base64, 300, 300);
            matched.push({ 
              playerId: player.id, 
              playerName: player.name,
              externalId: player.externalId || null,
              fileName: file.name,
              photo: resized 
            });
          } catch (err) {
            console.error(`Error processing ${file.name}:`, err);
            unmatched.push({ fileName: file.name, reason: 'Failed to process image' });
          }
        } else {
          unmatched.push({ fileName: file.name, reason: `No player with ID "${fileName}"` });
        }
      }
      
      setPhotoUploadResults({ matched, unmatched });
      setShowPhotoUploadModal(true);
    } catch (error) {
      console.error('Error processing photos:', error);
      alert('Failed to process photos');
    }
    
    setUploadingPhotos(false);
    // Reset input
    if (photoFolderInputRef.current) {
      photoFolderInputRef.current.value = '';
    }
  };
  
  // Apply matched photos
  const handleApplyPhotos = async () => {
    if (photoUploadResults.matched.length === 0) return;
    
    setUploadingPhotos(true);
    try {
      const photoMappings = {};
      photoUploadResults.matched.forEach(m => {
        photoMappings[m.playerId] = m.photo;
      });
      
      await bulkUpdatePhotos(photoMappings);
      setShowPhotoUploadModal(false);
      setPhotoUploadResults({ matched: [], unmatched: [] });
    } catch (error) {
      console.error('Error applying photos:', error);
      alert('Failed to apply photos');
    }
    setUploadingPhotos(false);
  };
  
  const openModal = (player = null) => {
    if (player) {
      setEditingPlayer(player);
      setFormData({
        name: player.name,
        photo: player.photo,
        role: player.role,
        battingStyle: player.battingStyle,
        bowlingStyle: player.bowlingStyle,
        tier: player.tier,
        notes: player.notes || '',
        previousTeamId: player.previousTeamId || null,
        stats: { ...defaultFormData.stats, ...player.stats }
      });
    } else {
      setEditingPlayer(null);
      setFormData(defaultFormData);
    }
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPlayer(null);
  };
  
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const base64 = await fileToBase64(file);
      const resized = await resizeImage(base64, 300, 300);
      setFormData(prev => ({ ...prev, photo: resized }));
    } catch (error) {
      console.error('Error uploading photo:', error);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingPlayer) {
        await updatePlayer(editingPlayer.id, formData);
      } else {
        await addPlayer(formData);
      }
      closeModal();
    } catch (error) {
      console.error('Error saving player:', error);
    }
  };
  
  const handleDelete = async (player) => {
    if (isDeleting === player.id) {
      await deletePlayer(player.id);
      setIsDeleting(null);
    } else {
      setIsDeleting(player.id);
      setTimeout(() => setIsDeleting(null), 3000);
    }
  };
  
  const handleReset = async (player) => {
    await resetPlayer(player.id);
  };
  
  const handleCSVUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const text = await file.text();
    const parsed = parsePlayerCSV(text);
    setImportData(parsed);
  };
  
  const handleImport = async () => {
    if (importData.length === 0) return;
    
    await bulkAddPlayers(importData);
    setIsImportModalOpen(false);
    setImportData([]);
  };
  
  const downloadTemplate = () => {
    const template = generatePlayerCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'player_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown';
  };
  
  const getBasePrice = (tier) => {
    const tierConfig = config?.tiers?.find(t => t.id === tier);
    return tierConfig?.basePrice || 50000;
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Players</h1>
          <p className="text-gray-400 mt-1">
            {players.length} players in pool
          </p>
        </div>
        <div className="flex gap-2">
          {players.length > 0 && (
            <Button 
              variant="danger" 
              onClick={() => setShowDeleteAllModal(true)} 
              icon={Trash2}
            >
              Delete All
            </Button>
          )}
          <Button 
            variant="secondary" 
            onClick={() => photoFolderInputRef.current?.click()} 
            icon={FolderUp}
            loading={uploadingPhotos}
          >
            Upload Photos
          </Button>
          <input
            ref={photoFolderInputRef}
            type="file"
            multiple
            accept="image/*"
            webkitdirectory=""
            directory=""
            className="hidden"
            onChange={handlePhotoFolderUpload}
          />
          <Button variant="secondary" onClick={() => setIsImportModalOpen(true)} icon={Upload}>
            Import CSV
          </Button>
          <Button onClick={() => openModal()} icon={Plus}>
            Add Player
          </Button>
        </div>
      </div>
      
      {/* Selection Actions Bar */}
      {isSomeSelected && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--bwpl-primary)]/20 border border-[var(--bwpl-primary)]/50 rounded-xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="text-white font-medium">
              {selectedPlayers.size} player{selectedPlayers.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={clearSelection}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear selection
            </button>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowBulkDeleteModal(true)}
            icon={Trash2}
          >
            Delete Selected
          </Button>
        </motion.div>
      )}
      
      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          
          {/* Tier Filter */}
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="select-field w-40"
          >
            <option value="all">All Tiers</option>
            {config?.tiers?.map(tier => (
              <option key={tier.id} value={tier.id}>{tier.name}</option>
            ))}
          </select>
          
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="select-field w-40"
          >
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="sold">Sold</option>
            <option value="unsold">Unsold</option>
          </select>
        </CardContent>
      </Card>
      
      {/* Players Table */}
      {filteredPlayers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <UserCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              {players.length === 0 ? 'No players yet' : 'No matching players'}
            </h3>
            <p className="text-gray-400 mb-6">
              {players.length === 0 
                ? 'Add players individually or import from CSV'
                : 'Try adjusting your search or filters'
              }
            </p>
            {players.length === 0 && (
              <div className="flex gap-2 justify-center">
                <Button variant="secondary" onClick={() => setIsImportModalOpen(true)} icon={Upload}>
                  Import CSV
                </Button>
                <Button onClick={() => openModal()} icon={Plus}>
                  Add Player
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-3 px-4 w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-[var(--bwpl-primary)] focus:ring-[var(--bwpl-primary)] focus:ring-offset-0 cursor-pointer"
                  />
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Player</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Role</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Tier</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Base Price</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredPlayers.map((player, index) => {
                  const tierInfo = getTierInfo(player.tier);
                  const statusInfo = getStatusInfo(player.status);
                  const isSelected = selectedPlayers.has(player.id);
                  
                  return (
                    <motion.tr
                      key={player.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.02 }}
                      className={`border-b border-white/5 hover:bg-white/5 ${isSelected ? 'bg-[var(--bwpl-primary)]/10' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePlayerSelection(player.id)}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-[var(--bwpl-primary)] focus:ring-[var(--bwpl-primary)] focus:ring-offset-0 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {player.photo ? (
                            <img 
                              src={player.photo} 
                              alt={player.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-lg">
                              {getRoleIcon(player.role)}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-white">{player.name}</p>
                              {player.previousTeamId && (
                                <span 
                                  className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400"
                                  title={`RTM: ${teams.find(t => t.id === player.previousTeamId)?.shortName || 'Unknown'}`}
                                >
                                  <Award className="w-3 h-3" />
                                  RTM
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400">
                              {player.stats?.matches || 0} matches • {player.stats?.runs || 0} runs
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-300">{player.role}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`badge ${tierInfo.colorClass}`}>
                          {tierInfo.icon} {tierInfo.name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-300">
                          {formatCurrency(getBasePrice(player.tier), { compact: true })}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <span className={`badge ${statusInfo.colorClass}`}>
                            {statusInfo.label}
                          </span>
                          {player.status === 'sold' && (
                            <p className="text-xs text-gray-400 mt-1">
                              {getTeamName(player.soldToTeamId)} • {formatCurrency(player.soldPrice, { compact: true })}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-1">
                          {player.status !== 'available' && (
                            <button 
                              onClick={() => handleReset(player)}
                              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                              title="Reset to available"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => openModal(player)}
                            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(player)}
                            className={`p-2 rounded-lg transition-colors ${
                              isDeleting === player.id 
                                ? 'bg-red-500/20 text-red-400' 
                                : 'hover:bg-white/10 text-gray-400 hover:text-white'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
      
      {/* Add/Edit Player Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingPlayer ? 'Edit Player' : 'Add New Player'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Photo Upload */}
              <div className="flex justify-center">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-24 h-24 rounded-xl border-2 border-dashed border-white/20 hover:border-[var(--bwpl-primary)] cursor-pointer transition-colors overflow-hidden group"
                >
                  {formData.photo ? (
                    <>
                      <img src={formData.photo} alt="Player" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Upload className="w-6 h-6 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <Upload className="w-6 h-6 mb-1" />
                      <span className="text-xs">Photo</span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
              
              {/* Name */}
              <div>
                <label className="label">Player Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter player name"
                  className="input-field"
                  required
                />
              </div>
              
              {/* Role */}
              <div>
                <label className="label">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  className="select-field"
                >
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              
              {/* Batting Style */}
              <div>
                <label className="label">Batting Style</label>
                <select
                  value={formData.battingStyle}
                  onChange={(e) => setFormData(prev => ({ ...prev, battingStyle: e.target.value }))}
                  className="select-field"
                >
                  {battingStyles.map(style => (
                    <option key={style} value={style}>{style}</option>
                  ))}
                </select>
              </div>
              
              {/* Bowling Style */}
              <div>
                <label className="label">Bowling Style</label>
                <select
                  value={formData.bowlingStyle}
                  onChange={(e) => setFormData(prev => ({ ...prev, bowlingStyle: e.target.value }))}
                  className="select-field"
                >
                  {bowlingStyles.map(style => (
                    <option key={style} value={style}>{style}</option>
                  ))}
                </select>
              </div>
              
              {/* Tier */}
              <div>
                <label className="label">Tier</label>
                <select
                  value={formData.tier}
                  onChange={(e) => setFormData(prev => ({ ...prev, tier: e.target.value }))}
                  className="select-field"
                >
                  {config?.tiers?.map(tier => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name} - {formatCurrency(tier.basePrice, { compact: true })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Right Column - Stats */}
            <div className="space-y-4">
              <h4 className="font-medium text-white">Statistics</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Matches</label>
                  <input
                    type="number"
                    value={formData.stats.matches}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      stats: { ...prev.stats, matches: parseInt(e.target.value) || 0 }
                    }))}
                    className="input-field"
                    min="0"
                  />
                </div>
                <div>
                  <label className="label">Innings</label>
                  <input
                    type="number"
                    value={formData.stats.innings}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      stats: { ...prev.stats, innings: parseInt(e.target.value) || 0 }
                    }))}
                    className="input-field"
                    min="0"
                  />
                </div>
                <div>
                  <label className="label">Runs</label>
                  <input
                    type="number"
                    value={formData.stats.runs}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      stats: { ...prev.stats, runs: parseInt(e.target.value) || 0 }
                    }))}
                    className="input-field"
                    min="0"
                  />
                </div>
                <div>
                  <label className="label">Highest Score</label>
                  <input
                    type="number"
                    value={formData.stats.highestScore}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      stats: { ...prev.stats, highestScore: parseInt(e.target.value) || 0 }
                    }))}
                    className="input-field"
                    min="0"
                  />
                </div>
                <div>
                  <label className="label">Average</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.stats.average}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      stats: { ...prev.stats, average: parseFloat(e.target.value) || 0 }
                    }))}
                    className="input-field"
                    min="0"
                  />
                </div>
                <div>
                  <label className="label">Strike Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.stats.strikeRate}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      stats: { ...prev.stats, strikeRate: parseFloat(e.target.value) || 0 }
                    }))}
                    className="input-field"
                    min="0"
                  />
                </div>
                <div>
                  <label className="label">Wickets</label>
                  <input
                    type="number"
                    value={formData.stats.wickets}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      stats: { ...prev.stats, wickets: parseInt(e.target.value) || 0 }
                    }))}
                    className="input-field"
                    min="0"
                  />
                </div>
                <div>
                  <label className="label">Economy</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.stats.economy}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      stats: { ...prev.stats, economy: parseFloat(e.target.value) || 0 }
                    }))}
                    className="input-field"
                    min="0"
                  />
                </div>
              </div>
              
              {/* Notes */}
              <div>
                <label className="label">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about the player..."
                  className="input-field resize-none"
                  rows={3}
                />
              </div>
              
              {/* Previous Team for RTM */}
              <div>
                <label className="label">Previous Team (RTM)</label>
                <select
                  value={formData.previousTeamId || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    previousTeamId: e.target.value ? parseInt(e.target.value) : null 
                  }))}
                  className="select-field"
                >
                  <option value="">No RTM (New Player)</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({team.shortName})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  If set, this team can use Right to Match during auction
                </p>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {editingPlayer ? 'Save Changes' : 'Add Player'}
            </Button>
          </div>
        </form>
      </Modal>
      
      {/* Import CSV Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportData([]);
        }}
        title="Import Players from CSV"
        size="lg"
      >
        <div className="space-y-6">
          {importData.length === 0 ? (
            <>
              <div 
                onClick={() => csvInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-[var(--bwpl-primary)] cursor-pointer transition-colors"
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-white font-medium mb-2">Click to upload CSV file</p>
                <p className="text-sm text-gray-400">or drag and drop</p>
              </div>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="hidden"
              />
              
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-sm text-gray-400">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              
              <Button 
                variant="secondary" 
                onClick={downloadTemplate} 
                icon={Download}
                className="w-full"
              >
                Download CSV Template
              </Button>
            </>
          ) : (
            <>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <p className="text-green-400 font-medium">
                  {importData.length} players found in CSV
                </p>
              </div>
              
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[var(--bg-surface)]">
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 px-3 text-gray-400">Name</th>
                      <th className="text-left py-2 px-3 text-gray-400">Role</th>
                      <th className="text-left py-2 px-3 text-gray-400">Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importData.map((player, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="py-2 px-3 text-white">{player.name}</td>
                        <td className="py-2 px-3 text-gray-300">{player.role || 'All-rounder'}</td>
                        <td className="py-2 px-3 text-gray-300">{player.tier || 'd-class'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="secondary" 
                  onClick={() => setImportData([])}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={handleImport} className="flex-1">
                  Import {importData.length} Players
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
      
      {/* Delete All Modal */}
      <Modal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        title="Delete All Players"
      >
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Trash2 className="w-8 h-8 text-red-400" />
              <div>
                <p className="text-red-400 font-medium">
                  Are you sure you want to delete all {players.length} players?
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  This action cannot be undone. All player data will be permanently removed.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="secondary" 
              onClick={() => setShowDeleteAllModal(false)}
              className="flex-1"
              disabled={bulkDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleDeleteAll}
              className="flex-1"
              disabled={bulkDeleting}
            >
              {bulkDeleting ? 'Deleting...' : `Delete All ${players.length} Players`}
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Bulk Delete Modal */}
      <Modal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        title="Delete Selected Players"
      >
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Trash2 className="w-8 h-8 text-red-400" />
              <div>
                <p className="text-red-400 font-medium">
                  Are you sure you want to delete {selectedPlayers.size} selected player{selectedPlayers.size !== 1 ? 's' : ''}?
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
          
          {/* Preview of players to delete */}
          <div className="max-h-40 overflow-y-auto">
            <div className="space-y-1">
              {Array.from(selectedPlayers).slice(0, 10).map(playerId => {
                const player = players.find(p => p.id === playerId);
                return player ? (
                  <div key={playerId} className="flex items-center gap-2 text-sm text-gray-300 py-1">
                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                    {player.name} ({getTierInfo(player.tier).name})
                  </div>
                ) : null;
              })}
              {selectedPlayers.size > 10 && (
                <p className="text-sm text-gray-400 py-1">
                  ...and {selectedPlayers.size - 10} more
                </p>
              )}
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="secondary" 
              onClick={() => setShowBulkDeleteModal(false)}
              className="flex-1"
              disabled={bulkDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleBulkDelete}
              className="flex-1"
              disabled={bulkDeleting}
            >
              {bulkDeleting ? 'Deleting...' : `Delete ${selectedPlayers.size} Players`}
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Photo Upload Results Modal */}
      <Modal
        isOpen={showPhotoUploadModal}
        onClose={() => setShowPhotoUploadModal(false)}
        title="Upload Player Photos"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            Photos are matched by filename to player ID from CSV. Example: <code className="text-white bg-white/10 px-1 rounded">00057.jpg</code> matches player with ID "00057"
          </p>
          
          {/* Matched Players */}
          {photoUploadResults.matched.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400 font-medium">
                  {photoUploadResults.matched.length} Matched
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1 bg-green-500/5 border border-green-500/20 rounded-lg p-2">
                {photoUploadResults.matched.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 py-1 px-2 rounded bg-white/5">
                    <img src={m.photo} alt="" className="w-8 h-8 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{m.playerName}</p>
                      <p className="text-xs text-gray-400">
                        {m.fileName} → ID: {m.externalId || m.playerId}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Unmatched Files */}
          {photoUploadResults.unmatched.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-amber-400 font-medium">
                  {photoUploadResults.unmatched.length} Not Matched
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1 bg-amber-500/5 border border-amber-500/20 rounded-lg p-2">
                {photoUploadResults.unmatched.map((u, i) => (
                  <div key={i} className="flex items-center justify-between py-1 px-2 text-sm">
                    <span className="text-gray-300">{u.fileName}</span>
                    <span className="text-xs text-gray-500">{u.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* No results */}
          {photoUploadResults.matched.length === 0 && photoUploadResults.unmatched.length === 0 && (
            <div className="text-center py-8">
              <Image className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No photos to upload</p>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button 
              variant="secondary" 
              onClick={() => setShowPhotoUploadModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleApplyPhotos}
              loading={uploadingPhotos}
              disabled={photoUploadResults.matched.length === 0}
              className="flex-1"
              icon={CheckCircle}
            >
              Apply {photoUploadResults.matched.length} Photos
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}