import React, { useEffect, useState, useMemo } from "react";
import { useStore } from "../store/useStore";
import {
  Phone,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  ArrowRight,
  MessageCircle,
  X,
  User,
  Search,
  UserPlus,
  Smartphone,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Package,
  Pencil,
  Printer,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RepairStatus, Product } from "../types";
import { useSettingsStore } from "./CurrencySettings";
import { api, DeviceBrand, DeviceModel } from "../api/client";
import { RepairTicket } from "../components/receipts/RepairTicket";
import { printElement } from "../utils/print";

const statusConfig: Record<
  RepairStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  new: { label: "Nouveau", color: "rose", icon: AlertCircle },
  diagnostic: { label: "Diagnostic", color: "amber", icon: Clock },
  repair: { label: "En réparation", color: "blue", icon: Phone },
  delivered: { label: "Livré", color: "emerald", icon: CheckCircle },
};

const statusOrder: RepairStatus[] = [
  "new",
  "diagnostic",
  "repair",
  "delivered",
];

// États physiques du téléphone
const physicalStates = [
  { value: "excellent", label: "Excellent", color: "emerald" },
  { value: "good", label: "Bon état", color: "blue" },
  { value: "fair", label: "Usure normale", color: "amber" },
  { value: "poor", label: "Mauvais état", color: "orange" },
  { value: "broken", label: "Cassé/Endommagé", color: "red" },
];

// Interventions courantes
const commonInterventions = [
  { id: "screen", label: "Remplacement écran" },
  { id: "battery", label: "Remplacement batterie" },
  { id: "charging", label: "Port de charge" },
  { id: "speaker", label: "Haut-parleur" },
  { id: "mic", label: "Microphone" },
  { id: "camera", label: "Caméra" },
  { id: "button", label: "Boutons" },
  { id: "software", label: "Problème logiciel" },
  { id: "water", label: "Dégât des eaux" },
  { id: "other", label: "Autre" },
];

interface SelectedComponent {
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
}

