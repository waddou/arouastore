import React from "react";
import { SaleReceiptData } from "../../types";
import { useSettingsStore } from "../../pages/CurrencySettings";

interface SaleReceiptProps {
  data: SaleReceiptData;
}

export const SaleReceipt: React.FC<SaleReceiptProps> = ({ data }) => {
  const formatPrice = useSettingsStore((s) => s.formatPrice);
  const { sale, items, customer, store, seller } = data;

  const formatDate = (ts: number) =>
    new Date(ts * 1000).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const paymentLabel: Record<string, string> = {
    cash: "Espèces",
    card: "Carte",
    mobile: "Mobile",
  };

  return (
    <div className="receipt-content" style={{ width: "80mm", fontFamily: "monospace", fontSize: "12px", color: "#000", padding: "8px" }}>
      {/* Store Header */}
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <div style={{ fontSize: "16px", fontWeight: "bold" }}>{store.name}</div>
        {store.address && <div style={{ fontSize: "10px" }}>{store.address}</div>}
        {store.phone && <div style={{ fontSize: "10px" }}>Tél: {store.phone}</div>}
        {store.email && <div style={{ fontSize: "10px" }}>{store.email}</div>}
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

      {/* Receipt Info */}
      <div style={{ fontSize: "11px", marginBottom: "6px" }}>
        <div>Reçu N° {sale.id}</div>
        <div>Date: {formatDate(sale.createdAt)}</div>
        <div>Vendeur: {seller.name}</div>
        {customer && <div>Client: {customer.name} ({customer.phone})</div>}
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

      {/* Items Table */}
      <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", paddingBottom: "4px" }}>Article</th>
            <th style={{ textAlign: "center", paddingBottom: "4px" }}>Qté</th>
            <th style={{ textAlign: "right", paddingBottom: "4px" }}>P.U.</th>
            <th style={{ textAlign: "right", paddingBottom: "4px" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td style={{ paddingBottom: "2px" }}>{item.productName}</td>
              <td style={{ textAlign: "center" }}>{item.quantity}</td>
              <td style={{ textAlign: "right" }}>{formatPrice(item.unitPrice)}</td>
              <td style={{ textAlign: "right" }}>{formatPrice(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

      {/* Totals */}
      <div style={{ fontSize: "11px" }}>
        {sale.discount > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Sous-total:</span>
              <span>{formatPrice(sale.total + sale.discount)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Remise:</span>
              <span>-{formatPrice(sale.discount)}</span>
            </div>
          </>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "14px", marginTop: "4px" }}>
          <span>TOTAL:</span>
          <span>{formatPrice(sale.total)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
          <span>Paiement:</span>
          <span>{paymentLabel[sale.paymentMethod] || sale.paymentMethod}</span>
        </div>
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

      {/* Footer */}
      <div style={{ textAlign: "center", fontSize: "10px" }}>
        <div>Merci pour votre achat !</div>
        <div style={{ marginTop: "4px" }}>
          {store.name} — {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
};
