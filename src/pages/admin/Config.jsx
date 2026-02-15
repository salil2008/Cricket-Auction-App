import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Save, 
  RotateCcw, 
  Crown, 
  Star, 
  Shield,
  Zap,
  User,
  Wallet,
  Settings,
  Download,
  Upload,
  Trash2,
  FileJson,
  AlertTriangle,
  CheckCircle,
  FileUp,
  FileDown,
  Info
} from 'lucide-react';
import { useConfigStore, useTeamStore, usePlayerStore } from '../../stores';
import { Button, Card, CardContent, Modal } from '../../components/common';
import { formatCurrency, deepClone } from '../../utils';
import { 
  exportAllData, 
  importAllData, 
  clearAllData,
  exportAuctionConfig,
  importAuctionConfig,
  validateAuctionConfig
} from '../../db';

const tierIcons = {
  's-class': Crown,
  'a-class': Star,
  'b-class': Shield,
  'c-class': Zap,
  'd-class': User
};

const tierColors = {
  's-class': 'text-yellow-400 bg-yellow-400/10',
  'a-class': 'text-slate-300 bg-slate-300/10',
  'b-class': 'text-amber-600 bg-amber-600/10',
  'c-class': 'text-blue-400 bg-blue-400/10',
  'd-class': 'text-green-400 bg-green-400/10'
};

