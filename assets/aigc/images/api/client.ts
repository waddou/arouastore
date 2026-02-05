import { createEdgeSpark } from "@edgespark/client";
import "@edgespark/client/styles.css";

// Backend URL - staging for development
const WORKER_URL = "https://staging--9iek0jswhz3cpz228ato.youbase.cloud";

// Create EdgeSpark client for API calls
export const client = createEdgeSpark({ baseUrl: WORKER_URL });

// Type for user role
export type UserRole = "admin" | "manager" | "agent";

// API helper functions for typed requests
export const api = {
  // User Role
  async getUserRole() {
    const res = await client.api.fetch("/api/me/role");
    const json = await res.json();
    return json.data as { role: UserRole; userId: string; email: string; name: string };
  },

  async setupFirstAdmin(authUserId: string) {
    const res = await client.api.fetch("/api/public/setup-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authUserId }),
    });
    const json = await res.json();
    return json;
  },

  async setUserRole(authUserId: string, role: UserRole) {
    const res = await client.api.fetch("/api/admin/users/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authUserId, role }),
    });
    const json = await res.json();
    return json;
  },

  async getAllUserRoles() {
    const res = await client.api.fetch("/api/admin/users");
    const json = await res.json();
    return json.data;
  },

  async createUser(email: string, role: UserRole, name?: string) {
    const res = await client.api.fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role, name }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data;
  },

  async deleteUser(authUserId: string) {
    const res = await client.api.fetch(`/api/admin/users/${encodeURIComponent(authUserId)}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json;
  },

  // Products
  async getProducts(filters?: { category?: string; search?: string; lowStock?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.category) params.set("category", filters.category);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.lowStock) params.set("lowStock", "true");
    
    const res = await client.api.fetch(`/api/public/products${params.toString() ? `?${params}` : ""}`);
    const json = await res.json();
    return json.data;
  },

  async createProduct(product: CreateProductInput) {
    const res = await client.api.fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    });
    const json = await res.json();
    return json.data;
  },

  async updateProduct(id: number, updates: Partial<CreateProductInput>) {
    const res = await client.api.fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    return json.data;
  },

  async deleteProduct(id: number) {
    await client.api.fetch(`/api/products/${id}`, { method: "DELETE" });
  },

  // Customers
  async getCustomers(search?: string) {
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await client.api.fetch(`/api/public/customers${params}`);
    const json = await res.json();
    return json.data;
  },

  async createCustomer(customer: { name: string; phone: string }) {
    const res = await client.api.fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(customer),
    });
    const json = await res.json();
    return json.data;
  },

  async getCustomerHistory(customerId: number) {
    const res = await client.api.fetch(`/api/public/customers/${customerId}/history`);
    const json = await res.json();
    return json.data;
  },

  async updateCustomer(customerId: number, updates: { name?: string; phone?: string }) {
    const res = await client.api.fetch(`/api/customers/${customerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    return json.data;
  },

  // Sales
  async getSales(limit?: number) {
    const params = limit ? `?limit=${limit}` : "";
    const res = await client.api.fetch(`/api/public/sales${params}`);
    const json = await res.json();
    return json.data;
  },

  async createSale(sale: CreateSaleInput) {
    const res = await client.api.fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sale),
    });
    const json = await res.json();
    return json.data;
  },

  async cancelSale(id: number) {
    const res = await client.api.fetch(`/api/sales/${id}/cancel`, { method: "PUT" });
    const json = await res.json();
    return json.data;
  },

  // Repairs
  async getRepairs(status?: string) {
    const params = status ? `?status=${status}` : "";
    const res = await client.api.fetch(`/api/public/repairs${params}`);
    const json = await res.json();
    return json.data;
  },

  async createRepair(repair: CreateRepairInput) {
    const res = await client.api.fetch("/api/repairs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(repair),
    });
    const json = await res.json();
    return json.data;
  },

  async updateRepair(id: number, updates: Partial<CreateRepairInput>) {
    const res = await client.api.fetch(`/api/repairs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    return json.data;
  },

  async updateRepairStatus(id: number, status: string) {
    const res = await client.api.fetch(`/api/repairs/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    return json.data;
  },

  // Dashboard Stats
  async getDashboardStats() {
    const res = await client.api.fetch("/api/public/stats/dashboard");
    const json = await res.json();
    return json.data;
  },

  async getSalesStats(period?: "week" | "month" | "year") {
    const params = period ? `?period=${period}` : "";
    const res = await client.api.fetch(`/api/public/stats/sales${params}`);
    const json = await res.json();
    return json.data;
  },

  // Cash Sessions
  async getCurrentCashSession() {
    const res = await client.api.fetch("/api/public/cash-sessions/current");
    const json = await res.json();
    return json.data;
  },

  async openCashSession(openingAmount: number, notes?: string) {
    const res = await client.api.fetch("/api/cash-sessions/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openingAmount, notes }),
    });
    const json = await res.json();
    return json.data;
  },

  async closeCashSession(id: number, closingAmount: number, notes?: string) {
    const res = await client.api.fetch(`/api/cash-sessions/${id}/close`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closingAmount, notes }),
    });
    const json = await res.json();
    return json.data;
  },

  async getCashSessions(limit?: number) {
    const params = limit ? `?limit=${limit}` : "";
    const res = await client.api.fetch(`/api/public/cash-sessions${params}`);
    const json = await res.json();
    return json.data;
  },
};

// Type definitions for API inputs
export interface CreateProductInput {
  sku: string;
  name: string;
  category: "phone" | "accessory" | "component";
  brand?: string;
  model?: string;
  pricePurchase?: number;
  priceSale: number;
  stock?: number;
  alertThreshold?: number;
  imageUrl?: string;
}

export interface CreateSaleInput {
  customerId?: number;
  items: {
    productId: number;
    quantity: number;
    unitPrice: number;
  }[];
  discount?: number;
  paymentMethod?: "cash" | "card" | "mobile";
}

export interface CreateRepairInput {
  customerId: number;
  deviceBrand: string;
  deviceModel: string;
  deviceVariant?: string;
  devicePassword?: string;
  physicalState?: string;
  issueDescription: string;
  diagnosis?: string;
  estimatedCost?: number;
  technicianId?: number;
  promisedDate?: number;
}
