import { create } from "zustand";
import {
  Product,
  CartItem,
  Sale,
  Repair,
  RepairStatus,
  DashboardStats,
  Customer,
} from "../types";
import { api } from "../api/client";

interface StoreState {
  // State
  cart: CartItem[];
  products: Product[];
  sales: Sale[];
  repairs: Repair[];
  customers: Customer[];
  dashboardStats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;

  // Cart actions
  addToCart: (product: Product) => void;
  removeFromCart: (productId: number) => void;
  updateCartQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;

  // API actions
  fetchProducts: (filters?: {
    category?: string;
    search?: string;
    lowStock?: boolean;
  }) => Promise<void>;
  fetchSales: (limit?: number) => Promise<void>;
  fetchRepairs: () => Promise<void>;
  fetchCustomers: (search?: string) => Promise<void>;
  fetchDashboardStats: () => Promise<void>;

  checkout: (
    customerId?: number,
    discount?: number,
    paymentMethod?: string,
  ) => Promise<Sale | null>;
  createRepair: (
    repair: Parameters<typeof api.createRepair>[0],
  ) => Promise<Repair | null>;
  updateRepair: (
    id: number,
    updates: Parameters<typeof api.updateRepair>[1],
  ) => Promise<Repair | null>;
  updateRepairStatus: (id: number, status: RepairStatus) => Promise<void>;
  updateProduct: (id: number, updates: Partial<Product>) => Promise<void>;
  createProduct: (
    product: Parameters<typeof api.createProduct>[0],
  ) => Promise<Product | null>;
  deleteProduct: (id: number) => Promise<boolean>;
  createCustomer: (name: string, phone: string) => Promise<Customer | null>;
}

export const useStore = create<StoreState>((set, get) => ({
  cart: [],
  products: [],
  sales: [],
  repairs: [],
  customers: [],
  dashboardStats: null,
  isLoading: false,
  error: null,

  // Cart actions (local state)
  addToCart: (product) =>
    set((state) => {
      const existing = state.cart.find((item) => item.id === product.id);
      if (existing) {
        return {
          cart: state.cart.map((item) =>
            item.id === product.id
              ? {
                  ...item,
                  quantity: Math.min(item.quantity + 1, product.stock),
                }
              : item,
          ),
        };
      }
      return { cart: [...state.cart, { ...product, quantity: 1 }] };
    }),

  removeFromCart: (id) =>
    set((state) => ({
      cart: state.cart.filter((item) => item.id !== id),
    })),

  updateCartQuantity: (id, quantity) =>
    set((state) => ({
      cart: state.cart.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item,
      ),
    })),

  clearCart: () => set({ cart: [] }),

  // API actions
  fetchProducts: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const products = await api.getProducts(filters);
      set({ products, isLoading: false });
    } catch (error) {
      console.error("Error fetching products:", error);
      set({
        error: "Erreur lors du chargement des produits",
        isLoading: false,
      });
    }
  },

  fetchSales: async (limit) => {
    set({ isLoading: true, error: null });
    try {
      const sales = await api.getSales(limit);
      set({ sales, isLoading: false });
    } catch (error) {
      console.error("Error fetching sales:", error);
      set({ error: "Erreur lors du chargement des ventes", isLoading: false });
    }
  },

  fetchRepairs: async () => {
    set({ isLoading: true, error: null });
    try {
      const repairs = await api.getRepairs();
      set({ repairs: repairs || [], isLoading: false });
    } catch (error) {
      console.error("Error fetching repairs:", error);
      set({
        error: "Erreur lors du chargement des réparations",
        isLoading: false,
      });
    }
  },

  fetchCustomers: async (search) => {
    set({ isLoading: true, error: null });
    try {
      const customers = await api.getCustomers(search);
      set({ customers, isLoading: false });
    } catch (error) {
      console.error("Error fetching customers:", error);
      set({ error: "Erreur lors du chargement des clients", isLoading: false });
    }
  },

  fetchDashboardStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await api.getDashboardStats();
      set({ dashboardStats: stats, isLoading: false });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      set({
        error: "Erreur lors du chargement des statistiques",
        isLoading: false,
      });
    }
  },

  checkout: async (customerId, discount = 0, paymentMethod = "cash") => {
    const { cart, fetchProducts, fetchSales, fetchDashboardStats } = get();
    if (cart.length === 0) return null;

    set({ isLoading: true, error: null });
    try {
      const sale = await api.createSale({
        customerId,
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          unitPrice: item.priceSale,
        })),
        discount,
        paymentMethod: paymentMethod as "cash" | "card" | "mobile",
      });

      set({ cart: [], isLoading: false });
      // Refresh products (stock updated) and sales
      await Promise.all([
        fetchProducts(),
        fetchSales(10),
        fetchDashboardStats(),
      ]);
      return sale;
    } catch (error) {
      console.error("Error during checkout:", error);
      set({
        error: "Erreur lors de la validation de la vente",
        isLoading: false,
      });
      return null;
    }
  },

  createRepair: async (repairData) => {
    set({ isLoading: true, error: null });
    try {
      const repair = await api.createRepair(repairData);
      await get().fetchRepairs();
      set({ isLoading: false });
      return repair;
    } catch (error) {
      console.error("Error creating repair:", error);
      set({
        error: "Erreur lors de la création de la réparation",
        isLoading: false,
      });
      return null;
    }
  },

  updateRepair: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const repair = await api.updateRepair(id, updates);
      await get().fetchRepairs();
      set({ isLoading: false });
      return repair;
    } catch (error) {
      console.error("Error updating repair:", error);
      set({
        error: "Erreur lors de la mise à jour de la réparation",
        isLoading: false,
      });
      return null;
    }
  },

  updateRepairStatus: async (id, status) => {
    set({ isLoading: true, error: null });
    try {
      await api.updateRepairStatus(id, status);
      // Update local state
      set((state) => ({
        repairs: state.repairs.map((r) => (r.id === id ? { ...r, status } : r)),
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error updating repair status:", error);
      set({
        error: "Erreur lors de la mise à jour du statut",
        isLoading: false,
      });
    }
  },

  updateProduct: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      await api.updateProduct(id, {
        name: updates.name,
        priceSale: updates.priceSale,
        stock: updates.stock,
        alertThreshold: updates.alertThreshold,
      });
      // Update local state
      set((state) => ({
        products: state.products.map((p) =>
          p.id === id ? { ...p, ...updates } : p,
        ),
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error updating product:", error);
      set({
        error: "Erreur lors de la mise à jour du produit",
        isLoading: false,
      });
    }
  },

  createProduct: async (productData) => {
    set({ isLoading: true, error: null });
    try {
      const product = await api.createProduct(productData);
      await get().fetchProducts();
      set({ isLoading: false });
      return product;
    } catch (error) {
      console.error("Error creating product:", error);
      set({
        error: "Erreur lors de la création du produit",
        isLoading: false,
      });
      return null;
    }
  },

  deleteProduct: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteProduct(id);
      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
        isLoading: false,
      }));
      return true;
    } catch (error) {
      console.error("Error deleting product:", error);
      set({
        error: "Erreur lors de la suppression du produit",
        isLoading: false,
      });
      return false;
    }
  },

  createCustomer: async (name, phone) => {
    set({ isLoading: true, error: null });
    try {
      const customer = await api.createCustomer({ name, phone });
      await get().fetchCustomers();
      set({ isLoading: false });
      return customer;
    } catch (error) {
      console.error("Error creating customer:", error);
      set({ error: "Erreur lors de la création du client", isLoading: false });
      return null;
    }
  },
}));
