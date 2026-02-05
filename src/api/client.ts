import type {
  Notification,
  Supplier,
  CreateSupplierInput,
  PurchaseOrder,
  PurchaseOrderDetail,
  CreatePurchaseOrderInput,
  ReceiveItem,
  CustomerLoyaltyData,
  LoyaltySettings,
  SaleReceiptData,
  RepairTicketData,
  SalesReportData,
  InventoryReportData,
  CashSessionsReportData,
  RepairsReportData,
} from "../types";

// Backend URL - use environment variable or default to production
const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

// Simple fetch wrapper for local backend
const localFetch = async (path: string, options?: RequestInit) => {
  // Get user from authStore if available
  const authStore = await import('../store/authStore').then(m => m.useAuthStore);
  const user = authStore.getState().user;
  
  const headers: Record<string, string> = {
    ...options?.headers as Record<string, string>,
  };
  
  // Only add auth headers if user is logged in
  if (user) {
    headers["x-auth-user-id"] = user.id;
    headers["x-auth-email"] = user.email;
    headers["x-auth-name"] = user.name;
  }
  
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
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

  // ── Receipts & Tickets (US1) ──

  async getSaleReceipt(saleId: number): Promise<SaleReceiptData> {
    const res = await localFetch(`/api/public/sales/${saleId}/receipt`);
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data;
  },

  async getRepairTicket(repairId: number): Promise<RepairTicketData> {
    const res = await localFetch(`/api/public/repairs/${repairId}/ticket`);
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data;
  },

  // ── Notifications (US2) ──

  async getNotifications(params?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ notifications: Notification[]; unreadCount: number }> {
    const qs = new URLSearchParams();
    if (params?.unreadOnly) qs.set("unread_only", "true");
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const res = await localFetch(
      `/api/notifications${qs.toString() ? `?${qs}` : ""}`,
    );
    const json = await res.json();
    return json.data;
  },

  async getUnreadNotificationCount(): Promise<number> {
    const res = await localFetch("/api/notifications/unread-count");
    const json = await res.json();
    return json.data.count;
  },

  async markNotificationRead(id: number): Promise<void> {
    await localFetch(`/api/notifications/${id}/read`, { method: "PUT" });
  },

  async markAllNotificationsRead(): Promise<void> {
    await localFetch("/api/notifications/read-all", { method: "PUT" });
  },

  // ── Suppliers (US3) ──

  async getSuppliers(): Promise<Supplier[]> {
    const res = await localFetch("/api/public/suppliers");
    const json = await res.json();
    return json.data;
  },

  async getSupplier(id: number): Promise<Supplier> {
    const res = await localFetch(`/api/public/suppliers/${id}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data;
  },

  async createSupplier(supplier: CreateSupplierInput): Promise<Supplier> {
    const res = await localFetch("/api/admin/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(supplier),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data;
  },

  async updateSupplier(
    id: number,
    updates: Partial<CreateSupplierInput>,
  ): Promise<Supplier> {
    const res = await localFetch(`/api/admin/suppliers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data;
  },

  async deleteSupplier(id: number): Promise<void> {
    const res = await localFetch(`/api/admin/suppliers/${id}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
  },

  // ── Purchase Orders (US3) ──

  async getPurchaseOrders(params?: {
    status?: string;
    supplierId?: number;
    limit?: number;
  }): Promise<PurchaseOrder[]> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.supplierId) qs.set("supplier_id", String(params.supplierId));
    if (params?.limit) qs.set("limit", String(params.limit));
    const res = await localFetch(
      `/api/public/purchase-orders${qs.toString() ? `?${qs}` : ""}`,
    );
    const json = await res.json();
    return json.data;
  },

  async getPurchaseOrder(id: number): Promise<PurchaseOrderDetail> {
    const res = await localFetch(`/api/public/purchase-orders/${id}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data;
  },

  async createPurchaseOrder(
    order: CreatePurchaseOrderInput,
  ): Promise<PurchaseOrder> {
    const res = await localFetch("/api/admin/purchase-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data;
  },

  async receivePurchaseOrder(
    id: number,
    items: ReceiveItem[],
  ): Promise<PurchaseOrder> {
    const res = await localFetch(`/api/admin/purchase-orders/${id}/receive`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data;
  },

  async cancelPurchaseOrder(id: number): Promise<void> {
    const res = await localFetch(`/api/admin/purchase-orders/${id}/cancel`, {
      method: "PUT",
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
  },

  // ── Loyalty (US4) ──

  async getCustomerLoyalty(customerId: number): Promise<CustomerLoyaltyData> {
    const res = await localFetch(`/api/public/customers/${customerId}/loyalty`);
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data;
  },

  async getLoyaltySettings(): Promise<LoyaltySettings> {
    const res = await localFetch("/api/public/loyalty/settings");
    const json = await res.json();
    return json.data;
  },

  async updateLoyaltySettings(
    settings: Partial<LoyaltySettings>,
  ): Promise<LoyaltySettings> {
    const res = await localFetch("/api/admin/loyalty/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data;
  },

  // ── Reports (US5) ──

  async getSalesReport(from: string, to: string): Promise<SalesReportData> {
    // Convert "YYYY-MM-DD" to Unix timestamp (seconds)
    const fromTimestamp = Math.floor(new Date(from).getTime() / 1000);
    const toTimestamp = Math.floor(new Date(to + "T23:59:59").getTime() / 1000);
    const res = await localFetch(
      `/api/public/reports/sales?from=${fromTimestamp}&to=${toTimestamp}`,
    );
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data;
  },

  async getInventoryReport(): Promise<InventoryReportData> {
    const res = await localFetch("/api/public/reports/inventory");
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data;
  },

  async getCashSessionsReport(
    from: string,
    to: string,
  ): Promise<CashSessionsReportData> {
    // Convert "YYYY-MM-DD" to Unix timestamp (seconds)
    const fromTimestamp = Math.floor(new Date(from).getTime() / 1000);
    const toTimestamp = Math.floor(new Date(to + "T23:59:59").getTime() / 1000);
    const res = await localFetch(
      `/api/public/reports/cash-sessions?from=${fromTimestamp}&to=${toTimestamp}`,
    );
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data;
  },

  async getRepairsReport(from: string, to: string): Promise<RepairsReportData> {
    // Convert "YYYY-MM-DD" to Unix timestamp (seconds)
    const fromTimestamp = Math.floor(new Date(from).getTime() / 1000);
    const toTimestamp = Math.floor(new Date(to + "T23:59:59").getTime() / 1000);
    const res = await localFetch(
      `/api/public/reports/repairs?from=${fromTimestamp}&to=${toTimestamp}`,
    );
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data;
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