export const Repairs = () => {
  const {
    repairs,
    customers,
    fetchRepairs,
    fetchCustomers,
    updateRepairStatus,
    updateRepair,
    createRepair,
    createCustomer,
    isLoading,
  } = useStore();
  const formatPrice = useSettingsStore((s) => s.formatPrice);
  const [showModal, setShowModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [phoneSearch, setPhoneSearch] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [components, setComponents] = useState<Product[]>([]);
  const [selectedComponents, setSelectedComponents] = useState<
    SelectedComponent[]
  >([]);
  const [selectedInterventions, setSelectedInterventions] = useState<string[]>(
    [],
  );
  const [activeSection, setActiveSection] = useState<
    "interventions" | "components" | null
  >(null);

  // État pour l'édition
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRepairId, setEditingRepairId] = useState<number | null>(null);
  const [editInterventions, setEditInterventions] = useState<string[]>([]);
  const [editComponents, setEditComponents] = useState<SelectedComponent[]>([]);
  const [editDescription, setEditDescription] = useState("");
  const [editLaborCost, setEditLaborCost] = useState(0);
  const [editActiveSection, setEditActiveSection] = useState<
    "interventions" | "components" | null
  >(null);

  const [newRepair, setNewRepair] = useState({
    customerId: 0,
    deviceBrandId: 0,
    deviceBrand: "",
    deviceModelId: 0,
    deviceModel: "",
    devicePassword: "",
    physicalState: "",
    issueDescription: "",
    estimatedCost: 0,
    customerName: "",
    customerPhone: "",
  });

  // Marques et modèles dynamiques
  const [deviceBrands, setDeviceBrands] = useState<DeviceBrand[]>([]);
  const [deviceModels, setDeviceModels] = useState<DeviceModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Charger les marques au montage
  useEffect(() => {
    api
      .getDeviceBrands()
      .then(setDeviceBrands)
      .catch(() => setDeviceBrands([]));
  }, []);

  // Charger les modèles quand la marque change
  useEffect(() => {
    if (newRepair.deviceBrandId > 0) {
      setLoadingModels(true);
      api
        .getDeviceModels(newRepair.deviceBrandId)
        .then(setDeviceModels)
        .catch(() => setDeviceModels([]))
        .finally(() => setLoadingModels(false));
    } else {
      setDeviceModels([]);
    }
  }, [newRepair.deviceBrandId]);

  // Rechercher un client par téléphone
  const matchedCustomer = useMemo(() => {
    if (phoneSearch.length < 3) return null;
    return customers.find((c) =>
      c.phone.replace(/\D/g, "").includes(phoneSearch.replace(/\D/g, "")),
    );
  }, [phoneSearch, customers]);

  useEffect(() => {
    fetchRepairs();
    fetchCustomers();
  }, [fetchRepairs, fetchCustomers]);

  // Charger les composants filtrés par marque
  const loadComponentsForBrand = (brand: string) => {
    api
      .getProducts({ category: "component" })
      .then((allComponents) => {
        // Filtrer les composants par marque (si la marque du produit correspond)
        // ou afficher les composants génériques (sans marque)
        const brandLower = brand.toLowerCase();
        const filtered = allComponents.filter((c: Product) => {
          if (!c.brand) return true; // Composants génériques toujours affichés
          const componentBrand = c.brand.toLowerCase();
          // Correspondance exacte ou partielle (contient)
          return (
            componentBrand === brandLower ||
            componentBrand.includes(brandLower) ||
            brandLower.includes(componentBrand)
          );
        });
        setComponents(filtered);
      })
      .catch(() => setComponents([]));
  };

  // Charger les composants quand on ouvre le modal ou quand la marque change
  useEffect(() => {
    if (showModal && newRepair.deviceBrand) {
      loadComponentsForBrand(newRepair.deviceBrand);
      // Réinitialiser les composants sélectionnés si la marque change
      setSelectedComponents([]);
    } else if (showModal && !newRepair.deviceBrand) {
      // Charger tous les composants si pas de marque sélectionnée
      api
        .getProducts({ category: "component" })
        .then(setComponents)
        .catch(() => setComponents([]));
    }
  }, [showModal, newRepair.deviceBrand]);

  // Charger les composants pour le modal d'édition
  useEffect(() => {
    if (showEditModal && editingRepairId) {
      const repair = repairs.find((r) => r.id === editingRepairId);
      if (repair?.deviceBrand) {
        loadComponentsForBrand(repair.deviceBrand);
      } else {
        api
          .getProducts({ category: "component" })
          .then(setComponents)
          .catch(() => setComponents([]));
      }
    }
  }, [showEditModal, editingRepairId, repairs]);

  // Réinitialiser le formulaire
  const resetForm = () => {
    setCurrentStep(1);
    setPhoneSearch("");
    setIsNewCustomer(false);
    setSelectedComponents([]);
    setSelectedInterventions([]);
    setActiveSection("interventions");
    setDeviceModels([]);
    setNewRepair({
      customerId: 0,
      deviceBrandId: 0,
      deviceBrand: "",
      deviceModelId: 0,
      deviceModel: "",
      devicePassword: "",
      physicalState: "",
      issueDescription: "",
      estimatedCost: 0,
      customerName: "",
      customerPhone: "",
    });
  };

  // Calculer le coût total des composants
  const componentsTotalCost = useMemo(() => {
    return selectedComponents.reduce(
      (sum, c) => sum + c.unitPrice * c.quantity,
      0,
    );
  }, [selectedComponents]);

  // Ajouter un composant
  const addComponent = (product: Product) => {
    const existing = selectedComponents.find((c) => c.productId === product.id);
    if (existing) {
      setSelectedComponents((prev) =>
        prev.map((c) =>
          c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c,
        ),
      );
    } else {
      setSelectedComponents((prev) => [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          quantity: 1,
          unitPrice: product.priceSale,
        },
      ]);
    }
  };

  // Retirer un composant
  const removeComponent = (productId: number) => {
    setSelectedComponents((prev) =>
      prev.filter((c) => c.productId !== productId),
    );
  };

  // Calculer le coût total des composants en édition
  const editComponentsTotalCost = useMemo(() => {
    return editComponents.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0);
  }, [editComponents]);

  // Ajouter un composant en édition
  const addEditComponent = (product: Product) => {
    const existing = editComponents.find((c) => c.productId === product.id);
    if (existing) {
      setEditComponents((prev) =>
        prev.map((c) =>
          c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c,
        ),
      );
    } else {
      setEditComponents((prev) => [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          quantity: 1,
          unitPrice: product.priceSale,
        },
      ]);
    }
  };

  // Retirer un composant en édition
  const removeEditComponent = (productId: number) => {
    setEditComponents((prev) => prev.filter((c) => c.productId !== productId));
  };

  // Ouvrir le modal d'édition
  const openEditModal = async (repairId: number) => {
    const repair = repairs.find((r) => r.id === repairId);
    if (!repair) return;

    // Parser les interventions depuis la description
    const existingInterventions: string[] = [];
    commonInterventions.forEach((intervention) => {
      if (repair.issueDescription?.includes(intervention.label)) {
        existingInterventions.push(intervention.id);
      }
    });

    // Extraire la description sans les interventions
    let description = repair.issueDescription || "";
    commonInterventions.forEach((intervention) => {
      description = description
        .replace(intervention.label, "")
        .replace(", ", "")
        .replace(". ", "");
    });
    description = description.trim();

    // Charger les composants existants
    let existingComponents: SelectedComponent[] = [];
    try {
      const repairComponents = await api.getRepairComponents(repairId);
      existingComponents = repairComponents.map((c) => ({
        productId: c.productId,
        name: c.productName,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
      }));
    } catch (error) {
      console.error("Error loading repair components:", error);
    }

    // Calculer le cout main d'oeuvre (cout total - cout composants)
    const componentsCost = existingComponents.reduce(
      (sum, c) => sum + c.unitPrice * c.quantity,
      0,
    );
    const laborCost = Math.max(0, (repair.estimatedCost || 0) - componentsCost);

    setEditingRepairId(repairId);
    setEditInterventions(existingInterventions);
    setEditComponents(existingComponents);
    setEditDescription(description);
    setEditLaborCost(laborCost);
    setEditActiveSection(null);
    setShowEditModal(true);
  };

  // Sauvegarder les modifications
  const handleUpdateRepair = async () => {
    if (!editingRepairId) return;

    // Construire la description avec les interventions sélectionnées
    const interventionLabels = editInterventions.map(
      (id) => commonInterventions.find((i) => i.id === id)?.label || id,
    );
    const fullDescription =
      interventionLabels.length > 0
        ? `${interventionLabels.join(", ")}${editDescription ? ". " + editDescription : ""}`
        : editDescription;

    // Calculer le coût total
    const totalCost = editComponentsTotalCost + editLaborCost;

    await updateRepair(editingRepairId, {
      issueDescription: fullDescription,
      estimatedCost: totalCost,
    });

    // Sauvegarder les composants
    await api.setRepairComponents(
      editingRepairId,
      editComponents.map((c) => ({
        productId: c.productId,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
      })),
    );

    setShowEditModal(false);
    setEditingRepairId(null);
  };

  const getNextStatus = (current: RepairStatus): RepairStatus | null => {
    const idx = statusOrder.indexOf(current);
    return idx < statusOrder.length - 1 ? statusOrder[idx + 1] : null;
  };

  const handleCreateRepair = async () => {
    let customerId = newRepair.customerId;

    // Si client existant trouvé par recherche
    if (matchedCustomer && !isNewCustomer) {
      customerId = matchedCustomer.id;
    }

    // Create customer if new
    if (isNewCustomer && newRepair.customerName && newRepair.customerPhone) {
      const customer = await createCustomer(
        newRepair.customerName,
        newRepair.customerPhone,
      );
      if (customer) {
        customerId = customer.id;
      } else {
        return;
      }
    }

    // Construire la description avec les interventions sélectionnées
    const interventionLabels = selectedInterventions.map(
      (id) => commonInterventions.find((i) => i.id === id)?.label || id,
    );
    const fullDescription =
      interventionLabels.length > 0
        ? `${interventionLabels.join(", ")}${newRepair.issueDescription ? ". " + newRepair.issueDescription : ""}`
        : newRepair.issueDescription;

    // Calculer le coût total (composants + estimation manuelle)
    const totalCost = componentsTotalCost + newRepair.estimatedCost;

    if (
      customerId &&
      newRepair.deviceBrand &&
      newRepair.deviceModel &&
      (selectedInterventions.length > 0 || newRepair.issueDescription)
    ) {
      const repair = await createRepair({
        customerId,
        deviceBrand: newRepair.deviceBrand,
        deviceModel: newRepair.deviceModel,
        devicePassword: newRepair.devicePassword || undefined,
        physicalState: newRepair.physicalState || undefined,
        issueDescription: fullDescription,
        estimatedCost: totalCost,
      });

      // Sauvegarder les composants affectes
      if (repair && selectedComponents.length > 0) {
        await api.setRepairComponents(
          repair.id,
          selectedComponents.map((c) => ({
            productId: c.productId,
            quantity: c.quantity,
            unitPrice: c.unitPrice,
          })),
        );
      }

      setShowModal(false);
      resetForm();
    }
  };

  // Get customer info for a repair
  const getCustomerInfo = (customerId: number) => {
    return customers.find((c) => c.id === customerId);
  };

  const handlePrintTicket = async (repairId: number) => {
    try {
      const ticketData = await api.getRepairTicket(repairId);
      printElement(React.createElement(RepairTicket, { data: ticketData }));
    } catch (error) {
      console.error("Error printing ticket:", error);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Suivi des Réparations
          </h2>
          <p className="text-slate-400">
            {repairs.filter((r) => r.status !== "delivered").length} réparations
            en cours
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-5 py-3 rounded-xl font-medium transition-colors"
        >
          <Plus size={20} />
          Nouveau Ticket
        </button>
      </header>

      {/* Kanban View */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statusOrder.map((status) => {
            const config = statusConfig[status];
            const Icon = config.icon;
            const statusRepairs = repairs.filter((r) => r.status === status);

            return (
              <div key={status} className="space-y-4">
                <div
                  className={`flex items-center gap-2 text-${config.color}-400`}
                >
                  <Icon size={18} />
                  <span className="font-semibold">{config.label}</span>
                  <span className="ml-auto bg-dark-surface px-2 py-0.5 rounded-full text-sm text-slate-400">
                    {statusRepairs.length}
                  </span>
                </div>

                <div className="space-y-3">
                  <AnimatePresence>
                    {statusRepairs.map((repair, index) => {
                      const customer = getCustomerInfo(repair.customerId);
                      return (
                        <motion.div
                          key={repair.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-dark-surface rounded-xl p-4 border border-dark-border hover:border-primary-500/50 transition-all group"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="text-white font-medium">
                                {customer?.name ||
                                  `Client #${repair.customerId}`}
                              </h4>
                              {customer && (
                                <a
                                  href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-slate-500 text-sm hover:text-emerald-400 flex items-center gap-1 transition-colors"
                                >
                                  <MessageCircle size={12} />
                                  {customer.phone}
                                </a>
                              )}
                            </div>
                            <span
                              className={`text-${config.color}-400 text-sm font-medium`}
                            >
                              {formatPrice(repair.estimatedCost)}
                            </span>
                          </div>

                          <div className="bg-dark-bg rounded-lg p-3 mb-3">
                            <p className="text-slate-300 text-sm font-medium">
                              {repair.deviceBrand} {repair.deviceModel}
                            </p>
                            <p className="text-slate-500 text-sm">
                              {repair.issueDescription}
                            </p>
                          </div>

                          {repair.createdAt && (
                            <p className="text-slate-600 text-xs mb-3">
                              Créé le{" "}
                              {new Date(
                                repair.createdAt * 1000,
                              ).toLocaleDateString("fr-FR")}
                            </p>
                          )}

                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => handlePrintTicket(repair.id)}
                              className="flex items-center justify-center gap-1 py-2 px-2 text-sm text-slate-400 hover:text-primary-400 border border-dark-border rounded-lg hover:border-primary-500/50 transition-all"
                              title="Imprimer le ticket"
                            >
                              <Printer size={14} />
                            </button>
                            <button
                              onClick={() => openEditModal(repair.id)}
                              className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-slate-400 hover:text-amber-400 border border-dark-border rounded-lg hover:border-amber-500/50 transition-all"
                            >
                              <Pencil size={14} />
                              Modifier
                            </button>
                            {getNextStatus(repair.status) && (
                              <button
                                onClick={() =>
                                  updateRepairStatus(
                                    repair.id,
                                    getNextStatus(repair.status)!,
                                  )
                                }
                                className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-slate-400 hover:text-primary-400 border border-dark-border rounded-lg hover:border-primary-500/50 transition-all"
                              >
                                Passer à{" "}
                                {
                                  statusConfig[getNextStatus(repair.status)!]
                                    .label
                                }
                                <ArrowRight size={14} />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {statusRepairs.length === 0 && (
                    <div className="bg-dark-surface/50 rounded-xl p-6 border border-dashed border-dark-border text-center">
                      <p className="text-slate-600 text-sm">
                        Aucune réparation
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Repair Modal - Multi-step Wizard */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowModal(false);
              resetForm();
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-surface rounded-2xl w-full max-w-2xl max-h-[90vh] border border-dark-border overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-dark-border">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Nouveau Ticket
                  </h3>
                  <p className="text-sm text-slate-400">
                    Étape {currentStep} sur 3
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-slate-400 hover:text-white p-2"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="px-6 pt-4">
                <div className="flex gap-2">
                  {[1, 2, 3].map((step) => (
                    <div
                      key={step}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        step <= currentStep
                          ? "bg-primary-500"
                          : "bg-dark-border"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span className={currentStep >= 1 ? "text-primary-400" : ""}>
                    Client
                  </span>
                  <span className={currentStep >= 2 ? "text-primary-400" : ""}>
                    Appareil
                  </span>
                  <span className={currentStep >= 3 ? "text-primary-400" : ""}>
                    Intervention
                  </span>
                </div>
              </div>

              {/* Step Content */}
              <div className="p-6 flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {/* ÉTAPE 1: Client */}
                  {currentStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-primary-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Search className="text-primary-400" size={28} />
                        </div>
                        <h4 className="text-lg font-semibold text-white">
                          Identifier le client
                        </h4>
                        <p className="text-slate-400 text-sm">
                          Entrez le numéro de téléphone pour rechercher
                        </p>
                      </div>

                      {/* Phone Search */}
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                          Numéro de téléphone
                        </label>
                        <div className="relative">
                          <Phone
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                            size={18}
                          />
                          <input
                            type="tel"
                            value={phoneSearch}
                            onChange={(e) => {
                              setPhoneSearch(e.target.value);
                              setIsNewCustomer(false);
                            }}
                            className="w-full bg-dark-bg border border-dark-border rounded-xl py-4 pl-12 pr-4 text-white text-lg focus:outline-none focus:border-primary-500"
                            placeholder="Ex: 12 345 678"
                            autoFocus
                          />
                        </div>
                      </div>

                      {/* Client trouvé */}
                      {matchedCustomer && !isNewCustomer && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                              <User className="text-emerald-400" size={24} />
                            </div>
                            <div className="flex-1">
                              <p className="text-white font-medium">
                                {matchedCustomer.name}
                              </p>
                              <p className="text-emerald-400 text-sm">
                                {matchedCustomer.phone}
                              </p>
                              <p className="text-slate-500 text-xs">
                                Client existant
                              </p>
                            </div>
                            <CheckCircle
                              className="text-emerald-400"
                              size={24}
                            />
                          </div>
                        </motion.div>
                      )}

                      {/* Nouveau client */}
                      {phoneSearch.length >= 3 &&
                        !matchedCustomer &&
                        !isNewCustomer && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
                                <UserPlus
                                  className="text-amber-400"
                                  size={24}
                                />
                              </div>
                              <div className="flex-1">
                                <p className="text-white font-medium">
                                  Nouveau client
                                </p>
                                <p className="text-slate-400 text-sm">
                                  Ce numéro n'est pas enregistré
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  setIsNewCustomer(true);
                                  setNewRepair({
                                    ...newRepair,
                                    customerPhone: phoneSearch,
                                  });
                                }}
                                className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors"
                              >
                                Créer
                              </button>
                            </div>
                          </motion.div>
                        )}

                      {/* Formulaire nouveau client */}
                      {isNewCustomer && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4 p-4 bg-dark-bg rounded-xl border border-dark-border"
                        >
                          <div className="flex items-center gap-2 text-amber-400 mb-2">
                            <UserPlus size={18} />
                            <span className="font-medium">Nouveau client</span>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                              Nom complet
                            </label>
                            <input
                              type="text"
                              value={newRepair.customerName}
                              onChange={(e) =>
                                setNewRepair({
                                  ...newRepair,
                                  customerName: e.target.value,
                                })
                              }
                              className="w-full bg-dark-surface border border-dark-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary-500"
                              placeholder="Nom et prénom"
                              autoFocus
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                              Téléphone
                            </label>
                            <input
                              type="tel"
                              value={newRepair.customerPhone}
                              onChange={(e) =>
                                setNewRepair({
                                  ...newRepair,
                                  customerPhone: e.target.value,
                                })
                              }
                              className="w-full bg-dark-surface border border-dark-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary-500"
                              placeholder="Numéro de téléphone"
                            />
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  {/* ÉTAPE 2: Appareil */}
                  {currentStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Smartphone className="text-blue-400" size={28} />
                        </div>
                        <h4 className="text-lg font-semibold text-white">
                          Informations de l'appareil
                        </h4>
                        <p className="text-slate-400 text-sm">
                          Sélectionnez la marque et le modèle
                        </p>
                      </div>

                      {/* Marque */}
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                          Marque *
                        </label>
                        <select
                          value={newRepair.deviceBrandId}
                          onChange={(e) => {
                            const brandId = Number(e.target.value);
                            const brand = deviceBrands.find(
                              (b) => b.id === brandId,
                            );
                            setNewRepair({
                              ...newRepair,
                              deviceBrandId: brandId,
                              deviceBrand: brand?.name || "",
                              deviceModelId: 0,
                              deviceModel: "",
                            });
                          }}
                          className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary-500 appearance-none cursor-pointer"
                        >
                          <option value={0} className="bg-dark-bg">
                            Selectionnez une marque...
                          </option>
                          {deviceBrands.map((brand) => (
                            <option
                              key={brand.id}
                              value={brand.id}
                              className="bg-dark-bg"
                            >
                              {brand.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Modèle */}
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                          Modele *
                        </label>
                        {loadingModels ? (
                          <div className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-4 text-slate-500">
                            Chargement des modeles...
                          </div>
                        ) : newRepair.deviceBrandId === 0 ? (
                          <div className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-4 text-slate-500">
                            Selectionnez d'abord une marque
                          </div>
                        ) : (
                          <select
                            value={newRepair.deviceModelId}
                            onChange={(e) => {
                              const modelId = Number(e.target.value);
                              const model = deviceModels.find(
                                (m) => m.id === modelId,
                              );
                              setNewRepair({
                                ...newRepair,
                                deviceModelId: modelId,
                                deviceModel: model?.name || "",
                              });
                            }}
                            className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary-500 appearance-none cursor-pointer"
                          >
                            <option value={0} className="bg-dark-bg">
                              Selectionnez un modele...
                            </option>
                            {deviceModels.map((model) => (
                              <option
                                key={model.id}
                                value={model.id}
                                className="bg-dark-bg"
                              >
                                {model.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Code de déverrouillage */}
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                          Code de déverrouillage (optionnel)
                        </label>
                        <input
                          type="text"
                          value={newRepair.devicePassword}
                          onChange={(e) =>
                            setNewRepair({
                              ...newRepair,
                              devicePassword: e.target.value,
                            })
                          }
                          className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary-500"
                          placeholder="Code PIN, schéma..."
                        />
                      </div>

                      {/* État physique */}
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                          État physique
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                          {physicalStates.map((state) => (
                            <button
                              key={state.value}
                              onClick={() =>
                                setNewRepair({
                                  ...newRepair,
                                  physicalState: state.value,
                                })
                              }
                              className={`p-3 rounded-xl text-center transition-all border ${
                                newRepair.physicalState === state.value
                                  ? `bg-${state.color}-500/20 border-${state.color}-500 text-${state.color}-400`
                                  : "bg-dark-bg border-dark-border text-slate-400 hover:border-slate-500"
                              }`}
                            >
                              <span className="text-xs font-medium">
                                {state.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ÉTAPE 3: Intervention */}
                  {currentStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-emerald-600/20 rounded-full flex items-center justify-center">
                          <Wrench className="text-emerald-400" size={20} />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-white">
                            Intervention requise
                          </h4>
                          <p className="text-slate-400 text-sm">
                            Sélectionnez les interventions et composants
                          </p>
                        </div>
                      </div>

                      {/* Accordéon Interventions / Composants */}
                      <div className="space-y-3">
                        {/* Section Interventions */}
                        <div className="border border-dark-border rounded-xl overflow-hidden">
                          <button
                            onClick={() =>
                              setActiveSection(
                                activeSection === "interventions"
                                  ? null
                                  : "interventions",
                              )
                            }
                            className={`w-full flex items-center justify-between p-4 transition-all ${
                              activeSection === "interventions"
                                ? "bg-primary-600/10 border-b border-dark-border"
                                : "bg-dark-bg hover:bg-dark-surface"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Wrench
                                size={20}
                                className={
                                  activeSection === "interventions"
                                    ? "text-primary-400"
                                    : "text-slate-500"
                                }
                              />
                              <span
                                className={`font-medium ${activeSection === "interventions" ? "text-primary-400" : "text-white"}`}
                              >
                                Type d'intervention
                              </span>
                              {selectedInterventions.length > 0 && (
                                <span className="px-2 py-0.5 bg-primary-600 text-white text-xs rounded-full">
                                  {selectedInterventions.length}
                                </span>
                              )}
                            </div>
                            <ChevronRight
                              size={18}
                              className={`text-slate-500 transition-transform ${activeSection === "interventions" ? "rotate-90" : ""}`}
                            />
                          </button>

                          <AnimatePresence>
                            {activeSection === "interventions" && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 grid grid-cols-2 gap-2">
                                  {commonInterventions.map((intervention) => (
                                    <button
                                      key={intervention.id}
                                      onClick={() => {
                                        setSelectedInterventions((prev) =>
                                          prev.includes(intervention.id)
                                            ? prev.filter(
                                                (i) => i !== intervention.id,
                                              )
                                            : [...prev, intervention.id],
                                        );
                                      }}
                                      className={`p-3 rounded-xl text-left transition-all border flex items-center gap-2 ${
                                        selectedInterventions.includes(
                                          intervention.id,
                                        )
                                          ? "bg-primary-600/20 border-primary-500 text-primary-400"
                                          : "bg-dark-bg border-dark-border text-slate-400 hover:border-slate-500"
                                      }`}
                                    >
                                      <Wrench size={16} />
                                      <span className="text-sm font-medium">
                                        {intervention.label}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Section Composants */}
                        <div className="border border-dark-border rounded-xl overflow-hidden">
                          <button
                            onClick={() =>
                              setActiveSection(
                                activeSection === "components"
                                  ? null
                                  : "components",
                              )
                            }
                            className={`w-full flex items-center justify-between p-4 transition-all ${
                              activeSection === "components"
                                ? "bg-emerald-600/10 border-b border-dark-border"
                                : "bg-dark-bg hover:bg-dark-surface"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Package
                                size={20}
                                className={
                                  activeSection === "components"
                                    ? "text-emerald-400"
                                    : "text-slate-500"
                                }
                              />
                              <span
                                className={`font-medium ${activeSection === "components" ? "text-emerald-400" : "text-white"}`}
                              >
                                Affectation de composants
                              </span>
                              {selectedComponents.length > 0 && (
                                <span className="px-2 py-0.5 bg-emerald-600 text-white text-xs rounded-full">
                                  {selectedComponents.length}
                                </span>
                              )}
                            </div>
                            <ChevronRight
                              size={18}
                              className={`text-slate-500 transition-transform ${activeSection === "components" ? "rotate-90" : ""}`}
                            />
                          </button>

                          <AnimatePresence>
                            {activeSection === "components" && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 space-y-3">
                                  {/* Info sur le filtrage par marque */}
                                  {newRepair.deviceBrand && (
                                    <div className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                      <Smartphone
                                        size={14}
                                        className="text-blue-400"
                                      />
                                      <span className="text-blue-400 text-xs">
                                        Composants filtrés pour{" "}
                                        {newRepair.deviceBrand}
                                      </span>
                                    </div>
                                  )}
                                  {/* Liste des composants disponibles */}
                                  {components.length > 0 ? (
                                    <div className="max-h-40 overflow-y-auto space-y-2">
                                      {components.map((component) => (
                                        <div
                                          key={component.id}
                                          className="flex items-center justify-between p-2 bg-dark-bg hover:bg-dark-surface rounded-lg cursor-pointer border border-dark-border"
                                          onClick={() =>
                                            addComponent(component)
                                          }
                                        >
                                          <div className="flex items-center gap-2">
                                            <Package
                                              size={16}
                                              className="text-slate-500"
                                            />
                                            <span className="text-white text-sm">
                                              {component.name}
                                            </span>
                                            {component.brand && (
                                              <span className="text-blue-400 text-xs">
                                                ({component.brand})
                                              </span>
                                            )}
                                            <span className="text-slate-500 text-xs">
                                              {component.stock} en stock
                                            </span>
                                          </div>
                                          <span className="text-emerald-400 text-sm">
                                            {formatPrice(component.priceSale)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-slate-500 text-sm text-center py-4">
                                      {newRepair.deviceBrand
                                        ? `Aucun composant disponible pour ${newRepair.deviceBrand}`
                                        : "Aucun composant disponible"}
                                    </p>
                                  )}

                                  {/* Composants sélectionnés */}
                                  {selectedComponents.length > 0 && (
                                    <div className="pt-3 border-t border-dark-border space-y-2">
                                      <p className="text-sm font-medium text-slate-400">
                                        Sélectionnés :
                                      </p>
                                      {selectedComponents.map((comp) => (
                                        <div
                                          key={comp.productId}
                                          className="flex items-center justify-between p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30"
                                        >
                                          <div>
                                            <span className="text-white text-sm">
                                              {comp.name}
                                            </span>
                                            <span className="text-slate-500 text-xs ml-2">
                                              x{comp.quantity}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-emerald-400 text-sm">
                                              {formatPrice(
                                                comp.unitPrice * comp.quantity,
                                              )}
                                            </span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                removeComponent(comp.productId);
                                              }}
                                              className="text-red-400 hover:text-red-300 p-1"
                                            >
                                              <X size={14} />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                      <div className="flex justify-between p-2 bg-emerald-600/20 rounded-lg">
                                        <span className="text-emerald-400 font-medium text-sm">
                                          Total
                                        </span>
                                        <span className="text-emerald-400 font-bold text-sm">
                                          {formatPrice(componentsTotalCost)}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Description additionnelle */}
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                          Notes additionnelles (optionnel)
                        </label>
                        <textarea
                          value={newRepair.issueDescription}
                          onChange={(e) =>
                            setNewRepair({
                              ...newRepair,
                              issueDescription: e.target.value,
                            })
                          }
                          className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary-500 resize-none h-20"
                          placeholder="Détails supplémentaires sur le problème..."
                        />
                      </div>

                      {/* Coût main d'œuvre */}
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                          Coût main d'œuvre
                        </label>
                        <input
                          type="number"
                          value={newRepair.estimatedCost}
                          onChange={(e) =>
                            setNewRepair({
                              ...newRepair,
                              estimatedCost: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary-500"
                          placeholder="0"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer avec navigation */}
              <div className="p-6 border-t border-dark-border flex justify-between items-center flex-shrink-0">
                <button
                  onClick={() =>
                    currentStep > 1
                      ? setCurrentStep(currentStep - 1)
                      : (setShowModal(false), resetForm())
                  }
                  className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronLeft size={18} />
                  {currentStep > 1 ? "Précédent" : "Annuler"}
                </button>

                <div className="flex items-center gap-4">
                  {currentStep === 3 && (
                    <div className="text-right">
                      <p className="text-slate-400 text-sm">Total estimé</p>
                      <p className="text-xl font-bold text-primary-400">
                        {formatPrice(
                          componentsTotalCost + newRepair.estimatedCost,
                        )}
                      </p>
                    </div>
                  )}

                  {currentStep < 3 ? (
                    <button
                      onClick={() => setCurrentStep(currentStep + 1)}
                      disabled={
                        (currentStep === 1 &&
                          !matchedCustomer &&
                          !(
                            isNewCustomer &&
                            newRepair.customerName &&
                            newRepair.customerPhone
                          )) ||
                        (currentStep === 2 &&
                          (newRepair.deviceBrandId === 0 ||
                            newRepair.deviceModelId === 0))
                      }
                      className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
                    >
                      Suivant
                      <ChevronRight size={18} />
                    </button>
                  ) : (
                    <button
                      onClick={handleCreateRepair}
                      disabled={
                        isLoading ||
                        (selectedInterventions.length === 0 &&
                          !newRepair.issueDescription)
                      }
                      className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
                    >
                      {isLoading ? "Création..." : "Créer le ticket"}
                      <CheckCircle size={18} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Repair Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-surface rounded-2xl w-full max-w-2xl max-h-[90vh] border border-dark-border overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-dark-border flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-600/20 rounded-full flex items-center justify-center">
                    <Pencil className="text-amber-400" size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Modifier l'intervention
                    </h3>
                    <p className="text-sm text-slate-400">
                      Ticket #{editingRepairId}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-slate-400 hover:text-white p-2"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 flex-1 overflow-y-auto space-y-6">
                {/* Accordéon Interventions / Composants */}
                <div className="space-y-3">
                  {/* Section Interventions */}
                  <div className="border border-dark-border rounded-xl overflow-hidden">
                    <button
                      onClick={() =>
                        setEditActiveSection(
                          editActiveSection === "interventions"
                            ? null
                            : "interventions",
                        )
                      }
                      className={`w-full flex items-center justify-between p-4 transition-all ${
                        editActiveSection === "interventions"
                          ? "bg-primary-600/10 border-b border-dark-border"
                          : "bg-dark-bg hover:bg-dark-surface"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Wrench
                          size={20}
                          className={
                            editActiveSection === "interventions"
                              ? "text-primary-400"
                              : "text-slate-500"
                          }
                        />
                        <span
                          className={`font-medium ${editActiveSection === "interventions" ? "text-primary-400" : "text-white"}`}
                        >
                          Type d'intervention
                        </span>
                        {editInterventions.length > 0 && (
                          <span className="px-2 py-0.5 bg-primary-600 text-white text-xs rounded-full">
                            {editInterventions.length}
                          </span>
                        )}
                      </div>
                      <ChevronRight
                        size={18}
                        className={`text-slate-500 transition-transform ${editActiveSection === "interventions" ? "rotate-90" : ""}`}
                      />
                    </button>

                    <AnimatePresence>
                      {editActiveSection === "interventions" && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 grid grid-cols-2 gap-2">
                            {commonInterventions.map((intervention) => (
                              <button
                                key={intervention.id}
                                onClick={() => {
                                  setEditInterventions((prev) =>
                                    prev.includes(intervention.id)
                                      ? prev.filter(
                                          (i) => i !== intervention.id,
                                        )
                                      : [...prev, intervention.id],
                                  );
                                }}
                                className={`p-3 rounded-xl text-left transition-all border flex items-center gap-2 ${
                                  editInterventions.includes(intervention.id)
                                    ? "bg-primary-600/20 border-primary-500 text-primary-400"
                                    : "bg-dark-bg border-dark-border text-slate-400 hover:border-slate-500"
                                }`}
                              >
                                <Wrench size={16} />
                                <span className="text-sm font-medium">
                                  {intervention.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Section Composants */}
                  <div className="border border-dark-border rounded-xl overflow-hidden">
                    <button
                      onClick={() =>
                        setEditActiveSection(
                          editActiveSection === "components"
                            ? null
                            : "components",
                        )
                      }
                      className={`w-full flex items-center justify-between p-4 transition-all ${
                        editActiveSection === "components"
                          ? "bg-emerald-600/10 border-b border-dark-border"
                          : "bg-dark-bg hover:bg-dark-surface"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Package
                          size={20}
                          className={
                            editActiveSection === "components"
                              ? "text-emerald-400"
                              : "text-slate-500"
                          }
                        />
                        <span
                          className={`font-medium ${editActiveSection === "components" ? "text-emerald-400" : "text-white"}`}
                        >
                          Affectation de composants
                        </span>
                        {editComponents.length > 0 && (
                          <span className="px-2 py-0.5 bg-emerald-600 text-white text-xs rounded-full">
                            {editComponents.length}
                          </span>
                        )}
                      </div>
                      <ChevronRight
                        size={18}
                        className={`text-slate-500 transition-transform ${editActiveSection === "components" ? "rotate-90" : ""}`}
                      />
                    </button>

                    <AnimatePresence>
                      {editActiveSection === "components" && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 space-y-3">
                            {/* Info sur le filtrage par marque */}
                            {editingRepairId &&
                              (() => {
                                const repair = repairs.find(
                                  (r) => r.id === editingRepairId,
                                );
                                return repair?.deviceBrand ? (
                                  <div className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                    <Smartphone
                                      size={14}
                                      className="text-blue-400"
                                    />
                                    <span className="text-blue-400 text-xs">
                                      Composants filtrés pour{" "}
                                      {repair.deviceBrand}
                                    </span>
                                  </div>
                                ) : null;
                              })()}
                            {/* Liste des composants disponibles */}
                            {components.length > 0 ? (
                              <div className="max-h-40 overflow-y-auto space-y-2">
                                {components.map((component) => (
                                  <div
                                    key={component.id}
                                    className="flex items-center justify-between p-2 bg-dark-bg hover:bg-dark-surface rounded-lg cursor-pointer border border-dark-border"
                                    onClick={() => addEditComponent(component)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Package
                                        size={16}
                                        className="text-slate-500"
                                      />
                                      <span className="text-white text-sm">
                                        {component.name}
                                      </span>
                                      {component.brand && (
                                        <span className="text-blue-400 text-xs">
                                          ({component.brand})
                                        </span>
                                      )}
                                      <span className="text-slate-500 text-xs">
                                        {component.stock} en stock
                                      </span>
                                    </div>
                                    <span className="text-emerald-400 text-sm">
                                      {formatPrice(component.priceSale)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-slate-500 text-sm text-center py-4">
                                {(() => {
                                  const repair = repairs.find(
                                    (r) => r.id === editingRepairId,
                                  );
                                  return repair?.deviceBrand
                                    ? `Aucun composant disponible pour ${repair.deviceBrand}`
                                    : "Aucun composant disponible";
                                })()}
                              </p>
                            )}

                            {/* Composants sélectionnés */}
                            {editComponents.length > 0 && (
                              <div className="pt-3 border-t border-dark-border space-y-2">
                                <p className="text-sm font-medium text-slate-400">
                                  Sélectionnés :
                                </p>
                                {editComponents.map((comp) => (
                                  <div
                                    key={comp.productId}
                                    className="flex items-center justify-between p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30"
                                  >
                                    <div>
                                      <span className="text-white text-sm">
                                        {comp.name}
                                      </span>
                                      <span className="text-slate-500 text-xs ml-2">
                                        x{comp.quantity}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-emerald-400 text-sm">
                                        {formatPrice(
                                          comp.unitPrice * comp.quantity,
                                        )}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeEditComponent(comp.productId);
                                        }}
                                        className="text-red-400 hover:text-red-300 p-1"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                <div className="flex justify-between p-2 bg-emerald-600/20 rounded-lg">
                                  <span className="text-emerald-400 font-medium text-sm">
                                    Total
                                  </span>
                                  <span className="text-emerald-400 font-bold text-sm">
                                    {formatPrice(editComponentsTotalCost)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Description additionnelle */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Notes additionnelles (optionnel)
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary-500 resize-none h-20"
                    placeholder="Détails supplémentaires sur le problème..."
                  />
                </div>

                {/* Coût main d'œuvre */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Coût main d'œuvre
                  </label>
                  <input
                    type="number"
                    value={editLaborCost}
                    onChange={(e) =>
                      setEditLaborCost(parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-dark-border flex justify-between items-center flex-shrink-0">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                  Annuler
                </button>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-slate-400 text-sm">Total estimé</p>
                    <p className="text-xl font-bold text-primary-400">
                      {formatPrice(editComponentsTotalCost + editLaborCost)}
                    </p>
                  </div>

                  <button
                    onClick={handleUpdateRepair}
                    disabled={
                      isLoading ||
                      (editInterventions.length === 0 && !editDescription)
                    }
                    className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
                  >
                    {isLoading ? "Mise à jour..." : "Enregistrer"}
                    <CheckCircle size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
