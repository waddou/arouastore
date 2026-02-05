# Feature Specification: 5 Fonctionnalités Suggérées pour PhoneStore POS

**Feature Branch**: `001-suggest-features`
**Created**: 2026-02-05
**Status**: Draft
**Input**: User description: "Analyse ce qui a été fait et suggère 5 fonctionnalités"

---

## Analyse de l'existant

Le système PhoneStore POS est un système complet de point de vente et de gestion de réparations pour un magasin de téléphonie mobile. Les fonctionnalités actuellement en place comprennent :

- **Point de vente (POS)** : Panier, paiement (espèces, carte, mobile), remises, historique des ventes
- **Gestion de l'inventaire** : Catalogue produits (téléphones, accessoires, composants), suivi des stocks, alertes de stock bas
- **Gestion des réparations** : Tickets, workflow multi-statuts, suivi des pièces, affectation technicien
- **Gestion clients** : Base de données, historique d'achats et de réparations
- **Caisse** : Ouverture/fermeture de sessions, réconciliation
- **Administration** : Rôles (admin, manager, agent), configuration boutique, devises
- **Tableau de bord** : Statistiques de ventes, réparations, inventaire

### 5 fonctionnalités suggérées

Les fonctionnalités suivantes ont été identifiées comme les plus impactantes pour compléter le système existant :

1. **Impression de reçus et tickets de réparation** (P1)
2. **Système de notifications et alertes en temps réel** (P2)
3. **Gestion des fournisseurs et commandes d'approvisionnement** (P3)
4. **Programme de fidélité client** (P4)
5. **Rapports et exports avancés** (P5)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Impression de reçus et tickets de réparation (Priority: P1)

En tant que vendeur ou technicien, je souhaite pouvoir imprimer un reçu après chaque vente et un ticket de suivi pour chaque réparation, afin de fournir au client une preuve de transaction et un document de suivi.

Après une vente au POS, le vendeur clique sur "Imprimer le reçu" et un document est généré avec les détails de la transaction (articles, prix, remise, total, méthode de paiement, date). Pour les réparations, un ticket est généré avec les informations de l'appareil, le problème décrit, le coût estimé et la date promise.

**Why this priority**: C'est un besoin fondamental pour tout commerce de détail. Sans reçu, le magasin ne peut pas fournir de preuve d'achat aux clients, ce qui est souvent une obligation légale et un minimum attendu par les clients. De plus, les tickets de réparation sont essentiels pour le suivi et évitent les litiges.

**Independent Test**: Peut être testé en effectuant une vente dans le POS puis en vérifiant que le reçu contient toutes les informations requises. Le ticket de réparation peut être testé en créant une réparation et en générant le document associé.

**Acceptance Scenarios**:

1. **Given** une vente vient d'être complétée au POS, **When** le vendeur clique sur "Imprimer le reçu", **Then** un document de reçu est généré contenant : nom du magasin, date/heure, liste des articles avec prix unitaire et quantité, sous-total, remise éventuelle, total, méthode de paiement et numéro de transaction.
2. **Given** une réparation vient d'être créée, **When** le technicien clique sur "Imprimer le ticket", **Then** un ticket est généré contenant : numéro de réparation, informations client, marque/modèle de l'appareil, description du problème, coût estimé, date promise et conditions générales.
3. **Given** le vendeur souhaite consulter un ancien reçu, **When** il accède à l'historique des ventes et sélectionne une transaction, **Then** il peut régénérer et imprimer le reçu correspondant.

---

### User Story 2 - Système de notifications et alertes en temps réel (Priority: P2)

En tant que gérant ou vendeur, je souhaite recevoir des notifications en temps réel pour les événements importants du magasin, afin de pouvoir réagir rapidement sans devoir surveiller constamment chaque section de l'application.

Le système affiche des notifications pour : stock bas atteint, nouvelle réparation créée, réparation prête à livrer, session de caisse non fermée, et objectif de vente quotidien atteint. Les notifications apparaissent dans un panneau dédié accessible depuis la barre de navigation.

**Why this priority**: Les alertes de stock bas existent déjà dans le tableau de bord mais ne sont pas proactives. Un système de notifications en temps réel améliore significativement la réactivité de l'équipe et évite les ruptures de stock ou les oublis de réparations terminées.

**Independent Test**: Peut être testé en déclenchant un événement (par exemple réduire le stock d'un produit en dessous du seuil d'alerte) et en vérifiant qu'une notification apparaît dans le panneau de notifications.

