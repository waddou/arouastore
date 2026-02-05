// Backend URL - LOCAL for development
const API_URL = "http://localhost:3001";

// Simple fetch wrapper for local backend
const localFetch = async (path: string, options?: RequestInit) => {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...options?.headers,
      "x-auth-user-id": "JuL5vmdvmHbGggT0xUHJw3pMw5ZbqBUK",
      "x-auth-email": "kuarigama@heure-salat.com",
      "x-auth-name": "kuarigama",
    },
  });
  return res;
};

// Local user data
const localUser = {
  id: "JuL5vmdvmHbGggT0xUHJw3pMw5ZbqBUK",
  email: "kuarigama@heure-salat.com",
  name: "kuarigama",
};

// Fake client for compatibility with existing code
export const client = {
  auth: {
    user: localUser,
    isLoading: false,
    isAuthenticated: true,
    signOut: async () => {
      console.log("Logged out (local mode)");
      return Promise.resolve();
    },
    getSession: async () => {
      // Return a fake session for local mode
      return {
        user: localUser,
        accessToken: "local-token",
      };
    },
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      // Immediately call with current session
      callback("SIGNED_IN", { user: localUser });
      // Return unsubscribe function
      return { unsubscribe: () => {} };
    },
  },
  api: {
    fetch: localFetch,
  },
  AuthButton: () => null,
};

// Type for user role
export type UserRole = "admin" | "manager" | "agent";

