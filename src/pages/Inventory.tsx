import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { Package, AlertTriangle, Search, Edit2, Check, X, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useSettingsStore } from './CurrencySettings';

export const Inventory = () => {
  const { products, updateProduct, fetchProducts, isLoading } = useStore();
  const formatPrice = useSettingsStore((s) => s.formatPrice);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStock, setEditStock] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const lowStockProducts = products.filter(p => p.stock <= p.alertThreshold && p.isActive);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const startEdit = (id: number, currentStock: number) => {
    setEditingId(id);
    setEditStock(currentStock);
  };

  const saveEdit = async (id: number) => {
    await updateProduct(id, { stock: editStock });
    setEditingId(null);
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Gestion des Stocks</h2>
          <p className="text-slate-400">{products.length} produits en catalogue</p>
        </div>
      </header>

      {/* Alerts */}
      {lowStockProducts.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-start gap-4">
          <AlertTriangle className="text-rose-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-rose-400 font-medium mb-1">Alerte Stock Bas</h4>
            <p className="text-slate-400 text-sm">
              {lowStockProducts.length} produit(s) avec un stock critique : {lowStockProducts.map(p => `${p.name} (${p.stock})`).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Search and Category Filter */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-dark-surface border border-dark-border rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>

        {/* Category Navbar */}
        <nav className="flex items-center gap-2 bg-dark-surface border border-dark-border rounded-xl p-1">
          <button
            onClick={() => setCategoryFilter('all')}
            className={clsx(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              categoryFilter === 'all'
                ? "bg-primary-500 text-white"
                : "text-slate-400 hover:text-white hover:bg-dark-bg"
            )}
          >
            Tous
          </button>
          <button
            onClick={() => setCategoryFilter('phone')}
            className={clsx(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              categoryFilter === 'phone'
                ? "bg-blue-500 text-white"
                : "text-slate-400 hover:text-white hover:bg-dark-bg"
            )}
          >
            Phones
          </button>
          <button
            onClick={() => setCategoryFilter('component')}
            className={clsx(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              categoryFilter === 'component'
                ? "bg-amber-500 text-white"
                : "text-slate-400 hover:text-white hover:bg-dark-bg"
            )}
          >
            Composants
          </button>
          <button
            onClick={() => setCategoryFilter('accessory')}
            className={clsx(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              categoryFilter === 'accessory'
                ? "bg-purple-500 text-white"
                : "text-slate-400 hover:text-white hover:bg-dark-bg"
            )}
          >
            Accessoires
          </button>
        </nav>
      </div>

      {/* Product Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="bg-dark-surface rounded-2xl border border-dark-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left p-4 text-slate-400 font-medium">Produit</th>
                <th className="text-left p-4 text-slate-400 font-medium">SKU</th>
                <th className="text-left p-4 text-slate-400 font-medium">Catégorie</th>
                <th className="text-right p-4 text-slate-400 font-medium">Prix Vente</th>
                <th className="text-right p-4 text-slate-400 font-medium">Stock</th>
                <th className="text-right p-4 text-slate-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Aucun produit trouvé
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product, index) => (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-dark-border/50 hover:bg-dark-bg/50 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-dark-bg overflow-hidden flex items-center justify-center">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <ShoppingBag size={24} className="text-slate-600" />
                          )}
                        </div>
                        <div>
                          <span className="text-white font-medium">{product.name}</span>
                          {product.brand && (
                            <p className="text-slate-500 text-sm">{product.brand}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-400 font-mono text-sm">{product.sku}</td>
                    <td className="p-4">
                      <span className={clsx(
                        "px-3 py-1 rounded-full text-xs font-medium",
                        product.category === 'phone' && "bg-blue-500/20 text-blue-400",
                        product.category === 'accessory' && "bg-purple-500/20 text-purple-400",
                        product.category === 'component' && "bg-amber-500/20 text-amber-400"
                      )}>
                        {product.category === 'phone' ? 'Téléphone' : product.category === 'accessory' ? 'Accessoire' : 'Composant'}
                      </span>
                    </td>
                    <td className="p-4 text-right text-white font-medium">{formatPrice(product.priceSale)}</td>
                    <td className="p-4 text-right">
                      {editingId === product.id ? (
                        <input
                          type="number"
                          value={editStock}
                          onChange={(e) => setEditStock(Number(e.target.value))}
                          className="w-20 bg-dark-bg border border-primary-500 rounded-lg px-3 py-1 text-white text-right focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <span className={clsx(
                          "font-bold",
                          product.stock <= product.alertThreshold ? "text-rose-400" : "text-emerald-400"
                        )}>
                          {product.stock}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {editingId === product.id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => saveEdit(product.id)}
                            className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-2 text-slate-400 hover:bg-slate-500/20 rounded-lg transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(product.id, product.stock)}
                          className="p-2 text-slate-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
