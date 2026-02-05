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

// ── Notification types ──

export type NotificationType =
  | "stock_low"
  | "repair_status"
  | "cash_session"
  | "general";
export type NotificationReferenceType =
  | "product"
  | "repair"
  | "cash_session"
  | "sale";

export interface Notification {
  id: number;
  userId: number | null;
  type: NotificationType;
  title: string;
  message: string;
  referenceType: NotificationReferenceType | null;
  referenceId: number | null;
  isRead: boolean;
  createdAt: number;
}

// ── Supplier types ──

export interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CreateSupplierInput {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

// ── Purchase Order types ──

export type PurchaseOrderStatus =
  | "pending"
  | "partially_received"
  | "received"
  | "cancelled";

export interface PurchaseOrder {
  id: number;
  orderNumber: string;
  supplierId: number;
  supplierName: string;
  status: PurchaseOrderStatus;
  totalAmount: number;
  notes: string | null;
  orderedAt: number;
  receivedAt: number | null;
  createdBy: number;
  createdAt: number;
}

export interface PurchaseOrderItem {
  id: number;
  purchaseOrderId: number;
  productId: number;
  productName: string;
  productSku: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitPrice: number;
  subtotal: number;
}

export interface PurchaseOrderDetail extends PurchaseOrder {
  items: PurchaseOrderItem[];
}

export interface CreatePurchaseOrderInput {
  supplierId: number;
  notes?: string;
  items: { productId: number; quantityOrdered: number }[];
}

export interface ReceiveItem {
  itemId: number;
  quantityReceived: number;
}

// ── Loyalty types ──

export type LoyaltyTransactionType = "earn" | "redeem" | "cancel" | "adjust";

export interface LoyaltyTransaction {
  id: number;
  customerId: number;
  saleId: number | null;
  points: number;
  type: LoyaltyTransactionType;
  description: string | null;
  createdAt: number;
}

export interface CustomerLoyaltyData {
  customerId: number;
  loyaltyPoints: number;
  equivalentDiscount: number;
  recentTransactions: LoyaltyTransaction[];
}

export interface LoyaltySettings {
  enabled: boolean;
  pointsPerUnit: number;
  pointsToCurrency: number;
}

// ── Receipt / Ticket types ──

export interface SaleReceiptData {
  sale: {
    id: number;
    total: number;
    discount: number;
    paymentMethod: string;
    status: string;
    createdAt: number;
  };
  items: {
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  customer: { name: string; phone: string } | null;
  store: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  seller: { name: string };
}

export interface RepairTicketData {
  repair: {
    id: number;
    deviceBrand: string;
    deviceModel: string;
    deviceVariant: string | null;
    issueDescription: string;
    estimatedCost: number;
    status: string;
    promisedDate: number | null;
    createdAt: number;
  };
  customer: { name: string; phone: string };
  technician: { name: string } | null;
  store: {
    name: string;
    address: string;
    phone: string;
  };
}

// ── Report types ──

export interface SalesReportData {
  period: { from: number; to: number };
  summary: {
    totalSales: number;
    totalRevenue: number;
    totalDiscount: number;
    netRevenue: number;
    averageTicket: number;
    totalCost: number;
    grossMargin: number;
    marginPercentage: number;
  };
  byPaymentMethod: Record<string, { count: number; total: number }>;
  topProducts: {
    productId: number;
    productName: string;
    sku: string;
    quantitySold: number;
    revenue: number;
  }[];
  salesByDay: { date: string; count: number; revenue: number }[];
  sales: {
    id: number;
    customerName: string | null;
    total: number;
    discount: number;
    paymentMethod: string;
    sellerName: string;
    createdAt: number;
    items: {
      productName: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[];
  }[];
}

export interface InventoryReportData {
  summary: {
    totalProducts: number;
    activeProducts: number;
    totalStockValue: number;
    totalRetailValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  byCategory: Record<string, { count: number; stockValue: number }>;
  products: {
    id: number;
    sku: string;
    name: string;
    category: string;
    brand: string | null;
    stock: number;
    alertThreshold: number;
    pricePurchase: number;
    priceSale: number;
    stockValue: number;
    retailValue: number;
    isLowStock: boolean;
  }[];
  lowStockProducts: {
    id: number;
    sku: string;
    name: string;
    stock: number;
    alertThreshold: number;
  }[];
}

export interface CashSessionsReportData {
  period: { from: number; to: number };
  summary: {
    totalSessions: number;
    totalOpeningAmount: number;
    totalClosingAmount: number;
    totalExpectedAmount: number;
    totalDifference: number;
    sessionsWithDiscrepancy: number;
  };
  sessions: {
    id: number;
    userName: string;
    openingAmount: number;
    closingAmount: number | null;
    expectedAmount: number | null;
    difference: number | null;
    openedAt: number;
    closedAt: number | null;
    notes: string | null;
  }[];
}

export interface RepairsReportData {
  period: { from: number; to: number };
  summary: {
    totalRepairs: number;
    totalRevenue: number;
    averageCost: number;
    averageCompletionDays: number;
  };
  byStatus: Record<string, number>;
  byTechnician: {
    technicianId: number;
    technicianName: string;
    repairCount: number;
    totalRevenue: number;
  }[];
  repairs: {
    id: number;
    customerName: string;
    deviceBrand: string;
    deviceModel: string;
    issueDescription: string;
    status: string;
    estimatedCost: number;
    finalCost: number | null;
    technicianName: string | null;
    createdAt: number;
    deliveredAt: number | null;
  }[];
}
