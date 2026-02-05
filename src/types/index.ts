// API response types matching the backend schema

export interface Product {
  id: number;
  sku: string;
  name: string;
  category: "phone" | "accessory" | "component";
  brand: string | null;
  model: string | null;
  pricePurchase: number;
  priceSale: number;
  stock: number;
  alertThreshold: number;
  imageUrl: string | null;
  isActive: number;
  createdAt: number | null;
  updatedAt: number | null;
}

export interface Customer {
  id: number;
  phone: string;
  name: string;
  firstVisit: number | null;
  totalSpent: number;
  createdAt: number | null;
}

export interface Sale {
  id: number;
  customerId: number | null;
  userId: number;
  total: number;
  discount: number;
  paymentMethod: string;
  status: string;
  createdAt: number | null;
}

export interface SaleItem {
  id: number;
  saleId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export type RepairStatus = "new" | "diagnostic" | "repair" | "delivered";

export interface Repair {
  id: number;
  customerId: number;
  deviceBrand: string;
  deviceModel: string;
  deviceVariant: string | null;
  devicePassword: string | null;
  physicalState: string | null;
  issueDescription: string;
  diagnosis: string | null;
  status: RepairStatus;
  estimatedCost: number;
  finalCost: number | null;
  technicianId: number | null;
  promisedDate: number | null;
  deliveredAt: number | null;
  createdAt: number | null;
  updatedAt: number | null;
  // Joined customer info (optional)
  customer?: Customer;
}

export interface CashSession {
  id: number;
  userId: number;
  openingAmount: number;
  closingAmount: number | null;
  expectedAmount: number | null;
  difference: number | null;
  openedAt: number | null;
  closedAt: number | null;
  notes: string | null;
}

export interface DashboardStats {
  salesToday: {
    count: number;
    total: number;
  };
  repairs: Record<string, number>;
  lowStockCount: number;
  totalProducts: number;
  totalCustomers: number;
}

// Cart item for local state
export interface CartItem extends Product {
  quantity: number;
}