**Acceptance Scenarios**:

1. **Given** un produit dont le stock descend en dessous du seuil d'alerte, **When** une vente réduit le stock en dessous du seuil, **Then** une notification "Stock bas" s'affiche dans le panneau de notifications avec le nom du produit et la quantité restante.
2. **Given** une réparation dont le statut passe à "repair" (terminée), **When** le technicien met à jour le statut, **Then** une notification "Réparation prête" est envoyée au personnel d'accueil avec le numéro de réparation et le nom du client.
3. **Given** une session de caisse ouverte depuis plus de 12 heures, **When** le système vérifie les sessions actives, **Then** une alerte "Session de caisse non fermée" est affichée aux managers et administrateurs.

---

### User Story 3 - Gestion des fournisseurs et commandes d'approvisionnement (Priority: P3)

En tant qu'administrateur ou gérant, je souhaite pouvoir gérer mes fournisseurs et créer des commandes d'approvisionnement, afin de maintenir un stock optimal et de suivre les coûts d'achat de manière structurée.

L'administrateur peut ajouter des fournisseurs avec leurs coordonnées, créer des bons de commande en sélectionnant des produits et quantités, et marquer les commandes comme reçues pour mettre à jour automatiquement le stock.

**Why this priority**: Le système gère déjà le stock et les prix d'achat, mais il n'y a aucun moyen de gérer l'approvisionnement. Sans cette fonctionnalité, le réapprovisionnement se fait de manière informelle, ce qui entraîne des erreurs de stock et une mauvaise traçabilité des coûts.

**Independent Test**: Peut être testé en créant un fournisseur, en passant une commande d'approvisionnement, puis en marquant la commande comme reçue et en vérifiant que le stock des produits concernés a été mis à jour.

**Acceptance Scenarios**:

1. **Given** l'administrateur souhaite ajouter un nouveau fournisseur, **When** il remplit le formulaire fournisseur (nom, téléphone, email, adresse, notes), **Then** le fournisseur est enregistré et apparaît dans la liste des fournisseurs.
2. **Given** un fournisseur existe dans le système, **When** l'administrateur crée un bon de commande en sélectionnant des produits et quantités, **Then** un bon de commande est créé avec un numéro unique, le total calculé à partir des prix d'achat, et le statut "en attente".
3. **Given** une commande en attente, **When** l'administrateur marque la commande comme reçue, **Then** le stock de chaque produit de la commande est automatiquement incrémenté des quantités commandées, et le statut passe à "reçue".
4. **Given** une commande partiellement reçue, **When** l'administrateur saisit les quantités réellement reçues, **Then** le stock est mis à jour uniquement avec les quantités reçues et la commande est marquée comme "partiellement reçue".

---

### User Story 4 - Programme de fidélité client (Priority: P4)

En tant que gérant, je souhaite proposer un programme de fidélité à mes clients, afin de les encourager à revenir et d'augmenter le chiffre d'affaires récurrent.

Les clients accumulent des points à chaque achat (1 point par unité monétaire dépensée). Les points peuvent être échangés contre des remises sur les achats futurs. Le vendeur peut voir le solde de points du client au moment du paiement et appliquer une remise fidélité.

**Why this priority**: Le système de gestion client existe déjà avec le suivi des dépenses totales. Un programme de fidélité exploite ces données existantes et ajoute une dimension de rétention client qui génère un avantage concurrentiel direct.

**Independent Test**: Peut être testé en effectuant un achat pour un client, en vérifiant que des points sont crédités, puis en utilisant ces points lors d'un achat ultérieur pour obtenir une remise.

**Acceptance Scenarios**:

1. **Given** un client effectue un achat de 100 unités monétaires, **When** la vente est finalisée, **Then** le client reçoit 100 points de fidélité et son solde de points est mis à jour.
2. **Given** un client avec 500 points de fidélité, **When** le vendeur applique une remise fidélité au POS, **Then** le système propose la remise équivalente et déduit les points utilisés du solde du client.
3. **Given** un client sélectionné au POS, **When** le vendeur consulte les informations client, **Then** le solde de points de fidélité est affiché clairement.
4. **Given** une vente annulée, **When** la vente est remboursée, **Then** les points attribués pour cette vente sont retirés du solde du client.

---

### User Story 5 - Rapports et exports avancés (Priority: P5)

