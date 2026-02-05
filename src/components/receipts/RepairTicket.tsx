import React from "react";
import { RepairTicketData } from "../../types";
import { useSettingsStore } from "../../pages/CurrencySettings";

interface RepairTicketProps {
  data: RepairTicketData;
}

export const RepairTicket: React.FC<RepairTicketProps> = ({ data }) => {
  const formatPrice = useSettingsStore((s) => s.formatPrice);
  const { repair, customer, technician, store } = data;

  const formatDate = (ts: number) =>
    new Date(ts * 1000).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const statusLabel: Record<string, string> = {
    new: "Nouveau",
    diagnostic: "Diagnostic",
    repair: "En réparation",
    delivered: "Livré",
  };

  return (
    <div className="receipt-content" style={{ width: "80mm", fontFamily: "monospace", fontSize: "12px", color: "#000", padding: "8px" }}>
      {/* Store Header */}
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <div style={{ fontSize: "16px", fontWeight: "bold" }}>{store.name}</div>
        {store.address && <div style={{ fontSize: "10px" }}>{store.address}</div>}
        {store.phone && <div style={{ fontSize: "10px" }}>Tél: {store.phone}</div>}
      </div>

      <div style={{ textAlign: "center", fontSize: "14px", fontWeight: "bold", margin: "8px 0" }}>
        TICKET DE RÉPARATION
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

      {/* Ticket Info */}
      <div style={{ fontSize: "11px", marginBottom: "6px" }}>
        <div><strong>Ticket N° {repair.id}</strong></div>
        <div>Date: {formatDate(repair.createdAt)}</div>
        <div>Statut: {statusLabel[repair.status] || repair.status}</div>
        {technician && <div>Technicien: {technician.name}</div>}
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

      {/* Customer */}
      <div style={{ fontSize: "11px", marginBottom: "6px" }}>
        <div style={{ fontWeight: "bold", marginBottom: "2px" }}>CLIENT</div>
        <div>Nom: {customer.name}</div>
        <div>Tél: {customer.phone}</div>
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

      {/* Device */}
      <div style={{ fontSize: "11px", marginBottom: "6px" }}>
        <div style={{ fontWeight: "bold", marginBottom: "2px" }}>APPAREIL</div>
        <div>Marque: {repair.deviceBrand}</div>
        <div>Modèle: {repair.deviceModel}</div>
        {repair.deviceVariant && <div>Variante: {repair.deviceVariant}</div>}
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

      {/* Issue */}
      <div style={{ fontSize: "11px", marginBottom: "6px" }}>
        <div style={{ fontWeight: "bold", marginBottom: "2px" }}>PROBLÈME</div>
        <div>{repair.issueDescription}</div>
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

      {/* Cost & Date */}
      <div style={{ fontSize: "11px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
          <span>Coût estimé:</span>
          <span>{formatPrice(repair.estimatedCost)}</span>
        </div>
        {repair.promisedDate && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Date promise:</span>
            <span>{formatDate(repair.promisedDate)}</span>
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

      {/* Conditions */}
      <div style={{ fontSize: "9px", marginBottom: "6px" }}>
        <div style={{ fontWeight: "bold", marginBottom: "2px" }}>CONDITIONS GÉNÉRALES</div>
        <div>- Les appareils non récupérés sous 30 jours seront considérés comme abandonnés.</div>
        <div>- Le magasin décline toute responsabilité pour les données perdues.</div>
        <div>- Le devis peut être révisé après diagnostic complet.</div>
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

      {/* Signature */}
      <div style={{ fontSize: "10px", marginTop: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div>Signature client:</div>
            <div style={{ borderBottom: "1px solid #000", width: "100px", height: "30px", marginTop: "4px" }} />
          </div>
          <div>
            <div>Signature magasin:</div>
            <div style={{ borderBottom: "1px solid #000", width: "100px", height: "30px", marginTop: "4px" }} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", fontSize: "10px", marginTop: "12px" }}>
        <div>{store.name} — {new Date().getFullYear()}</div>
      </div>
    </div>
  );
};