export default function Config() {
  const config = useConfigStore(state => state.config);
  const updateConfig = useConfigStore(state => state.updateConfig);
  const resetConfig = useConfigStore(state => state.resetConfig);
  const fetchTeams = useTeamStore(state => state.fetchTeams);
  const fetchPlayers = usePlayerStore(state => state.fetchPlayers);
  const fetchConfig = useConfigStore(state => state.fetchConfig);
  
  const [formData, setFormData] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  
  // Full data import/export
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  
  // Auction config import/export (NEW)
  const [showConfigImportModal, setShowConfigImportModal] = useState(false);
  const [configPreview, setConfigPreview] = useState(null);
  const [configValidation, setConfigValidation] = useState(null);
  const [importingConfig, setImportingConfig] = useState(false);
  const configFileInputRef = useRef(null);
  
  useEffect(() => {
    if (config) {
      setFormData(deepClone(config));
    }
  }, [config]);
  
  useEffect(() => {
    if (formData && config) {
      const changed = JSON.stringify(formData) !== JSON.stringify(config);
      setHasChanges(changed);
    }
  }, [formData, config]);
  
  const handleSave = async () => {
    if (!hasChanges || !formData) return;
    
    setIsSaving(true);
    try {
      await updateConfig(formData);
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Failed to save configuration');
    }
    setIsSaving(false);
  };
  
  const handleReset = async () => {
    try {
      await resetConfig();
      setShowResetModal(false);
    } catch (error) {
      console.error('Error resetting config:', error);
      alert('Failed to reset configuration');
    }
  };
  
  const handleClearAll = async () => {
    try {
      await clearAllData();
      await fetchConfig();
      await fetchTeams();
      await fetchPlayers();
      setShowClearModal(false);
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Failed to clear data');
    }
  };
  
  // ============================================
  // FULL DATA EXPORT/IMPORT
  // ============================================
  
  const handleExportAll = async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bwpl-auction-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data');
    }
  };
  
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      setImportPreview(data);
      setShowImportModal(true);
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Invalid JSON file');
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleImportConfirm = async () => {
    if (!importPreview) return;
    
    setImporting(true);
    try {
      await importAllData(importPreview);
      await fetchConfig();
      await fetchTeams();
      await fetchPlayers();
      setShowImportModal(false);
      setImportPreview(null);
    } catch (error) {
      console.error('Error importing data:', error);
      alert('Failed to import data: ' + error.message);
    }
    setImporting(false);
  };
  
  // ============================================
  // AUCTION CONFIG EXPORT/IMPORT (NEW)
  // ============================================
  
  const handleExportConfig = async () => {
    try {
      const data = await exportAuctionConfig();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bwpl-auction-config-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting config:', error);
      alert('Failed to export config');
    }
  };
  
  const handleConfigImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Validate the config
      const validation = validateAuctionConfig(data);
      setConfigValidation(validation);
      setConfigPreview(data);
      setShowConfigImportModal(true);
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Invalid JSON file');
    }
    
    if (configFileInputRef.current) {
      configFileInputRef.current.value = '';
    }
  };
  
  const handleConfigImportConfirm = async () => {
    if (!configPreview || !configValidation?.valid) return;
    
    setImportingConfig(true);
    try {
      const result = await importAuctionConfig(configPreview);
      await fetchConfig();
      await fetchTeams();
      setShowConfigImportModal(false);
      setConfigPreview(null);
      setConfigValidation(null);
      alert(`✅ ${result.message}`);
    } catch (error) {
      console.error('Error importing config:', error);
      alert('Failed to import config: ' + error.message);
    }
    setImportingConfig(false);
  };
  
  const updateTier = (tierId, field, value) => {
    if (!formData) return;
    
    const tierIndex = formData.tiers.findIndex(t => t.id === tierId);
    if (tierIndex === -1) return;
    
    const newTiers = [...formData.tiers];
    newTiers[tierIndex] = { ...newTiers[tierIndex], [field]: value };
    setFormData({ ...formData, tiers: newTiers });
  };
  
  if (!formData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--bwpl-primary)]"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display text-white">Configuration</h1>
          <p className="text-gray-400 mt-1">Manage auction settings and data</p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <motion.span
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm text-amber-400"
            >
              Unsaved changes
            </motion.span>
          )}
          <Button 
            variant="secondary" 
            onClick={() => setFormData(deepClone(config))}
            disabled={!hasChanges}
            icon={RotateCcw}
          >
            Reset
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges}
            loading={isSaving}
            icon={Save}
          >
            Save Changes
          </Button>
        </div>
      </div>
      
      {/* Auction Config Import/Export - NEW SECTION */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <FileJson className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Auction Setup Config</h2>
              <p className="text-sm text-gray-400">Import/export tournament settings, tiers, and teams (without players)</p>
            </div>
          </div>
          
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-300">
                <p className="font-medium text-purple-300 mb-1">Quick Setup from Config File</p>
                <p>Use this to load a pre-configured auction setup with all tiers, teams, and purse settings. 
                   Player data is imported separately via CSV.</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="secondary" 
              onClick={handleExportConfig}
              icon={FileDown}
            >
              Export Config
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => configFileInputRef.current?.click()}
              icon={FileUp}
            >
              Import Config
            </Button>
            <input
              ref={configFileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleConfigImportFile}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* League Settings */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-[var(--bwpl-primary)]/20 flex items-center justify-center">
              <Settings className="w-5 h-5 text-[var(--bwpl-primary)]" />
            </div>
            <h2 className="text-lg font-semibold text-white">League Settings</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">League Name</label>
              <input
                type="text"
                value={formData.leagueName || ''}
                onChange={(e) => setFormData({ ...formData, leagueName: e.target.value })}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Full Name</label>
              <input
                type="text"
                value={formData.leagueFullName || ''}
                onChange={(e) => setFormData({ ...formData, leagueFullName: e.target.value })}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Season Year</label>
              <input
                type="number"
                value={formData.seasonYear || ''}
                onChange={(e) => setFormData({ ...formData, seasonYear: parseInt(e.target.value) || 0 })}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Club Name</label>
              <input
                type="text"
                value={formData.clubName || ''}
                onChange={(e) => setFormData({ ...formData, clubName: e.target.value })}
                className="input-field w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Purse Settings */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Purse & Squad Settings</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Total Purse Per Team</label>
              <input
                type="number"
                value={formData.totalPursePerTeam || ''}
                onChange={(e) => setFormData({ ...formData, totalPursePerTeam: parseInt(e.target.value) || 0 })}
                className="input-field w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formatCurrency(formData.totalPursePerTeam, { compact: true })}
              </p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Min Players Per Team</label>
              <input
                type="number"
                value={formData.minPlayersPerTeam || ''}
                onChange={(e) => setFormData({ ...formData, minPlayersPerTeam: parseInt(e.target.value) || 0 })}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Max Players Per Team</label>
              <input
                type="number"
                value={formData.maxPlayersPerTeam || ''}
                onChange={(e) => setFormData({ ...formData, maxPlayersPerTeam: parseInt(e.target.value) || 0 })}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Max Retentions Per Team</label>
              <input
                type="number"
                value={formData.maxRetentionsPerTeam || 3}
                onChange={(e) => setFormData({ ...formData, maxRetentionsPerTeam: parseInt(e.target.value) || 3 })}
                className="input-field w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tier Settings */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-yellow-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Tier Base Prices</h2>
          </div>
          
          <div className="space-y-4">
            {formData.tiers?.map(tier => {
              const TierIcon = tierIcons[tier.id] || Shield;
              const colorClass = tierColors[tier.id] || 'text-gray-400 bg-gray-400/10';
              
              return (
                <div 
                  key={tier.id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClass}`}>
                    <TierIcon className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-medium text-white">{tier.name}</p>
                    <p className="text-sm text-gray-400">{tier.id}</p>
                  </div>
                  
                  <div className="w-48">
                    <label className="block text-xs text-gray-500 mb-1">Base Price</label>
                    <input
                      type="number"
                      value={tier.basePrice || ''}
                      onChange={(e) => updateTier(tier.id, 'basePrice', parseInt(e.target.value) || 0)}
                      className="input-field w-full"
                    />
                  </div>
                  
                  <div className="w-32">
                    <label className="block text-xs text-gray-500 mb-1">Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={tier.color || '#FFD700'}
                        onChange={(e) => updateTier(tier.id, 'color', e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border-0"
                      />
                      <span className="text-sm text-gray-400">{tier.color}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Full Data Backup/Restore */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <FileJson className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Full Data Backup</h2>
              <p className="text-sm text-gray-400">Export/import complete auction data including players</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="secondary" 
              onClick={handleExportAll}
              icon={Download}
            >
              Export All Data
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => fileInputRef.current?.click()}
              icon={Upload}
            >
              Import Data
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Danger Zone */}
      <Card className="border-red-500/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Danger Zone</h2>
              <p className="text-sm text-gray-400">These actions cannot be undone</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="secondary" 
              onClick={() => setShowResetModal(true)}
              icon={RotateCcw}
            >
              Reset to Defaults
            </Button>
            <Button 
              variant="danger" 
              onClick={() => setShowClearModal(true)}
              icon={Trash2}
            >
              Clear All Data
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Config Import Modal (NEW) */}
      <Modal
        isOpen={showConfigImportModal}
        onClose={() => {
          setShowConfigImportModal(false);
          setConfigPreview(null);
          setConfigValidation(null);
        }}
        title="Import Auction Config"
        size="lg"
      >
        <div className="space-y-4">
          {/* Warning */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-300 font-medium">Warning: This will replace existing data</p>
              <p className="text-sm text-gray-400 mt-1">
                All current teams and config settings will be overwritten. Player data will NOT be affected.
              </p>
            </div>
          </div>
          
          {/* Validation Status */}
          {configValidation && (
            <div className={`p-4 rounded-lg ${configValidation.valid ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
              <div className="flex items-center gap-2">
                {configValidation.valid ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                )}
                <span className={configValidation.valid ? 'text-green-300' : 'text-red-300'}>
                  {configValidation.valid ? 'Config is valid' : 'Config has errors'}
                </span>
              </div>
              {!configValidation.valid && (
                <ul className="mt-2 text-sm text-red-300 list-disc list-inside">
                  {configValidation.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          
          {/* Preview */}
          {configPreview && configValidation?.valid && (
            <div className="space-y-4">
              <h3 className="text-white font-medium">Preview:</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-gray-400">Tournament</p>
                  <p className="text-white font-medium">{configPreview.tournament?.name} {configPreview.tournament?.season}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-gray-400">Default Purse</p>
                  <p className="text-white font-medium">{formatCurrency(configPreview.purseSettings?.defaultPurse, { compact: true })}</p>
                </div>
              </div>
              
              <div className="p-3 bg-white/5 rounded-lg">
                <p className="text-xs text-gray-400 mb-2">Tiers ({configPreview.tiers?.length || 0})</p>
                <div className="flex flex-wrap gap-2">
                  {configPreview.tiers?.map(tier => (
                    <span 
                      key={tier.id}
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
                    >
                      {tier.name}: {formatCurrency(tier.basePrice, { compact: true })}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="p-3 bg-white/5 rounded-lg">
                <p className="text-xs text-gray-400 mb-2">Teams ({configPreview.teams?.length || 0})</p>
                <div className="flex flex-wrap gap-2">
                  {configPreview.teams?.map(team => (
                    <span 
                      key={team.shortName}
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{ backgroundColor: `${team.primaryColor}20`, color: team.primaryColor }}
                    >
                      {team.name} ({team.shortName})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowConfigImportModal(false);
                setConfigPreview(null);
                setConfigValidation(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfigImportConfirm}
              disabled={!configValidation?.valid}
              loading={importingConfig}
              icon={Upload}
            >
              Import Config
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Full Data Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportPreview(null);
        }}
        title="Import Full Data"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-300 font-medium">Warning: This will replace all existing data</p>
              <p className="text-sm text-gray-400 mt-1">
                All teams, players, and configuration will be overwritten with the imported data.
              </p>
            </div>
          </div>
          
          {importPreview && (
            <div className="p-4 bg-white/5 rounded-lg space-y-2">
              <p className="text-sm text-gray-400">
                <span className="text-white font-medium">{importPreview.data?.teams?.length || 0}</span> teams
              </p>
              <p className="text-sm text-gray-400">
                <span className="text-white font-medium">{importPreview.data?.players?.length || 0}</span> players
              </p>
              {importPreview.exportedAt && (
                <p className="text-xs text-gray-500">
                  Exported: {new Date(importPreview.exportedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
          
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowImportModal(false);
                setImportPreview(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleImportConfirm}
              loading={importing}
              icon={Upload}
            >
              Import Data
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Reset Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset Configuration"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Are you sure you want to reset all configuration to default values?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowResetModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReset} icon={RotateCcw}>
              Reset
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Clear Modal */}
      <Modal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="Clear All Data"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-300 font-medium">This will permanently delete:</p>
            <ul className="mt-2 text-sm text-gray-400 list-disc list-inside">
              <li>All teams</li>
              <li>All players</li>
              <li>All auction history</li>
            </ul>
          </div>
          <p className="text-gray-400 text-sm">
            Configuration will be reset to defaults.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowClearModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleClearAll} icon={Trash2}>
              Clear Everything
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}