// API helper functions for typed requests
export const api = {
  // User Role
  async getUserRole() {
    const res = await localFetch("/api/me/role");
    const json = await res.json();
    return json.data as {
      role: UserRole;
      userId: string;
      email: string;
      name: string;
    };
  },

  async setupFirstAdmin(authUserId: string) {
    const res = await localFetch("/api/public/setup-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authUserId }),
    });
    const json = await res.json();
    return json;
  },

  async setUserRole(authUserId: string, role: UserRole) {
    const res = await localFetch("/api/admin/users/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authUserId, role }),
    });
    const json = await res.json();
    return json;
  },

  async getAllUserRoles() {
    const res = await localFetch("/api/admin/users");
    const json = await res.json();
    return json.data;
  },

  async createUser(email: string, role: UserRole, name?: string) {
    const res = await localFetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role, name }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data;
  },

  async deleteUser(authUserId: string) {
    const res = await localFetch(
      `/api/admin/users/${encodeURIComponent(authUserId)}`,
      {
        method: "DELETE",
      },
    );
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json;
  },

  // Products
  async getProducts(filters?: {
    category?: string;
    search?: string;
    lowStock?: boolean;
  }) {
    const params = new URLSearchParams();
    if (filters?.category) params.set("category", filters.category);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.lowStock) params.set("lowStock", "true");

    const res = await localFetch(
      `/api/public/products${params.toString() ? `?${params}` : ""}`,
    );
    const json = await res.json();
    return json.data;
  },

  async createProduct(product: CreateProductInput) {
    const res = await localFetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    });
    const json = await res.json();
    return json.data;
  },

  async updateProduct(id: number, updates: Partial<CreateProductInput>) {
    const res = await localFetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    return json.data;
  },

  async deleteProduct(id: number) {
    await localFetch(`/api/products/${id}`, { method: "DELETE" });
  },

  // Customers
  async getCustomers(search?: string) {
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await localFetch(`/api/public/customers${params}`);
    const json = await res.json();
    return json.data;
  },

  async createCustomer(customer: { name: string; phone: string }) {
    const res = await localFetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(customer),
    });
    const json = await res.json();
    return json.data;
  },

  async getCustomerHistory(customerId: number) {
    const res = await localFetch(`/api/public/customers/${customerId}/history`);
    const json = await res.json();
    return json.data;
  },

  async updateCustomer(
    customerId: number,
    updates: { name?: string; phone?: string },
  ) {
    const res = await localFetch(`/api/customers/${customerId}`, {
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
    const res = await localFetch(`/api/public/sales${params}`);
    const json = await res.json();
    return json.data;
  },

  async createSale(sale: CreateSaleInput) {
    const res = await localFetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sale),
    });
    const json = await res.json();
    return json.data;
  },

  async cancelSale(id: number) {
    const res = await localFetch(`/api/sales/${id}/cancel`, { method: "PUT" });
    const json = await res.json();
    return json.data;
  },

  // Repairs
  async getRepairs(status?: string) {
    const params = status ? `?status=${status}` : "";
    const res = await localFetch(`/api/public/repairs${params}`);
    const json = await res.json();
    return json.data;
  },

  async createRepair(repair: CreateRepairInput) {
    const res = await localFetch("/api/repairs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(repair),
    });
    const json = await res.json();
    return json.data;
  },

  async updateRepair(id: number, updates: Partial<CreateRepairInput>) {
    const res = await localFetch(`/api/repairs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    return json.data;
  },

  async updateRepairStatus(id: number, status: string) {
    const res = await localFetch(`/api/repairs/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    return json.data;
  },

  // Repair Components
  async getRepairComponents(repairId: number): Promise<RepairComponent[]> {
    const res = await localFetch(`/api/repairs/${repairId}/components`);
    const json = await res.json();
    return json.data;
  },

  async setRepairComponents(
    repairId: number,
    components: { productId: number; quantity: number; unitPrice: number }[],
  ): Promise<RepairComponent[]> {
    const res = await localFetch(`/api/repairs/${repairId}/components`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ components }),
    });
    const json = await res.json();
    return json.data;
  },

  // Dashboard Stats
  async getDashboardStats() {
    const res = await localFetch("/api/public/stats/dashboard");
    const json = await res.json();
    return json.data;
  },

  async getSalesStats(period?: "week" | "month" | "year") {
    const params = period ? `?period=${period}` : "";
    const res = await localFetch(`/api/public/stats/sales${params}`);
    const json = await res.json();
    return json.data;
  },

  // Cash Sessions
  async getCurrentCashSession() {
    const res = await localFetch("/api/public/cash-sessions/current");
    const json = await res.json();
    return json.data;
  },

  async openCashSession(openingAmount: number, notes?: string) {
    const res = await localFetch("/api/cash-sessions/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openingAmount, notes }),
    });
    const json = await res.json();
    return json.data;
  },

  async closeCashSession(id: number, closingAmount: number, notes?: string) {
    const res = await localFetch(`/api/cash-sessions/${id}/close`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closingAmount, notes }),
    });
    const json = await res.json();
    return json.data;
  },

  async getCashSessions(limit?: number) {
    const params = limit ? `?limit=${limit}` : "";
    const res = await localFetch(`/api/public/cash-sessions${params}`);
    const json = await res.json();
    return json.data;
  },

  // Device Brands
  async getDeviceBrands(): Promise<DeviceBrand[]> {
    const res = await localFetch("/api/public/device-brands");
    const json = await res.json();
    return json.data;
  },

  async getAdminDeviceBrands(): Promise<DeviceBrand[]> {
    const res = await localFetch("/api/admin/device-brands");
    const json = await res.json();
    return json.data;
  },

  async createDeviceBrand(brand: {
    name: string;
    logoUrl?: string;
    sortOrder?: number;
  }): Promise<DeviceBrand> {
    const res = await localFetch("/api/admin/device-brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(brand),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data;
  },

  async updateDeviceBrand(
    id: number,
    updates: Partial<{
      name: string;
      logoUrl: string;
      isActive: boolean;
      sortOrder: number;
    }>,
  ): Promise<DeviceBrand> {
    const res = await localFetch(`/api/admin/device-brands/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data;
  },

  async deleteDeviceBrand(id: number): Promise<void> {
    const res = await localFetch(`/api/admin/device-brands/${id}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
  },

  // Device Models
  async getDeviceModels(brandId: number): Promise<DeviceModel[]> {
    const res = await localFetch(`/api/public/device-brands/${brandId}/models`);
    const json = await res.json();
    return json.data;
  },

  async getAdminDeviceModels(brandId: number): Promise<DeviceModel[]> {
    const res = await localFetch(`/api/admin/device-brands/${brandId}/models`);
    const json = await res.json();
    return json.data;
  },

  async createDeviceModel(model: {
    brandId: number;
    name: string;
    variant?: string;
    sortOrder?: number;
  }): Promise<DeviceModel> {
    const res = await localFetch("/api/admin/device-models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(model),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data;
  },

  async updateDeviceModel(
    id: number,
    updates: Partial<{
      name: string;
      variant: string;
      isActive: boolean;
      sortOrder: number;
    }>,
  ): Promise<DeviceModel> {
    const res = await localFetch(`/api/admin/device-models/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data;
  },

  async deleteDeviceModel(id: number): Promise<void> {
    const res = await localFetch(`/api/admin/device-models/${id}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
  },
};

// Device Brands & Models types
export interface DeviceBrand {
  id: number;
  name: string;
  logoUrl: string | null;
  isActive: number;
  sortOrder: number;
  createdAt?: number;
}

export interface DeviceModel {
  id: number;
  brandId: number;
  name: string;
  variant: string | null;
  isActive: number;
  sortOrder: number;
  createdAt?: number;
}

export interface RepairComponent {
  id: number;
  repairId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  productName: string;
  productSku: string;
}

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