En tant qu'administrateur ou gérant, je souhaite pouvoir générer des rapports détaillés et les exporter, afin d'analyser la performance du magasin et de faciliter la comptabilité.

Le gérant peut générer des rapports de ventes par période, des rapports de réparations, des états de stock, et des bilans de caisse. Ces rapports peuvent être exportés en format téléchargeable pour être transmis au comptable ou archivés.

**Why this priority**: Le tableau de bord actuel affiche des statistiques basiques. Des rapports détaillés et exportables sont nécessaires pour la gestion financière, la comptabilité et la prise de décisions stratégiques.

**Independent Test**: Peut être testé en générant un rapport de ventes pour une période donnée et en vérifiant que le fichier exporté contient toutes les transactions avec les montants corrects.

**Acceptance Scenarios**:

1. **Given** l'administrateur souhaite un rapport de ventes, **When** il sélectionne une période (jour, semaine, mois, personnalisée) et clique sur "Générer", **Then** un rapport est affiché avec : nombre de ventes, chiffre d'affaires total, répartition par méthode de paiement, top 10 des produits vendus, et marge bénéficiaire.
2. **Given** un rapport généré à l'écran, **When** l'administrateur clique sur "Exporter", **Then** le rapport est téléchargé dans un format exploitable (tableur ou document structuré).
3. **Given** l'administrateur souhaite un état des stocks, **When** il génère le rapport d'inventaire, **Then** le rapport liste tous les produits avec : stock actuel, prix d'achat, prix de vente, valeur totale du stock, et produits en dessous du seuil d'alerte.
4. **Given** l'administrateur souhaite un bilan de caisse, **When** il sélectionne une période, **Then** le rapport affiche : montants d'ouverture et de fermeture de chaque session, écarts constatés, et total des transactions par méthode de paiement.

---

### Edge Cases

- Que se passe-t-il si l'imprimante n'est pas disponible lors de l'impression d'un reçu ? Le système doit proposer un aperçu à l'écran et la possibilité de sauvegarder le document.
- Que se passe-t-il si un client utilise ses points de fidélité et que la vente est ensuite annulée ? Les points doivent être recrédités.
- Que se passe-t-il si une commande fournisseur contient un produit qui a été supprimé du catalogue ? Le système doit signaler le conflit et permettre de gérer les articles individuellement.
- Que se passe-t-il si les notifications s'accumulent sans être lues ? Le système doit afficher un compteur et permettre de marquer toutes les notifications comme lues.
- Que se passe-t-il lors de la génération d'un rapport pour une période sans aucune vente ? Le rapport doit s'afficher correctement avec des valeurs à zéro plutôt qu'une erreur.
- Que se passe-t-il si le stock est mis à jour manuellement pendant la réception d'une commande fournisseur ? Le système doit utiliser des opérations atomiques pour éviter les incohérences.

## Requirements *(mandatory)*

### Functional Requirements

#### Fonctionnalité 1 : Impression de reçus et tickets

- **FR-001**: Le système DOIT générer un reçu pour chaque vente complétée, contenant les informations du magasin, la date, les articles, les prix, la remise, le total et la méthode de paiement.
- **FR-002**: Le système DOIT générer un ticket de réparation contenant le numéro de réparation, les informations client, l'appareil, le problème, le coût estimé et la date promise.
- **FR-003**: Le système DOIT permettre de régénérer un reçu ou un ticket à partir de l'historique des ventes ou des réparations.
- **FR-004**: Le système DOIT offrir un aperçu du document à l'écran avant l'envoi à l'impression.

#### Fonctionnalité 2 : Notifications en temps réel

- **FR-005**: Le système DOIT afficher des notifications dans un panneau accessible depuis la barre de navigation avec un compteur de notifications non lues.
- **FR-006**: Le système DOIT déclencher une notification lorsque le stock d'un produit passe en dessous de son seuil d'alerte.
- **FR-007**: Le système DOIT déclencher une notification lorsqu'une réparation change de statut.
- **FR-008**: Le système DOIT déclencher une notification lorsqu'une session de caisse reste ouverte au-delà de l'heure de fermeture du magasin.
- **FR-009**: Les utilisateurs DOIVENT pouvoir marquer les notifications comme lues individuellement ou toutes à la fois.

#### Fonctionnalité 3 : Gestion des fournisseurs et approvisionnement

