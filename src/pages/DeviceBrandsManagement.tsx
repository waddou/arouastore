import React, { useEffect, useState } from 'react';
import { api, DeviceBrand, DeviceModel } from '../api/client';
import {
  Plus, Search, Edit2, Trash2, X, Save,
  Smartphone, ChevronRight, ChevronDown, ToggleLeft, ToggleRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export const DeviceBrandsManagement = () => {
  const [brands, setBrands] = useState<DeviceBrand[]>([]);
  const [models, setModels] = useState<Record<number, DeviceModel[]>>({});
  const [expandedBrand, setExpandedBrand] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Brand form
  const [showBrandForm, setShowBrandForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState<DeviceBrand | null>(null);
  const [brandName, setBrandName] = useState('');
  const [brandError, setBrandError] = useState<string | null>(null);

  // Model form
  const [showModelForm, setShowModelForm] = useState(false);
  const [modelBrandId, setModelBrandId] = useState<number | null>(null);
  const [editingModel, setEditingModel] = useState<DeviceModel | null>(null);
  const [modelName, setModelName] = useState('');
  const [modelError, setModelError] = useState<string | null>(null);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'brand' | 'model'; id: number } | null>(null);

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAdminDeviceBrands();
      setBrands(data);
    } catch (error) {
      console.error('Error loading brands:', error);
    }
    setIsLoading(false);
  };

  const loadModels = async (brandId: number) => {
    try {
      const data = await api.getAdminDeviceModels(brandId);
      setModels(prev => ({ ...prev, [brandId]: data }));
    } catch (error) {
      console.error('Error loading models:', error);
    }
  };

  const toggleBrand = (brandId: number) => {
    if (expandedBrand === brandId) {
      setExpandedBrand(null);
    } else {
      setExpandedBrand(brandId);
      if (!models[brandId]) {
        loadModels(brandId);
      }
    }
  };

  // Brand CRUD
  const openBrandForm = (brand?: DeviceBrand) => {
    setEditingBrand(brand || null);
    setBrandName(brand?.name || '');
    setBrandError(null);
    setShowBrandForm(true);
  };

  const closeBrandForm = () => {
    setShowBrandForm(false);
    setEditingBrand(null);
    setBrandName('');
    setBrandError(null);
  };

  const handleSaveBrand = async () => {
    if (!brandName.trim()) {
      setBrandError('Le nom est requis');
      return;
    }

    try {
      if (editingBrand) {
        await api.updateDeviceBrand(editingBrand.id, { name: brandName.trim() });
      } else {
        await api.createDeviceBrand({ name: brandName.trim() });
      }
      await loadBrands();
      closeBrandForm();
    } catch (error: any) {
      setBrandError(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleToggleBrandActive = async (brand: DeviceBrand) => {
    try {
      await api.updateDeviceBrand(brand.id, { isActive: !brand.isActive });
      await loadBrands();
    } catch (error) {
      console.error('Error toggling brand:', error);
    }
  };

  const handleDeleteBrand = async (id: number) => {
    try {
      await api.deleteDeviceBrand(id);
      await loadBrands();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting brand:', error);
    }
  };

  // Model CRUD
  const openModelForm = (brandId: number, model?: DeviceModel) => {
    setModelBrandId(brandId);
    setEditingModel(model || null);
    setModelName(model?.name || '');
    setModelError(null);
    setShowModelForm(true);
  };

  const closeModelForm = () => {
    setShowModelForm(false);
    setModelBrandId(null);
    setEditingModel(null);
    setModelName('');
    setModelError(null);
  };

  const handleSaveModel = async () => {
    if (!modelName.trim()) {
      setModelError('Le nom est requis');
      return;
    }

    try {
      if (editingModel) {
        await api.updateDeviceModel(editingModel.id, { name: modelName.trim() });
      } else if (modelBrandId) {
        await api.createDeviceModel({ brandId: modelBrandId, name: modelName.trim() });
      }
      if (modelBrandId) {
        await loadModels(modelBrandId);
      }
      closeModelForm();
    } catch (error: any) {
      setModelError(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleToggleModelActive = async (model: DeviceModel) => {
    try {
      await api.updateDeviceModel(model.id, { isActive: !model.isActive });
      await loadModels(model.brandId);
    } catch (error) {
      console.error('Error toggling model:', error);
    }
  };

  const handleDeleteModel = async (model: DeviceModel) => {
    try {
      await api.deleteDeviceModel(model.id);
      await loadModels(model.brandId);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting model:', error);
    }
  };

  const filteredBrands = brands.filter(b =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Marques & Modeles</h2>
          <p className="text-slate-400">{brands.length} marques, {Object.values(models).flat().length} modeles charges</p>
        </div>
        <button
          onClick={() => openBrandForm()}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
        >
          <Plus size={20} />
          Ajouter une marque
        </button>
      </header>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Rechercher une marque..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-dark-surface border border-dark-border rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary-500 transition-colors"
        />
      </div>

      {/* Brands List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : filteredBrands.length === 0 ? (
        <div className="bg-dark-surface border border-dark-border rounded-2xl p-12 text-center">
          <Smartphone size={48} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">Aucune marque trouvee</h3>
          <p className="text-slate-400">Commencez par ajouter une marque</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBrands.map((brand) => (
            <div key={brand.id} className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden">
              {/* Brand Header */}
              <div
                className={clsx(
                  "flex items-center justify-between p-4 cursor-pointer hover:bg-dark-bg/50 transition-colors",
                  !brand.isActive && "opacity-50"
                )}
                onClick={() => toggleBrand(brand.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={clsx(
                    "transition-transform",
                    expandedBrand === brand.id && "rotate-90"
                  )}>
                    <ChevronRight size={20} className="text-slate-400" />
                  </div>
                  <div className="w-10 h-10 bg-primary-600/20 rounded-lg flex items-center justify-center">
                    <Smartphone size={20} className="text-primary-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{brand.name}</h3>
                    <p className="text-slate-500 text-sm">
                      {models[brand.id]?.length || '...'} modeles
                    </p>
                  </div>
                  {!brand.isActive && (
                    <span className="px-2 py-1 bg-slate-600/20 text-slate-400 text-xs rounded">Inactif</span>
                  )}
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleToggleBrandActive(brand)}
                    className={clsx(
                      "p-2 rounded-lg transition-colors",
                      brand.isActive
                        ? "text-emerald-400 hover:bg-emerald-500/10"
                        : "text-slate-400 hover:bg-slate-500/10"
                    )}
                    title={brand.isActive ? "Desactiver" : "Activer"}
                  >
                    {brand.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                  <button
                    onClick={() => openBrandForm(brand)}
                    className="p-2 text-slate-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ type: 'brand', id: brand.id })}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Models List */}
              <AnimatePresence>
                {expandedBrand === brand.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-dark-border bg-dark-bg/30 p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-slate-400 font-medium">Modeles</h4>
                        <button
                          onClick={() => openModelForm(brand.id)}
                          className="flex items-center gap-1 text-primary-400 hover:text-primary-300 text-sm"
                        >
                          <Plus size={16} />
                          Ajouter un modele
                        </button>
                      </div>

                      {models[brand.id]?.length ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {models[brand.id].map((model) => (
                            <div
                              key={model.id}
                              className={clsx(
                                "flex items-center justify-between p-3 bg-dark-surface rounded-lg border border-dark-border",
                                !model.isActive && "opacity-50"
                              )}
                            >
                              <span className="text-white text-sm">{model.name}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleToggleModelActive(model)}
                                  className={clsx(
                                    "p-1.5 rounded transition-colors",
                                    model.isActive
                                      ? "text-emerald-400 hover:bg-emerald-500/10"
                                      : "text-slate-400 hover:bg-slate-500/10"
                                  )}
                                >
                                  {model.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                                </button>
                                <button
                                  onClick={() => openModelForm(brand.id, model)}
                                  className="p-1.5 text-slate-400 hover:text-primary-400 rounded transition-colors"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm({ type: 'model', id: model.id })}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-sm text-center py-4">Aucun modele pour cette marque</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Delete Confirmation for Brand */}
              <AnimatePresence>
                {deleteConfirm?.type === 'brand' && deleteConfirm.id === brand.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-rose-500/30 bg-rose-500/10 p-4"
                  >
                    <p className="text-rose-400 text-sm mb-3">
                      Supprimer cette marque et tous ses modeles ?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteBrand(brand.id)}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm transition-colors"
                      >
                        Confirmer
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-4 py-2 bg-dark-border hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {/* Brand Form Modal */}
      <AnimatePresence>
        {showBrandForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
            onClick={closeBrandForm}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-surface border border-dark-border rounded-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-dark-border">
                <h3 className="text-xl font-bold text-white">
                  {editingBrand ? 'Modifier la marque' : 'Nouvelle marque'}
                </h3>
                <button
                  onClick={closeBrandForm}
                  className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {brandError && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-rose-400 text-sm">
                    {brandError}
                  </div>
                )}

                <div>
                  <label className="block text-slate-400 text-sm mb-2">Nom de la marque *</label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="Ex: Apple, Samsung..."
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={closeBrandForm}
                    className="flex-1 bg-dark-border hover:bg-slate-700 text-white py-3 rounded-xl font-medium transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveBrand}
                    className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    {editingBrand ? 'Enregistrer' : 'Creer'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Model Form Modal */}
      <AnimatePresence>
        {showModelForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
            onClick={closeModelForm}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-surface border border-dark-border rounded-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-dark-border">
                <h3 className="text-xl font-bold text-white">
                  {editingModel ? 'Modifier le modele' : 'Nouveau modele'}
                </h3>
                <button
                  onClick={closeModelForm}
                  className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {modelError && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-rose-400 text-sm">
                    {modelError}
                  </div>
                )}

                <div>
                  <label className="block text-slate-400 text-sm mb-2">Nom du modele *</label>
                  <input
                    type="text"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="Ex: iPhone 15 Pro, Galaxy S24..."
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={closeModelForm}
                    className="flex-1 bg-dark-border hover:bg-slate-700 text-white py-3 rounded-xl font-medium transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveModel}
                    className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    {editingModel ? 'Enregistrer' : 'Creer'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Model Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm?.type === 'model' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-surface border border-dark-border rounded-2xl w-full max-w-sm p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white mb-2">Supprimer ce modele ?</h3>
              <p className="text-slate-400 text-sm mb-4">Cette action est irreversible.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 bg-dark-border hover:bg-slate-700 text-white py-2 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    const model = Object.values(models).flat().find(m => m.id === deleteConfirm.id);
                    if (model) handleDeleteModel(model);
                  }}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2 rounded-lg transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
