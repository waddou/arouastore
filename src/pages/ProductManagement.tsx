import React, { useEffect, useState } from "react";
import { useStore } from "../store/useStore";
import { Product } from "../types";
import { CreateProductInput, api, DeviceBrand } from "../api/client";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Save,
  Smartphone,
  Headphones,
  Cpu,
  Package,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { useSettingsStore } from "./CurrencySettings";

type ProductCategory = "phone" | "accessory" | "component";

interface ProductFormData {
  sku: string;
  name: string;
  category: ProductCategory;
  brand: string;
  model: string;
  pricePurchase: string;
  priceSale: string;
  stock: string;
  alertThreshold: string;
  imageUrl: string;
}

const emptyForm: ProductFormData = {
  sku: "",
  name: "",
  category: "phone",
  brand: "",
  model: "",
  pricePurchase: "",
  priceSale: "",
  stock: "0",
  alertThreshold: "5",
  imageUrl: "",
};

const categoryIcons = {
  phone: Smartphone,
  accessory: Headphones,
  component: Cpu,
};

const categoryLabels = {
  phone: "Téléphone",
  accessory: "Accessoire",
  component: "Composant",
};

const categoryColors = {
  phone: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  accessory: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  component: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

export const ProductManagement = () => {
  const {
    products,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    isLoading,
  } = useStore();
  const formatPrice = useSettingsStore((s) => s.formatPrice);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<ProductCategory | "all">(
    "all",
  );
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deviceBrands, setDeviceBrands] = useState<DeviceBrand[]>([]);

  useEffect(() => {
    fetchProducts();
    api
      .getDeviceBrands()
      .then(setDeviceBrands)
      .catch(() => setDeviceBrands([]));
  }, [fetchProducts]);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.brand?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    const matchesCategory =
      filterCategory === "all" || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const openCreateForm = () => {
    setEditingProduct(null);
    setFormData(emptyForm);
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      category: product.category,
      brand: product.brand || "",
      model: product.model || "",
      pricePurchase: String(product.pricePurchase),
      priceSale: String(product.priceSale),
      stock: String(product.stock),
      alertThreshold: String(product.alertThreshold),
      imageUrl: product.imageUrl || "",
    });
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingProduct(null);
    setFormData(emptyForm);
    setFormError(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.sku.trim()) {
      setFormError("Le SKU est requis");
      return false;
    }
    if (!formData.name.trim()) {
      setFormError("Le nom est requis");
      return false;
    }
    if (!formData.priceSale || Number(formData.priceSale) <= 0) {
      setFormError("Le prix de vente doit être supérieur à 0");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const productInput: CreateProductInput = {
      sku: formData.sku.trim(),
      name: formData.name.trim(),
      category: formData.category,
      brand: formData.brand.trim() || undefined,
      model: formData.model.trim() || undefined,
      pricePurchase: formData.pricePurchase
        ? Number(formData.pricePurchase)
        : undefined,
      priceSale: Number(formData.priceSale),
      stock: formData.stock ? Number(formData.stock) : 0,
      alertThreshold: formData.alertThreshold
        ? Number(formData.alertThreshold)
        : 5,
      imageUrl: formData.imageUrl.trim() || undefined,
    };

    if (editingProduct) {
      await updateProduct(editingProduct.id, productInput as Partial<Product>);
    } else {
      const result = await createProduct(productInput);
      if (!result) {
        setFormError(
          "Erreur lors de la création. Vérifiez que le SKU est unique.",
        );
        return;
      }
    }
    closeForm();
  };

  const handleDelete = async (id: number) => {
    const success = await deleteProduct(id);
    if (success) {
      setDeleteConfirm(null);
    }
  };

  const stats = {
    total: products.length,
    phones: products.filter((p) => p.category === "phone").length,
    accessories: products.filter((p) => p.category === "accessory").length,
    components: products.filter((p) => p.category === "component").length,
    lowStock: products.filter((p) => p.stock <= p.alertThreshold).length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Gestion des Produits
          </h2>
          <p className="text-slate-400">{stats.total} produits au total</p>
        </div>
        <button
          onClick={openCreateForm}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
        >
          <Plus size={20} />
          Ajouter un produit
        </button>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-dark-surface border border-dark-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-500/20 rounded-lg">
              <Package size={20} className="text-slate-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-slate-500 text-sm">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-surface border border-dark-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Smartphone size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.phones}</p>
              <p className="text-slate-500 text-sm">Téléphones</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-surface border border-dark-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Headphones size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {stats.accessories}
              </p>
              <p className="text-slate-500 text-sm">Accessoires</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-surface border border-dark-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Cpu size={20} className="text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {stats.components}
              </p>
              <p className="text-slate-500 text-sm">Composants</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-surface border border-dark-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/20 rounded-lg">
              <AlertTriangle size={20} className="text-rose-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.lowStock}</p>
              <p className="text-slate-500 text-sm">Stock bas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Rechercher par nom, SKU ou marque..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-dark-surface border border-dark-border rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "phone", "accessory", "component"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={clsx(
                "px-4 py-2 rounded-lg font-medium transition-colors",
                filterCategory === cat
                  ? "bg-primary-600 text-white"
                  : "bg-dark-surface border border-dark-border text-slate-400 hover:text-white",
              )}
            >
              {cat === "all" ? "Tous" : categoryLabels[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-dark-surface border border-dark-border rounded-2xl p-12 text-center">
          <Package size={48} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">
            Aucun produit trouvé
          </h3>
          <p className="text-slate-400">
            {searchTerm || filterCategory !== "all"
              ? "Essayez de modifier vos filtres"
              : "Commencez par ajouter votre premier produit"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product, index) => {
            const CategoryIcon = categoryIcons[product.category];
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-dark-surface border border-dark-border rounded-xl p-4 hover:border-primary-500/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={clsx(
                      "px-3 py-1 rounded-full text-xs font-medium border",
                      categoryColors[product.category],
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <CategoryIcon size={12} />
                      {categoryLabels[product.category]}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditForm(product)}
                      className="p-2 text-slate-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(product.id)}
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <h3 className="text-white font-medium mb-1">{product.name}</h3>
                <p className="text-slate-500 text-sm mb-3 font-mono">
                  {product.sku}
                </p>

                {product.brand && (
                  <p className="text-slate-400 text-sm mb-2">
                    {product.brand} {product.model && `- ${product.model}`}
                  </p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-dark-border">
                  <div>
                    <p className="text-primary-400 font-bold">
                      {formatPrice(product.priceSale)}
                    </p>
                    {product.pricePurchase > 0 && (
                      <p className="text-slate-500 text-xs">
                        Achat: {formatPrice(product.pricePurchase)}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p
                      className={clsx(
                        "font-bold",
                        product.stock <= product.alertThreshold
                          ? "text-rose-400"
                          : "text-emerald-400",
                      )}
                    >
                      {product.stock} en stock
                    </p>
                    <p className="text-slate-500 text-xs">
                      Alerte: {product.alertThreshold}
                    </p>
                  </div>
                </div>

                {/* Delete Confirmation */}
                <AnimatePresence>
                  {deleteConfirm === product.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-dark-border"
                    >
                      <p className="text-rose-400 text-sm mb-2">
                        Supprimer ce produit ?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2 rounded-lg text-sm transition-colors"
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="flex-1 bg-dark-border hover:bg-slate-700 text-white py-2 rounded-lg text-sm transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Product Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
            onClick={(e) => e.target === e.currentTarget && closeForm()}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-surface border border-dark-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-dark-border">
                <h3 className="text-xl font-bold text-white">
                  {editingProduct ? "Modifier le produit" : "Nouveau produit"}
                </h3>
                <button
                  onClick={closeForm}
                  className="p-2 text-slate-400 hover:text-white hover:bg-dark-border rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {formError && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-rose-400 text-sm">
                    {formError}
                  </div>
                )}

                {/* Category Selection */}
                <div>
                  <label className="block text-slate-400 text-sm mb-2">
                    Catégorie *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(["phone", "accessory", "component"] as const).map(
                      (cat) => {
                        const Icon = categoryIcons[cat];
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                category: cat,
                              }))
                            }
                            className={clsx(
                              "p-4 rounded-xl border-2 transition-all",
                              formData.category === cat
                                ? "border-primary-500 bg-primary-500/10"
                                : "border-dark-border hover:border-slate-600",
                            )}
                          >
                            <Icon
                              size={24}
                              className={
                                formData.category === cat
                                  ? "text-primary-400 mx-auto mb-2"
                                  : "text-slate-500 mx-auto mb-2"
                              }
                            />
                            <p
                              className={
                                formData.category === cat
                                  ? "text-white text-sm"
                                  : "text-slate-400 text-sm"
                              }
                            >
                              {categoryLabels[cat]}
                            </p>
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>

                {/* SKU & Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">
                      SKU *
                    </label>
                    <input
                      type="text"
                      name="sku"
                      value={formData.sku}
                      onChange={handleInputChange}
                      placeholder="IP15PRO-256"
                      className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">
                      Nom *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="iPhone 15 Pro 256GB"
                      className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Brand & Model */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">
                      Marque
                    </label>
                    <select
                      name="brand"
                      value={formData.brand}
                      onChange={handleInputChange}
                      className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500 appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-dark-bg">
                        Aucune marque
                      </option>
                      {deviceBrands.map((brand) => (
                        <option
                          key={brand.id}
                          value={brand.name}
                          className="bg-dark-bg"
                        >
                          {brand.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">
                      Modele
                    </label>
                    <input
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleInputChange}
                      placeholder="iPhone 15 Pro"
                      className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Prices */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">
                      Prix d'achat
                    </label>
                    <input
                      type="number"
                      name="pricePurchase"
                      value={formData.pricePurchase}
                      onChange={handleInputChange}
                      placeholder="0"
                      min="0"
                      className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">
                      Prix de vente *
                    </label>
                    <input
                      type="number"
                      name="priceSale"
                      value={formData.priceSale}
                      onChange={handleInputChange}
                      placeholder="0"
                      min="0"
                      required
                      className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Stock & Alert */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">
                      Stock initial
                    </label>
                    <input
                      type="number"
                      name="stock"
                      value={formData.stock}
                      onChange={handleInputChange}
                      placeholder="0"
                      min="0"
                      className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">
                      Seuil d'alerte
                    </label>
                    <input
                      type="number"
                      name="alertThreshold"
                      value={formData.alertThreshold}
                      onChange={handleInputChange}
                      placeholder="5"
                      min="0"
                      className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Image URL */}
                <div>
                  <label className="block text-slate-400 text-sm mb-2">
                    URL de l'image
                  </label>
                  <input
                    type="url"
                    name="imageUrl"
                    value={formData.imageUrl}
                    onChange={handleInputChange}
                    placeholder="https://..."
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="flex-1 bg-dark-border hover:bg-slate-700 text-white py-3 rounded-xl font-medium transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Save size={20} />
                    {editingProduct ? "Enregistrer" : "Créer le produit"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