- **FR-010**: Le système DOIT permettre la création, modification et suppression de fiches fournisseurs (nom, téléphone, email, adresse, notes).
- **FR-011**: Le système DOIT permettre la création de bons de commande associés à un fournisseur, avec sélection de produits et quantités.
- **FR-012**: Le système DOIT calculer automatiquement le total d'un bon de commande à partir des prix d'achat des produits.
- **FR-013**: Le système DOIT permettre de marquer une commande comme reçue (totalement ou partiellement) et mettre à jour le stock automatiquement.
- **FR-014**: Le système DOIT suivre le statut des commandes : en attente, partiellement reçue, reçue, annulée.

#### Fonctionnalité 4 : Programme de fidélité

- **FR-015**: Le système DOIT attribuer automatiquement des points de fidélité au client après chaque vente (1 point par unité monétaire dépensée).
- **FR-016**: Le système DOIT afficher le solde de points de fidélité du client dans l'interface POS lorsqu'un client est sélectionné.
- **FR-017**: Le système DOIT permettre d'appliquer une remise fidélité en échangeant des points lors du paiement.
- **FR-018**: Le système DOIT retirer les points attribués lorsqu'une vente est annulée ou remboursée.

#### Fonctionnalité 5 : Rapports et exports

- **FR-019**: Le système DOIT permettre de générer un rapport de ventes pour une période configurable (jour, semaine, mois, période personnalisée).
- **FR-020**: Le système DOIT permettre de générer un rapport d'inventaire montrant le stock actuel, les valeurs et les produits en alerte.
- **FR-021**: Le système DOIT permettre de générer un bilan de caisse pour une période donnée avec les détails de chaque session.
- **FR-022**: Le système DOIT permettre l'export des rapports dans un format exploitable (tableur).
- **FR-023**: Les rapports de ventes DOIVENT inclure : nombre de transactions, chiffre d'affaires, répartition par méthode de paiement, et top des produits vendus.

### Key Entities

- **Reçu / Ticket**: Document généré lié à une vente ou une réparation, contenant les informations de la transaction et du magasin. Rattaché à une vente ou une réparation.
- **Notification**: Événement système adressé à un ou plusieurs utilisateurs, avec un type (alerte stock, réparation, caisse), un message, un statut lu/non-lu et un horodatage.
- **Fournisseur**: Entité représentant un partenaire d'approvisionnement avec ses coordonnées. Lié aux bons de commande.
- **Bon de commande**: Document d'approvisionnement lié à un fournisseur, contenant des lignes de produits avec quantités demandées et reçues, un statut et un total.
- **Ligne de commande**: Ligne de détail d'un bon de commande, liée à un produit, avec quantité demandée, quantité reçue et prix unitaire d'achat.
- **Points de fidélité**: Attribut du client représentant son solde de points cumulés, avec un historique des crédits et débits liés aux ventes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% des ventes complétées permettent de générer un reçu en moins de 5 secondes.
- **SC-002**: 100% des réparations créées permettent de générer un ticket de suivi.
- **SC-003**: Les notifications de stock bas apparaissent dans les 10 secondes suivant le déclenchement du seuil d'alerte.
- **SC-004**: Un gérant peut créer un fournisseur et passer un bon de commande en moins de 3 minutes.
- **SC-005**: La réception d'une commande met à jour le stock des produits concernés sans intervention manuelle supplémentaire.
- **SC-006**: Les clients ayant un solde de points de fidélité peuvent l'utiliser en moins de 30 secondes lors du passage en caisse.
- **SC-007**: Un rapport de ventes pour un mois complet peut être généré et exporté en moins de 30 secondes.
- **SC-008**: Les rapports exportés contiennent 100% des transactions de la période sélectionnée sans perte de données.

## Assumptions

- Le magasin dispose d'une imprimante de reçus thermique compatible avec l'impression depuis un navigateur web, ou l'aperçu à l'écran suffit comme alternative.
- Le taux de conversion des points de fidélité (points vers remise) sera configurable par l'administrateur dans les paramètres du magasin. Valeur par défaut assumée : 100 points = 1 unité monétaire de remise.
- Les notifications sont locales à l'application (pas de notifications push sur téléphone). Elles apparaissent lors de la navigation dans l'application.
- Les rapports sont générés à la demande et non de manière planifiée.
- L'export de rapports se fait en format CSV ou similaire, exploitable par un tableur standard.
- Les bons de commande utilisent les prix d'achat déjà enregistrés dans les fiches produits.
