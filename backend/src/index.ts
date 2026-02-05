/**
 * PhoneStore Backend API
 *
 * API endpoints for products, customers, sales, repairs, and cash sessions
 */

import { Hono } from "hono";
import type { Client } from "@sdk/server-types";
import { tables, buckets } from "@generated";
import { eq, and, desc, like, sql, count, sum, gte, lte } from "drizzle-orm";

/**
 * Create your Hono app
 * @param edgespark - EdgeSpark SDK client
 * @returns Hono app with your routes defined
 */
export async function createApp(
  edgespark: Client<typeof tables>,
): Promise<Hono> {
  const app = new Hono();

  // ═══════════════════════════════════════════════════════════
  // PATH CONVENTIONS (Authentication)
  //
  // /api/*          → Login required (edgespark.auth.user guaranteed)
  // /api/public/*   → Login optional (edgespark.auth.user if logged in)
  // /api/webhooks/* → No auth check (handle verification yourself)
  // ═══════════════════════════════════════════════════════════

  // ===========================================
  // PRODUCTS ENDPOINTS
  // ===========================================

  // GET all products (with optional filters)
  app.get("/api/public/products", async (c) => {
    try {
      const category = c.req.query("category");
      const search = c.req.query("search");
      const lowStock = c.req.query("lowStock");

      // Build conditions array
      const conditions = [];
      if (category) {
        conditions.push(eq(tables.products.category, category));
      }
      if (search) {
        conditions.push(like(tables.products.name, `%${search}%`));
      }

      let products;
      if (conditions.length > 0) {
        products = await edgespark.db
          .select()
          .from(tables.products)
          .where(and(...conditions))
          .orderBy(desc(tables.products.createdAt));
      } else {
        products = await edgespark.db
          .select()
          .from(tables.products)
          .orderBy(desc(tables.products.createdAt));
      }

      // Filter low stock products if requested
      let result = products;
      if (lowStock === "true") {
        result = products.filter((p) => p.stock <= p.alertThreshold);
      }

      console.log(
        "[API] GET /api/public/products - fetched",
        result.length,
        "products",
      );
      return c.json({ data: result });
    } catch (error) {
      console.error("[API] GET /api/public/products - error:", error);
      return c.json(
        { error: "Erreur lors de la récupération des produits" },
        500,
      );
    }
  });

  // GET single product
  app.get("/api/public/products/:id", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      if (isNaN(id)) return c.json({ error: "ID invalide" }, 400);

      const result = await edgespark.db
        .select()
        .from(tables.products)
        .where(eq(tables.products.id, id));

      if (result.length === 0) {
        return c.json({ error: "Produit non trouvé" }, 404);
      }

      return c.json({ data: result[0] });
    } catch (error) {
      console.error("[API] GET /api/public/products/:id - error:", error);
      return c.json({ error: "Erreur serveur" }, 500);
    }
  });

  // CREATE product
  app.post("/api/products", async (c) => {
    try {
      const data = await c.req.json();

      if (!data.name || !data.sku || !data.category) {
        return c.json({ error: "Nom, SKU et catégorie sont requis" }, 400);
      }

      const product = await edgespark.db
        .insert(tables.products)
        .values({
          sku: data.sku,
          name: data.name,
          category: data.category,
          brand: data.brand || null,
          model: data.model || null,
          pricePurchase: data.pricePurchase || 0,
          priceSale: data.priceSale || 0,
          stock: data.stock || 0,
          alertThreshold: data.alertThreshold || 5,
          imageUrl: data.imageUrl || null,
          isActive: 1,
        })
        .returning();

      console.log("[API] POST /api/products - created product:", product[0].id);
      return c.json({ data: product[0] }, 201);
    } catch (error) {
      console.error("[API] POST /api/products - error:", error);
      return c.json({ error: "Erreur lors de la création du produit" }, 500);
    }
  });

  // UPDATE product
  app.put("/api/products/:id", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      if (isNaN(id)) return c.json({ error: "ID invalide" }, 400);

      const data = await c.req.json();

      const updated = await edgespark.db
        .update(tables.products)
        .set({
          ...data,
          updatedAt: Math.floor(Date.now() / 1000),
        })
        .where(eq(tables.products.id, id))
        .returning();

      if (updated.length === 0) {
        return c.json({ error: "Produit non trouvé" }, 404);
      }

      console.log("[API] PUT /api/products/:id - updated product:", id);
      return c.json({ data: updated[0] });
    } catch (error) {
      console.error("[API] PUT /api/products/:id - error:", error);
      return c.json({ error: "Erreur lors de la mise à jour" }, 500);
    }
  });

  // DELETE product
  app.delete("/api/products/:id", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      if (isNaN(id)) return c.json({ error: "ID invalide" }, 400);

      await edgespark.db
        .delete(tables.products)
        .where(eq(tables.products.id, id));

      console.log("[API] DELETE /api/products/:id - deleted product:", id);
      return c.json({ success: true });
    } catch (error) {
      console.error("[API] DELETE /api/products/:id - error:", error);
      return c.json({ error: "Erreur lors de la suppression" }, 500);
    }
  });

  // ===========================================
  // CUSTOMERS ENDPOINTS
  // ===========================================

  // GET all customers
  app.get("/api/public/customers", async (c) => {
    try {
      const search = c.req.query("search");

      let customers;
      if (search) {
        customers = await edgespark.db
          .select()
          .from(tables.customers)
          .where(like(tables.customers.phone, `%${search}%`))
          .orderBy(desc(tables.customers.createdAt));
      } else {
        customers = await edgespark.db
          .select()
          .from(tables.customers)
          .orderBy(desc(tables.customers.createdAt));
      }

      console.log(
        "[API] GET /api/public/customers - fetched",
        customers.length,
        "customers",
      );
      return c.json({ data: customers });
    } catch (error) {
      console.error("[API] GET /api/public/customers - error:", error);
      return c.json(
        { error: "Erreur lors de la récupération des clients" },
        500,
      );
    }
  });

  // GET single customer
  app.get("/api/public/customers/:id", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      if (isNaN(id)) return c.json({ error: "ID invalide" }, 400);

      const result = await edgespark.db
        .select()
        .from(tables.customers)
        .where(eq(tables.customers.id, id));

      if (result.length === 0) {
        return c.json({ error: "Client non trouvé" }, 404);
      }

      return c.json({ data: result[0] });
    } catch (error) {
      console.error("[API] GET /api/public/customers/:id - error:", error);
      return c.json({ error: "Erreur serveur" }, 500);
    }
  });

  // CREATE customer
  app.post("/api/customers", async (c) => {
    try {
      const data = await c.req.json();

      if (!data.phone || !data.name) {
        return c.json({ error: "Téléphone et nom sont requis" }, 400);
      }

      const customer = await edgespark.db
        .insert(tables.customers)
        .values({
          phone: data.phone,
          name: data.name,
          totalSpent: 0,
        })
        .returning();

      console.log(
        "[API] POST /api/customers - created customer:",
        customer[0].id,
      );
      return c.json({ data: customer[0] }, 201);
    } catch (error) {
      console.error("[API] POST /api/customers - error:", error);
      return c.json({ error: "Erreur lors de la création du client" }, 500);
    }
  });

  // GET customer history (sales and repairs)
  app.get("/api/public/customers/:id/history", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      if (isNaN(id)) return c.json({ error: "ID invalide" }, 400);

      // Get customer info
      const customer = await edgespark.db
        .select()
        .from(tables.customers)
        .where(eq(tables.customers.id, id));

      if (customer.length === 0) {
        return c.json({ error: "Client non trouvé" }, 404);
      }

      // Get customer sales
      const sales = await edgespark.db
        .select()
        .from(tables.sales)
        .where(eq(tables.sales.customerId, id))
        .orderBy(desc(tables.sales.createdAt));

      // Get sale items for each sale
      const salesWithItems = await Promise.all(
        sales.map(async (sale) => {
          const items = await edgespark.db
            .select({
              id: tables.saleItems.id,
              quantity: tables.saleItems.quantity,
              unitPrice: tables.saleItems.unitPrice,
              subtotal: tables.saleItems.subtotal,
              productName: tables.products.name,
            })
            .from(tables.saleItems)
            .leftJoin(
              tables.products,
              eq(tables.saleItems.productId, tables.products.id),
            )
            .where(eq(tables.saleItems.saleId, sale.id));
          return { ...sale, items };
        }),
      );

      // Get customer repairs
      const repairs = await edgespark.db
        .select()
        .from(tables.repairs)
        .where(eq(tables.repairs.customerId, id))
        .orderBy(desc(tables.repairs.createdAt));

      console.log(
        "[API] GET /api/public/customers/:id/history - customer:",
        id,
        "sales:",
        sales.length,
        "repairs:",
        repairs.length,
      );
      return c.json({
        data: {
          customer: customer[0],
          sales: salesWithItems,
          repairs,
        },
      });
    } catch (error) {
      console.error(
        "[API] GET /api/public/customers/:id/history - error:",
        error,
      );
      return c.json({ error: "Erreur serveur" }, 500);
    }
  });

  // UPDATE customer
  app.put("/api/customers/:id", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      if (isNaN(id)) return c.json({ error: "ID invalide" }, 400);

      const data = await c.req.json();

      const updated = await edgespark.db
        .update(tables.customers)
        .set(data)
        .where(eq(tables.customers.id, id))
        .returning();

      if (updated.length === 0) {
        return c.json({ error: "Client non trouvé" }, 404);
      }

      console.log("[API] PUT /api/customers/:id - updated customer:", id);
      return c.json({ data: updated[0] });
    } catch (error) {
      console.error("[API] PUT /api/customers/:id - error:", error);
      return c.json({ error: "Erreur lors de la mise à jour" }, 500);
    }
  });

  // ===========================================
  // SALES ENDPOINTS
  // ===========================================

  // GET all sales
  app.get("/api/public/sales", async (c) => {
    try {
      const startDate = c.req.query("startDate");
      const endDate = c.req.query("endDate");
      const limit = parseInt(c.req.query("limit") || "50");

      // Build conditions array
      const conditions = [];
      if (startDate) {
        conditions.push(gte(tables.sales.createdAt, parseInt(startDate)));
      }
      if (endDate) {
        conditions.push(lte(tables.sales.createdAt, parseInt(endDate)));
      }

      let sales;
      if (conditions.length > 0) {
        sales = await edgespark.db
          .select()
          .from(tables.sales)
          .where(and(...conditions))
          .orderBy(desc(tables.sales.createdAt))
          .limit(limit);
      } else {
        sales = await edgespark.db
          .select()
          .from(tables.sales)
          .orderBy(desc(tables.sales.createdAt))
          .limit(limit);
      }

      console.log(
        "[API] GET /api/public/sales - fetched",
        sales.length,
        "sales",
      );
      return c.json({ data: sales });
    } catch (error) {
      console.error("[API] GET /api/public/sales - error:", error);
      return c.json(
        { error: "Erreur lors de la récupération des ventes" },
        500,
      );
    }
  });

  // GET single sale with items
  app.get("/api/public/sales/:id", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      if (isNaN(id)) return c.json({ error: "ID invalide" }, 400);

      const sale = await edgespark.db
        .select()
        .from(tables.sales)
        .where(eq(tables.sales.id, id));

      if (sale.length === 0) {
        return c.json({ error: "Vente non trouvée" }, 404);
      }

      // Get sale items
      const items = await edgespark.db
        .select()
        .from(tables.saleItems)
        .where(eq(tables.saleItems.saleId, id));

      return c.json({ data: { ...sale[0], items } });
    } catch (error) {
      console.error("[API] GET /api/public/sales/:id - error:", error);
      return c.json({ error: "Erreur serveur" }, 500);
    }
  });

  // CREATE sale (with items and stock update)
  app.post("/api/sales", async (c) => {
    try {
      const data = await c.req.json();
      const user = edgespark.auth.user;

      if (!data.items || data.items.length === 0) {
        return c.json(
          { error: "La vente doit contenir au moins un article" },
          400,
        );
      }

      // Calculate total
      let total = 0;
      for (const item of data.items) {
        total += item.unitPrice * item.quantity;
      }

      // Apply discount
      const discount = data.discount || 0;
      const finalTotal = total - discount;

      // Create sale - userId to 1 as fallback for testing
      const sale = await edgespark.db
        .insert(tables.sales)
        .values({
          customerId: data.customerId || null,
          userId: 1, // Will use auth user later
          total: finalTotal,
          discount: discount,
          paymentMethod: data.paymentMethod || "cash",
          status: "completed",
        })
        .returning();

      const saleId = sale[0].id;

      // Insert sale items and update stock
      for (const item of data.items) {
        // Insert sale item
        await edgespark.db.insert(tables.saleItems).values({
          saleId: saleId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.unitPrice * item.quantity,
        });

        // Update product stock
        const product = await edgespark.db
          .select()
          .from(tables.products)
          .where(eq(tables.products.id, item.productId));

        if (product.length > 0) {
          const newStock = Math.max(0, product[0].stock - item.quantity);
          await edgespark.db
            .update(tables.products)
            .set({ stock: newStock })
            .where(eq(tables.products.id, item.productId));
        }
      }

      // Update customer total spent if customer exists
      if (data.customerId) {
        const customer = await edgespark.db
          .select()
          .from(tables.customers)
          .where(eq(tables.customers.id, data.customerId));

        if (customer.length > 0) {
          await edgespark.db
            .update(tables.customers)
            .set({ totalSpent: customer[0].totalSpent + finalTotal })
            .where(eq(tables.customers.id, data.customerId));
        }
      }

      console.log(
        "[API] POST /api/sales - created sale:",
        saleId,
        "total:",
        finalTotal,
      );
      return c.json({ data: sale[0] }, 201);
    } catch (error) {
      console.error("[API] POST /api/sales - error:", error);
      return c.json({ error: "Erreur lors de la création de la vente" }, 500);
    }
  });

  // CANCEL sale (refund stock)
  app.put("/api/sales/:id/cancel", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      if (isNaN(id)) return c.json({ error: "ID invalide" }, 400);

      const sale = await edgespark.db
        .select()
        .from(tables.sales)
        .where(eq(tables.sales.id, id));

      if (sale.length === 0) {
        return c.json({ error: "Vente non trouvée" }, 404);
      }

      if (sale[0].status !== "completed") {
        return c.json({ error: "Cette vente ne peut pas être annulée" }, 400);
      }

      // Get sale items to restore stock
      const items = await edgespark.db
        .select()
        .from(tables.saleItems)
        .where(eq(tables.saleItems.saleId, id));

      // Restore stock for each item
      for (const item of items) {
        const product = await edgespark.db
          .select()
          .from(tables.products)
          .where(eq(tables.products.id, item.productId));

        if (product.length > 0) {
          await edgespark.db
            .update(tables.products)
            .set({ stock: product[0].stock + item.quantity })
            .where(eq(tables.products.id, item.productId));
        }
      }

      // Update sale status
      const updated = await edgespark.db
        .update(tables.sales)
        .set({ status: "cancelled" })
        .where(eq(tables.sales.id, id))
        .returning();

      console.log("[API] PUT /api/sales/:id/cancel - cancelled sale:", id);
      return c.json({ data: updated[0] });
    } catch (error) {
      console.error("[API] PUT /api/sales/:id/cancel - error:", error);
      return c.json({ error: "Erreur lors de l'annulation" }, 500);
    }
  });

  // ===========================================
  // REPAIRS ENDPOINTS
  // ===========================================

  // GET all repairs
  app.get("/api/public/repairs", async (c) => {
    try {
      const status = c.req.query("status");
      const customerId = c.req.query("customerId");

      // Build conditions array
      const conditions = [];
      if (status) {
        conditions.push(eq(tables.repairs.status, status));
      }
      if (customerId) {
        conditions.push(eq(tables.repairs.customerId, parseInt(customerId)));
      }

      let repairs;
      if (conditions.length > 0) {
        repairs = await edgespark.db
          .select()
          .from(tables.repairs)
          .where(and(...conditions))
          .orderBy(desc(tables.repairs.createdAt));
      } else {
        repairs = await edgespark.db
          .select()
          .from(tables.repairs)
          .orderBy(desc(tables.repairs.createdAt));
      }

      console.log(
        "[API] GET /api/public/repairs - fetched",
        repairs.length,
        "repairs",
      );
      return c.json({ data: repairs });
    } catch (error) {
      console.error("[API] GET /api/public/repairs - error:", error);
      return c.json(
        { error: "Erreur lors de la récupération des réparations" },
        500,
      );
    }
  });

  // GET single repair
  app.get("/api/public/repairs/:id", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      if (isNaN(id)) return c.json({ error: "ID invalide" }, 400);

      const result = await edgespark.db
        .select()
        .from(tables.repairs)
        .where(eq(tables.repairs.id, id));

      if (result.length === 0) {
        return c.json({ error: "Réparation non trouvée" }, 404);
      }

      // Get customer info
      const customer = await edgespark.db
        .select()
        .from(tables.customers)
        .where(eq(tables.customers.id, result[0].customerId));

      return c.json({
        data: {
          ...result[0],
          customer: customer.length > 0 ? customer[0] : null,
        },
      });
    } catch (error) {
      console.error("[API] GET /api/public/repairs/:id - error:", error);
      return c.json({ error: "Erreur serveur" }, 500);
    }
  });

  // CREATE repair
  app.post("/api/repairs", async (c) => {
    try {
      const data = await c.req.json();

      if (
        !data.customerId ||
        !data.deviceBrand ||
        !data.deviceModel ||
        !data.issueDescription
      ) {
        return c.json(
          {
            error:
              "Client, marque, modèle et description du problème sont requis",
          },
          400,
        );
      }

      const repair = await edgespark.db
        .insert(tables.repairs)
        .values({
          customerId: data.customerId,
          deviceBrand: data.deviceBrand,
          deviceModel: data.deviceModel,
          deviceVariant: data.deviceVariant || null,
          devicePassword: data.devicePassword || null,
          physicalState: data.physicalState || null,
          issueDescription: data.issueDescription,
          diagnosis: data.diagnosis || null,
          status: "new",
          estimatedCost: data.estimatedCost || 0,
          technicianId: data.technicianId || null,
          promisedDate: data.promisedDate || null,
        })
        .returning();

      console.log("[API] POST /api/repairs - created repair:", repair[0].id);
      return c.json({ data: repair[0] }, 201);
    } catch (error) {
      console.error("[API] POST /api/repairs - error:", error);
      return c.json(
        { error: "Erreur lors de la création de la réparation" },
        500,
      );
    }
  });

  // UPDATE repair
  app.put("/api/repairs/:id", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      if (isNaN(id)) return c.json({ error: "ID invalide" }, 400);

      const data = await c.req.json();

      // If status is changing to delivered, set deliveredAt
      if (data.status === "delivered") {
        data.deliveredAt = Math.floor(Date.now() / 1000);
      }

      const updated = await edgespark.db
        .update(tables.repairs)
        .set({
          ...data,
          updatedAt: Math.floor(Date.now() / 1000),
        })
        .where(eq(tables.repairs.id, id))
        .returning();

      if (updated.length === 0) {
        return c.json({ error: "Réparation non trouvée" }, 404);
      }

      console.log(
        "[API] PUT /api/repairs/:id - updated repair:",
        id,
        "status:",
        updated[0].status,
      );
      return c.json({ data: updated[0] });
    } catch (error) {
      console.error("[API] PUT /api/repairs/:id - error:", error);
      return c.json({ error: "Erreur lors de la mise à jour" }, 500);
    }
  });

  // UPDATE repair status (shortcut endpoint)
  app.patch("/api/repairs/:id/status", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      if (isNaN(id)) return c.json({ error: "ID invalide" }, 400);

      const { status } = await c.req.json();

      if (!["new", "diagnostic", "repair", "delivered"].includes(status)) {
        return c.json({ error: "Statut invalide" }, 400);
      }

      const updateData: any = {
        status,
        updatedAt: Math.floor(Date.now() / 1000),
      };

      if (status === "delivered") {
        updateData.deliveredAt = Math.floor(Date.now() / 1000);
      }

      const updated = await edgespark.db
        .update(tables.repairs)
        .set(updateData)
        .where(eq(tables.repairs.id, id))
        .returning();

      if (updated.length === 0) {
        return c.json({ error: "Réparation non trouvée" }, 404);
      }

      console.log(
        "[API] PATCH /api/repairs/:id/status - changed status:",
        id,
        "->",
        status,
      );
      return c.json({ data: updated[0] });
    } catch (error) {
      console.error("[API] PATCH /api/repairs/:id/status - error:", error);
      return c.json({ error: "Erreur lors de la mise à jour du statut" }, 500);
    }
  });

  // ===========================================
  // CASH SESSIONS ENDPOINTS
  // ===========================================

  // GET current open session
  app.get("/api/public/cash-sessions/current", async (c) => {
    try {
      const sessions = await edgespark.db
        .select()
        .from(tables.cashSessions)
        .where(sql`${tables.cashSessions.closedAt} IS NULL`)
        .orderBy(desc(tables.cashSessions.openedAt))
        .limit(1);

      if (sessions.length === 0) {
        return c.json({ data: null });
      }

      return c.json({ data: sessions[0] });
    } catch (error) {
      console.error(
        "[API] GET /api/public/cash-sessions/current - error:",
        error,
      );
      return c.json({ error: "Erreur serveur" }, 500);
    }
  });

  // GET all cash sessions
  app.get("/api/public/cash-sessions", async (c) => {
    try {
      const limit = parseInt(c.req.query("limit") || "30");

      const sessions = await edgespark.db
        .select()
        .from(tables.cashSessions)
        .orderBy(desc(tables.cashSessions.openedAt))
        .limit(limit);

      console.log(
        "[API] GET /api/public/cash-sessions - fetched",
        sessions.length,
        "sessions",
      );
      return c.json({ data: sessions });
    } catch (error) {
      console.error("[API] GET /api/public/cash-sessions - error:", error);
      return c.json(
        { error: "Erreur lors de la récupération des sessions" },
        500,
      );
    }
  });

  // OPEN cash session
  app.post("/api/cash-sessions/open", async (c) => {
    try {
      const data = await c.req.json();

      // Check if there's already an open session
      const openSessions = await edgespark.db
        .select()
        .from(tables.cashSessions)
        .where(sql`${tables.cashSessions.closedAt} IS NULL`);

      if (openSessions.length > 0) {
        return c.json({ error: "Une session de caisse est déjà ouverte" }, 400);
      }

      const session = await edgespark.db
        .insert(tables.cashSessions)
        .values({
          userId: 1, // Will use auth user later
          openingAmount: data.openingAmount || 0,
          notes: data.notes || null,
        })
        .returning();

      console.log(
        "[API] POST /api/cash-sessions/open - opened session:",
        session[0].id,
      );
      return c.json({ data: session[0] }, 201);
    } catch (error) {
      console.error("[API] POST /api/cash-sessions/open - error:", error);
      return c.json({ error: "Erreur lors de l'ouverture de la caisse" }, 500);
    }
  });

  // CLOSE cash session
  app.put("/api/cash-sessions/:id/close", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      if (isNaN(id)) return c.json({ error: "ID invalide" }, 400);

      const data = await c.req.json();

      const session = await edgespark.db
        .select()
        .from(tables.cashSessions)
        .where(eq(tables.cashSessions.id, id));

      if (session.length === 0) {
        return c.json({ error: "Session non trouvée" }, 404);
      }

      if (session[0].closedAt !== null) {
        return c.json({ error: "Cette session est déjà fermée" }, 400);
      }

      // Calculate expected amount (opening + cash sales)
      const openedAt = session[0].openedAt ?? 0;
      const salesResult = await edgespark.db
        .select({ total: sum(tables.sales.total) })
        .from(tables.sales)
        .where(
          and(
            eq(tables.sales.paymentMethod, "cash"),
            eq(tables.sales.status, "completed"),
            gte(tables.sales.createdAt, openedAt),
          ),
        );

      const cashSalesTotal = salesResult[0]?.total || 0;
      const expectedAmount = session[0].openingAmount + Number(cashSalesTotal);
      const closingAmount = data.closingAmount || 0;
      const difference = closingAmount - expectedAmount;

      const updated = await edgespark.db
        .update(tables.cashSessions)
        .set({
          closingAmount: closingAmount,
          expectedAmount: expectedAmount,
          difference: difference,
          closedAt: Math.floor(Date.now() / 1000),
          notes: data.notes || session[0].notes,
        })
        .where(eq(tables.cashSessions.id, id))
        .returning();

      console.log(
        "[API] PUT /api/cash-sessions/:id/close - closed session:",
        id,
        "difference:",
        difference,
      );
      return c.json({ data: updated[0] });
    } catch (error) {
      console.error("[API] PUT /api/cash-sessions/:id/close - error:", error);
      return c.json({ error: "Erreur lors de la fermeture de la caisse" }, 500);
    }
  });

  // ===========================================
  // DASHBOARD / STATS ENDPOINTS
  // ===========================================

  // GET dashboard stats
  app.get("/api/public/stats/dashboard", async (c) => {
    try {
      const now = Math.floor(Date.now() / 1000);
      const todayStart = now - (now % 86400); // Start of today

      // Total sales today
      const salesToday = await edgespark.db
        .select({
          count: count(),
          total: sum(tables.sales.total),
        })
        .from(tables.sales)
        .where(
          and(
            gte(tables.sales.createdAt, todayStart),
            eq(tables.sales.status, "completed"),
          ),
        );

      // Active repairs count by status
      const repairsByStatus = await edgespark.db
        .select({
          status: tables.repairs.status,
          count: count(),
        })
        .from(tables.repairs)
        .groupBy(tables.repairs.status);

      // Low stock products count
      const lowStockProducts = await edgespark.db
        .select({ count: count() })
        .from(tables.products)
        .where(
          sql`${tables.products.stock} <= ${tables.products.alertThreshold} AND ${tables.products.isActive} = 1`,
        );

      // Total products
      const totalProducts = await edgespark.db
        .select({ count: count() })
        .from(tables.products)
        .where(eq(tables.products.isActive, 1));

      // Total customers
      const totalCustomers = await edgespark.db
        .select({ count: count() })
        .from(tables.customers);

      const stats = {
        salesToday: {
          count: salesToday[0]?.count || 0,
          total: Number(salesToday[0]?.total || 0),
        },
        repairs: repairsByStatus.reduce(
          (acc, r) => {
            acc[r.status] = r.count;
            return acc;
          },
          {} as Record<string, number>,
        ),
        lowStockCount: lowStockProducts[0]?.count || 0,
        totalProducts: totalProducts[0]?.count || 0,
        totalCustomers: totalCustomers[0]?.count || 0,
      };

      console.log("[API] GET /api/public/stats/dashboard - stats fetched");
      return c.json({ data: stats });
    } catch (error) {
      console.error("[API] GET /api/public/stats/dashboard - error:", error);
      return c.json(
        { error: "Erreur lors de la récupération des statistiques" },
        500,
      );
    }
  });

  // GET sales stats for a period
  app.get("/api/public/stats/sales", async (c) => {
    try {
      const period = c.req.query("period") || "week"; // week, month, year
      const now = Math.floor(Date.now() / 1000);

      let startDate: number;
      switch (period) {
        case "month":
          startDate = now - 30 * 86400;
          break;
        case "year":
          startDate = now - 365 * 86400;
          break;
        default: // week
          startDate = now - 7 * 86400;
      }

      const sales = await edgespark.db
        .select({
          count: count(),
          total: sum(tables.sales.total),
        })
        .from(tables.sales)
        .where(
          and(
            gte(tables.sales.createdAt, startDate),
            eq(tables.sales.status, "completed"),
          ),
        );

      return c.json({
        data: {
          period,
          count: sales[0]?.count || 0,
          total: Number(sales[0]?.total || 0),
        },
      });
    } catch (error) {
      console.error("[API] GET /api/public/stats/sales - error:", error);
      return c.json({ error: "Erreur serveur" }, 500);
    }
  });

  // ===========================================
  // USER ROLES ENDPOINTS
  // ===========================================

  // GET current user's role
  app.get("/api/me/role", async (c) => {
    try {
      const userId = edgespark.auth.user!.id;

      const result = await edgespark.db
        .select()
        .from(tables.userRoles)
        .where(eq(tables.userRoles.authUserId, userId));

      const role = result.length > 0 ? result[0].role : "agent";

      return c.json({
        data: {
          role,
          userId,
          email: edgespark.auth.user!.email,
          name: edgespark.auth.user!.name,
        },
      });
    } catch (error) {
      console.error("[API] GET /api/me/role - error:", error);
      return c.json({ error: "Erreur serveur" }, 500);
    }
  });

  // GET all user roles (admin only)
  app.get("/api/admin/users", async (c) => {
    try {
      const userId = edgespark.auth.user!.id;

      // Check if current user is admin
      const currentRole = await edgespark.db
        .select()
        .from(tables.userRoles)
        .where(eq(tables.userRoles.authUserId, userId));

      if (currentRole.length === 0 || currentRole[0].role !== "admin") {
        return c.json({ error: "Accès non autorisé" }, 403);
      }

      // Get all user roles
      const roles = await edgespark.db
        .select()
        .from(tables.userRoles)
        .orderBy(desc(tables.userRoles.createdAt));

      return c.json({ data: roles });
    } catch (error) {
      console.error("[API] GET /api/admin/users - error:", error);
      return c.json({ error: "Erreur serveur" }, 500);
    }
  });

  // SET user role (admin only)
  app.post("/api/admin/users/role", async (c) => {
    try {
      const currentUserId = edgespark.auth.user!.id;

      // Check if current user is admin
      const currentRole = await edgespark.db
        .select()
        .from(tables.userRoles)
        .where(eq(tables.userRoles.authUserId, currentUserId));

      if (currentRole.length === 0 || currentRole[0].role !== "admin") {
        return c.json({ error: "Accès non autorisé" }, 403);
      }

      const { authUserId, role } = await c.req.json();

      if (!authUserId || !role) {
        return c.json({ error: "authUserId et role sont requis" }, 400);
      }

      if (!["admin", "manager", "agent"].includes(role)) {
        return c.json(
          { error: "Rôle invalide. Valeurs acceptées: admin, manager, agent" },
          400,
        );
      }

      // Check if role exists for this user
      const existing = await edgespark.db
        .select()
        .from(tables.userRoles)
        .where(eq(tables.userRoles.authUserId, authUserId));

      if (existing.length > 0) {
        // Update existing role
        await edgespark.db
          .update(tables.userRoles)
          .set({ role })
          .where(eq(tables.userRoles.authUserId, authUserId));
      } else {
        // Create new role
        await edgespark.db
          .insert(tables.userRoles)
          .values({ authUserId, role });
      }

      console.log(
        "[API] POST /api/admin/users/role - set role:",
        authUserId,
        "->",
        role,
      );
      return c.json({ success: true, data: { authUserId, role } });
    } catch (error) {
      console.error("[API] POST /api/admin/users/role - error:", error);
      return c.json({ error: "Erreur serveur" }, 500);
    }
  });

  // DELETE user role (admin only)
  app.delete("/api/admin/users/:authUserId", async (c) => {
    try {
      const currentUserId = edgespark.auth.user!.id;

      // Check if current user is admin
      const currentRole = await edgespark.db
        .select()
        .from(tables.userRoles)
        .where(eq(tables.userRoles.authUserId, currentUserId));

      if (currentRole.length === 0 || currentRole[0].role !== "admin") {
        return c.json({ error: "Accès non autorisé" }, 403);
      }

      const authUserId = c.req.param("authUserId");

      // Prevent self-deletion
      if (authUserId === currentUserId) {
        return c.json(
          { error: "Vous ne pouvez pas supprimer votre propre compte" },
          400,
        );
      }

      // Check if user exists
      const existing = await edgespark.db
        .select()
        .from(tables.userRoles)
        .where(eq(tables.userRoles.authUserId, authUserId));

      if (existing.length === 0) {
        return c.json({ error: "Utilisateur non trouvé" }, 404);
      }

      // Delete the user role
      await edgespark.db
        .delete(tables.userRoles)
        .where(eq(tables.userRoles.authUserId, authUserId));

      console.log(
        "[API] DELETE /api/admin/users/:authUserId - deleted:",
        authUserId,
      );
      return c.json({ success: true });
    } catch (error) {
      console.error(
        "[API] DELETE /api/admin/users/:authUserId - error:",
        error,
      );
      return c.json({ error: "Erreur serveur" }, 500);
    }
  });

  // ADD new user with role (admin only)
  app.post("/api/admin/users", async (c) => {
    try {
      const currentUserId = edgespark.auth.user!.id;

      // Check if current user is admin
      const currentRole = await edgespark.db
        .select()
        .from(tables.userRoles)
        .where(eq(tables.userRoles.authUserId, currentUserId));

      if (currentRole.length === 0 || currentRole[0].role !== "admin") {
        return c.json({ error: "Accès non autorisé" }, 403);
      }

      const { email, role, name } = await c.req.json();

      if (!email || !role) {
        return c.json({ error: "Email et rôle sont requis" }, 400);
      }

      if (!["admin", "manager", "agent"].includes(role)) {
        return c.json(
          { error: "Rôle invalide. Valeurs acceptées: admin, manager, agent" },
          400,
        );
      }

      // Generate a unique ID based on email (since user hasn't logged in yet)
      const pendingUserId = `pending_${email.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

      // Check if email already exists (by email field or pending ID)
      const existingByEmail = await edgespark.db
        .select()
        .from(tables.userRoles)
        .where(eq(tables.userRoles.email, email.toLowerCase()));

      const existingById = await edgespark.db
        .select()
        .from(tables.userRoles)
        .where(eq(tables.userRoles.authUserId, pendingUserId));

      if (existingByEmail.length > 0 || existingById.length > 0) {
        return c.json(
          { error: "Un utilisateur avec cet email existe déjà" },
          400,
        );
      }

      // Create new user role entry
      const result = await edgespark.db
        .insert(tables.userRoles)
        .values({
          authUserId: pendingUserId,
          role,
          email: email.toLowerCase(),
          name: name || null,
        })
        .returning();

      console.log(
        "[API] POST /api/admin/users - created user:",
        pendingUserId,
        "with role:",
        role,
      );
      return c.json({ success: true, data: result[0] });
    } catch (error) {
      console.error("[API] POST /api/admin/users - error:", error);
      return c.json({ error: "Erreur serveur" }, 500);
    }
  });

  // Set first admin (one-time setup - only works if no admin exists)
  app.post("/api/public/setup-admin", async (c) => {
    try {
      // Check if any admin exists
      const existingAdmins = await edgespark.db
        .select()
        .from(tables.userRoles)
        .where(eq(tables.userRoles.role, "admin"));

      if (existingAdmins.length > 0) {
        return c.json({ error: "Un administrateur existe déjà" }, 400);
      }

      const { authUserId } = await c.req.json();

      if (!authUserId) {
        return c.json({ error: "authUserId requis" }, 400);
      }

      // Create admin role
      await edgespark.db
        .insert(tables.userRoles)
        .values({ authUserId, role: "admin" });

      console.log(
        "[API] POST /api/public/setup-admin - created first admin:",
        authUserId,
      );
      return c.json({ success: true, data: { authUserId, role: "admin" } });
    } catch (error) {
      console.error("[API] POST /api/public/setup-admin - error:", error);
      return c.json({ error: "Erreur serveur" }, 500);
    }
  });

  // TEMPORARY: Add additional admin (remove after setup)
  app.post("/api/public/add-admin-temp", async (c) => {
    try {
      const { authUserId, email } = await c.req.json();

      if (!authUserId) {
        return c.json({ error: "authUserId requis" }, 400);
      }

      // Check if user already has a role
      const existing = await edgespark.db
        .select()
        .from(tables.userRoles)
        .where(eq(tables.userRoles.authUserId, authUserId));

      if (existing.length > 0) {
        // Update to admin
        await edgespark.db
          .update(tables.userRoles)
          .set({ role: "admin" })
          .where(eq(tables.userRoles.authUserId, authUserId));
      } else {
        // Create admin role
        await edgespark.db
          .insert(tables.userRoles)
          .values({ authUserId, role: "admin", email: email || null });
      }

      console.log(
        "[API] POST /api/public/add-admin-temp - added admin:",
        authUserId,
      );
      return c.json({ success: true, data: { authUserId, role: "admin" } });
    } catch (error) {
      console.error("[API] POST /api/public/add-admin-temp - error:", error);
      return c.json({ error: "Erreur serveur" }, 500);
    }
  });

  return app;
}
