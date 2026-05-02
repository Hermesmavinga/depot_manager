// ============================================
// CONFIGURATION API
// ============================================
const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.protocol === "file:";
const API_BASE_URL = isLocal
  ? "http://localhost:4000"
  : "https://depot-manager.onrender.com";
const CLIENTS_URL = `${API_BASE_URL}/clients`;
const VENTES_URL = `${API_BASE_URL}/ventes`;
const PRODUITS_URL = `${API_BASE_URL}/produits`;

// ============================================
// VARIABLES GLOBALES
// ============================================
let produits = {
  BRACONGO: { bouteille: {}, cassier: {} },
  BRALIMA: { bouteille: {}, cassier: {} },
};
let panier = [];
let currentFournisseur = "BRACONGO";
let currentType = "bouteille";
let produitEnEdition = null;
let currentEditClientId = null;
let currentClientsPage = 1;
const clientsPerPage = 10;
let allClients = [];
let filteredClients = [];

// ============================================
// FONCTIONS UTILITAIRES
// ============================================
function showNotification(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast-notification fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 ${type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`;
  toast.innerHTML = `<i class="fas ${type === "success" ? "fa-check-circle" : "fa-exclamation-circle"}"></i><span>${message}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
function showTemporaryNotification(message, type = "success") {
  showNotification(message, type);
}
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
function formatNumberFC(number) {
  if (number === undefined || number === null) return "0";
  const num = Number(number);
  if (isNaN(num)) return "0";
  return Math.floor(num)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
function formatDate(dateString) {
  if (!dateString) return "Date non disponible";
  let date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return (
    date.toLocaleDateString("fr-FR") + " à " + date.toLocaleTimeString("fr-FR")
  );
}
function parseDate(dateString) {
  if (!dateString) return new Date(0);
  let date = new Date(dateString);
  if (isNaN(date.getTime())) {
    const parts = dateString.match(
      /(\d{1,2})\/(\d{1,2})\/(\d{4})\s?(\d{1,2})?:?(\d{2})?:?(\d{2})?/,
    );
    if (parts) {
      const [_, day, month, year, hour = 0, minute = 0, second = 0] = parts;
      date = new Date(year, month - 1, day, hour, minute, second);
    }
  }
  return date;
}
function nettoyerVente(vente) {
  let produitsListe = [];
  let total = Number(vente.total) || 0;
  if (
    vente.produits &&
    Array.isArray(vente.produits) &&
    vente.produits.length > 0
  ) {
    produitsListe = vente.produits
      .filter(
        (p) =>
          p &&
          p.nom &&
          typeof p.quantite === "number" &&
          typeof p.prix === "number" &&
          !isNaN(p.prix) &&
          p.prix > 0,
      )
      .map((p) => ({ nom: p.nom, quantite: p.quantite, prix: p.prix }));
    if (produitsListe.length > 0)
      total = produitsListe.reduce((sum, p) => sum + p.prix * p.quantite, 0);
  } else if (
    vente.produit &&
    vente.quantite &&
    vente.prix &&
    !isNaN(vente.prix) &&
    vente.prix > 0
  ) {
    produitsListe = [
      {
        nom: vente.produit,
        quantite: Number(vente.quantite),
        prix: Number(vente.prix),
      },
    ];
    total = vente.prix * vente.quantite;
  } else if (total > 0 && !produitsListe.length) {
    produitsListe = [
      { nom: "Produit (données manquantes)", quantite: 1, prix: total },
    ];
  }
  return { produits: produitsListe, total: total };
}
function afficherProduitsListe(produits) {
  if (!produits || produits.length === 0) return "Aucun produit";
  return produits
    .map(
      (p) =>
        `<div class="text-sm">${escapeHtml(p.nom)} - ${p.quantite} x ${formatNumberFC(p.prix)} FC</div>`,
    )
    .join("");
}

// ============================================
// NAVIGATION
// ============================================
const navItems = document.querySelectorAll(".nav-item");
const sections = {
  dashboard: document.getElementById("dashboardSection"),
  clients: document.getElementById("clientsSection"),
  produits: document.getElementById("produitsSection"),
  ventes: document.getElementById("ventesSection"),
  historique: document.getElementById("historiqueSection"),
};
const sidebar = document.getElementById("sidebar");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const overlay = document.getElementById("overlay");
function closeMobileMenu() {
  if (sidebar && window.innerWidth < 768) {
    sidebar.classList.add("-translate-x-full");
    if (overlay) overlay.classList.remove("active");
  }
}
function openMobileMenu() {
  if (sidebar && window.innerWidth < 768) {
    sidebar.classList.remove("-translate-x-full");
    if (overlay) overlay.classList.add("active");
  }
}
if (mobileMenuBtn) mobileMenuBtn.addEventListener("click", openMobileMenu);
if (overlay) overlay.addEventListener("click", closeMobileMenu);
navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const sectionId = item.dataset.section;
    navItems.forEach((nav) => {
      nav.classList.remove("bg-emerald-600", "text-white");
      nav.classList.add("text-gray-300");
    });
    item.classList.add("bg-emerald-600", "text-white");
    item.classList.remove("text-gray-300");
    Object.values(sections).forEach((section) => {
      if (section) section.classList.add("hidden");
    });
    if (sections[sectionId]) sections[sectionId].classList.remove("hidden");
    const pageTitle = document.getElementById("currentPageTitle");
    if (pageTitle)
      pageTitle.textContent = item.querySelector("span").textContent;
    closeMobileMenu();
  });
});
document.getElementById("currentDate").textContent =
  new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

// ============================================
// DASHBOARD STATS
// ============================================
async function loadDashboardStats() {
  try {
    const [ventesRes, clientsRes] = await Promise.all([
      fetch(VENTES_URL),
      fetch(CLIENTS_URL),
    ]);
    const ventes = await ventesRes.json();
    const clients = await clientsRes.json();
    const nbVentes = ventes.length;
    let quantiteTotale = 0;
    ventes.forEach((v) => {
      if (v.produits && Array.isArray(v.produits)) {
        quantiteTotale += v.produits.reduce((s, p) => s + (p.quantite || 0), 0);
      } else if (v.quantite) quantiteTotale += v.quantite;
    });
    document.getElementById("statVentes").textContent = nbVentes;
    document.getElementById("statQuantite").textContent = quantiteTotale;
    document.getElementById("statClients").textContent = clients.length;
    const produitsMap = new Map();
    ventes.forEach((v) => {
      if (v.produits && Array.isArray(v.produits)) {
        v.produits.forEach((p) => {
          if (!produitsMap.has(p.nom))
            produitsMap.set(p.nom, { nom: p.nom, quantite: 0 });
          produitsMap.get(p.nom).quantite += p.quantite;
        });
      }
    });
    const topProduits = Array.from(produitsMap.values())
      .sort((a, b) => b.quantite - a.quantite)
      .slice(0, 5);
    const topProduitsDiv = document.getElementById("topProduitsList");
    if (topProduitsDiv) {
      if (topProduits.length === 0) {
        topProduitsDiv.innerHTML =
          '<div class="px-6 py-8 text-center text-gray-400"><i class="fas fa-chart-simple text-3xl mb-2 block"></i><p>Aucune donnée</p></div>';
      } else {
        topProduitsDiv.innerHTML = topProduits
          .map(
            (p, i) =>
              `<div class="flex justify-between items-center px-6 py-3 hover:bg-gray-50"><span class="font-medium text-gray-700"><span class="text-emerald-600 font-bold mr-2">${i + 1}.</span> ${escapeHtml(p.nom)}</span><span class="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-semibold">${p.quantite} unités</span></div>`,
          )
          .join("");
      }
    }
  } catch (error) {
    console.error("Erreur chargement dashboard:", error);
  }
}

// ============================================
// API PRODUITS
// ============================================
async function chargerProduits() {
  try {
    const response = await fetch(PRODUITS_URL);
    if (!response.ok) throw new Error("Erreur chargement produits");
    const produitsArray = await response.json();
    produits = {
      BRACONGO: { bouteille: {}, cassier: {} },
      BRALIMA: { bouteille: {}, cassier: {} },
    };
    produitsArray.forEach((p) => {
      if (p.type === "bouteille") {
        produits[p.fournisseur].bouteille[p.nom] = {
          id: p.id,
          prix: p.prix,
          format: p.format,
        };
      } else if (p.type === "cassier") {
        produits[p.fournisseur].cassier[p.nom] = {
          id: p.id,
          prixCassier: p.prixCassier,
          format: p.format,
          nbBouteilles: p.nbBouteilles || 24,
        };
      }
    });
    return produits;
  } catch (error) {
    console.error("Erreur chargement produits:", error);
    return produits;
  }
}
async function ajouterProduitAPI(produitData) {
  const response = await fetch(PRODUITS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(produitData),
  });
  if (!response.ok) throw new Error("Erreur ajout produit");
  const newProduit = await response.json();
  await chargerProduits();
  return newProduit;
}
async function modifierProduitAPI(id, produitData) {
  const response = await fetch(`${PRODUITS_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(produitData),
  });
  if (!response.ok) throw new Error("Erreur modification produit");
  const updatedProduit = await response.json();
  await chargerProduits();
  return updatedProduit;
}
async function supprimerProduitAPI(id) {
  const response = await fetch(`${PRODUITS_URL}/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Erreur suppression produit");
  await chargerProduits();
}

// ============================================
// UI PRODUITS
// ============================================
const tabBracongo = document.getElementById("tabBracongo");
const tabBralima = document.getElementById("tabBralima");
const bracongoContainer = document.getElementById("bracongoContainer");
const bralimaContainer = document.getElementById("bralimaContainer");
const bracongoBouteilleTab = document.getElementById("bracongoBouteilleTab");
const bracongoCassierTab = document.getElementById("bracongoCassierTab");
const bracongoBouteilleContainer = document.getElementById(
  "bracongoBouteilleContainer",
);
const bracongoCassierContainer = document.getElementById(
  "bracongoCassierContainer",
);
const bracongoBouteilleBody = document.getElementById("bracongoBouteilleBody");
const bracongoCassierBody = document.getElementById("bracongoCassierBody");
const bralimaBouteilleTab = document.getElementById("bralimaBouteilleTab");
const bralimaCassierTab = document.getElementById("bralimaCassierTab");
const bralimaBouteilleContainer = document.getElementById(
  "bralimaBouteilleContainer",
);
const bralimaCassierContainer = document.getElementById(
  "bralimaCassierContainer",
);
const bralimaBouteilleBody = document.getElementById("bralimaBouteilleBody");
const bralimaCassierBody = document.getElementById("bralimaCassierBody");
const produitModal = document.getElementById("produitModal");
const modalTitle = document.getElementById("modalTitle");
const produitNomInput = document.getElementById("produitNom");
const produitFormatInput = document.getElementById("produitFormat");
const produitTypeSelect = document.getElementById("produitType");
const produitPrixInput = document.getElementById("produitPrix");
const produitPrixCassierInput = document.getElementById("produitPrixCassier");
const produitNbBouteillesInput = document.getElementById("produitNbBouteilles");
const prixBouteilleGroup = document.getElementById("prixBouteilleGroup");
const prixCassierGroup = document.getElementById("prixCassierGroup");
const nbBouteillesGroup = document.getElementById("nbBouteillesGroup");
const produitFournisseurSelect = document.getElementById("produitFournisseur");
const modalSaveBtn = document.getElementById("modalSaveBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");
const produitSelect = document.getElementById("produit");

function setActiveFournisseur(fournisseur) {
  currentFournisseur = fournisseur;
  const tabs = document.querySelectorAll(".categorie-tab");
  tabs.forEach((tab) => {
    if (tab.getAttribute("data-categorie") === fournisseur) {
      tab.classList.add("active");
      tab.style.borderBottomColor = "#10b981";
      tab.style.color = "#10b981";
    } else {
      tab.classList.remove("active");
      tab.style.borderBottomColor = "transparent";
      tab.style.color = "#4b5563";
    }
  });
  if (bracongoContainer && bralimaContainer) {
    bracongoContainer.style.display =
      fournisseur === "BRACONGO" ? "block" : "none";
    bralimaContainer.style.display =
      fournisseur === "BRALIMA" ? "block" : "none";
  }
  setActiveType(currentType, fournisseur);
}
function setActiveType(type, fournisseur) {
  currentType = type;
  if (
    fournisseur === "BRACONGO" &&
    bracongoBouteilleTab &&
    bracongoCassierTab
  ) {
    if (type === "bouteille") {
      bracongoBouteilleTab.classList.add("active");
      bracongoCassierTab.classList.remove("active");
      bracongoBouteilleContainer.style.display = "block";
      bracongoCassierContainer.style.display = "none";
    } else {
      bracongoCassierTab.classList.add("active");
      bracongoBouteilleTab.classList.remove("active");
      bracongoBouteilleContainer.style.display = "none";
      bracongoCassierContainer.style.display = "block";
    }
  }
  if (fournisseur === "BRALIMA" && bralimaBouteilleTab && bralimaCassierTab) {
    if (type === "bouteille") {
      bralimaBouteilleTab.classList.add("active");
      bralimaCassierTab.classList.remove("active");
      bralimaBouteilleContainer.style.display = "block";
      bralimaCassierContainer.style.display = "none";
    } else {
      bralimaCassierTab.classList.add("active");
      bralimaBouteilleTab.classList.remove("active");
      bralimaBouteilleContainer.style.display = "none";
      bralimaCassierContainer.style.display = "block";
    }
  }
}
function initTypeTabs() {
  if (bracongoBouteilleTab)
    bracongoBouteilleTab.addEventListener("click", () =>
      setActiveType("bouteille", "BRACONGO"),
    );
  if (bracongoCassierTab)
    bracongoCassierTab.addEventListener("click", () =>
      setActiveType("cassier", "BRACONGO"),
    );
  if (bralimaBouteilleTab)
    bralimaBouteilleTab.addEventListener("click", () =>
      setActiveType("bouteille", "BRALIMA"),
    );
  if (bralimaCassierTab)
    bralimaCassierTab.addEventListener("click", () =>
      setActiveType("cassier", "BRALIMA"),
    );
}
function initFournisseurTabs() {
  if (tabBracongo)
    tabBracongo.addEventListener("click", () =>
      setActiveFournisseur("BRACONGO"),
    );
  if (tabBralima)
    tabBralima.addEventListener("click", () => setActiveFournisseur("BRALIMA"));
}
function initTypeChangeListener() {
  if (produitTypeSelect) {
    produitTypeSelect.addEventListener("change", () => {
      const isCassier = produitTypeSelect.value === "cassier";
      if (prixBouteilleGroup)
        prixBouteilleGroup.style.display = isCassier ? "none" : "block";
      if (prixCassierGroup)
        prixCassierGroup.style.display = isCassier ? "block" : "none";
      if (nbBouteillesGroup)
        nbBouteillesGroup.style.display = isCassier ? "block" : "none";
    });
  }
}
function mettreAJourSelecteurProduits() {
  if (!produitSelect) return;
  const selectedValue = produitSelect.value;
  produitSelect.innerHTML =
    '<option value="" disabled selected>-- Sélectionnez un produit --</option>';
  const bracongoBouteilleGroup = document.createElement("optgroup");
  bracongoBouteilleGroup.label = "🍺 BRACONGO - Bouteilles";
  Object.entries(produits.BRACONGO.bouteille).forEach(([nom, data]) => {
    const option = document.createElement("option");
    option.value = `bouteille|${nom}`;
    option.textContent = `${nom} (${data.format}) - ${formatNumberFC(data.prix)} FC`;
    if (`bouteille|${nom}` === selectedValue) option.selected = true;
    bracongoBouteilleGroup.appendChild(option);
  });
  produitSelect.appendChild(bracongoBouteilleGroup);
  const bracongoCassierGroup = document.createElement("optgroup");
  bracongoCassierGroup.label = "🍺 BRACONGO - Cassiers";
  Object.entries(produits.BRACONGO.cassier).forEach(([nom, data]) => {
    const prixUnitaire = Math.round(data.prixCassier / data.nbBouteilles);
    const option = document.createElement("option");
    option.value = `cassier|${nom}`;
    option.textContent = `${nom} (${data.format}) - ${formatNumberFC(data.prixCassier)} FC (${data.nbBouteilles} bouteilles, ${formatNumberFC(prixUnitaire)} FC/unité)`;
    if (`cassier|${nom}` === selectedValue) option.selected = true;
    bracongoCassierGroup.appendChild(option);
  });
  produitSelect.appendChild(bracongoCassierGroup);
  const bralimaBouteilleGroup = document.createElement("optgroup");
  bralimaBouteilleGroup.label = "🍻 BRALIMA - Bouteilles";
  Object.entries(produits.BRALIMA.bouteille).forEach(([nom, data]) => {
    const option = document.createElement("option");
    option.value = `bouteille|${nom}`;
    option.textContent = `${nom} (${data.format}) - ${formatNumberFC(data.prix)} FC`;
    if (`bouteille|${nom}` === selectedValue) option.selected = true;
    bralimaBouteilleGroup.appendChild(option);
  });
  produitSelect.appendChild(bralimaBouteilleGroup);
  const bralimaCassierGroup = document.createElement("optgroup");
  bralimaCassierGroup.label = "🍻 BRALIMA - Cassiers";
  Object.entries(produits.BRALIMA.cassier).forEach(([nom, data]) => {
    const prixUnitaire = Math.round(data.prixCassier / data.nbBouteilles);
    const option = document.createElement("option");
    option.value = `cassier|${nom}`;
    option.textContent = `${nom} (${data.format}) - ${formatNumberFC(data.prixCassier)} FC (${data.nbBouteilles} bouteilles, ${formatNumberFC(prixUnitaire)} FC/unité)`;
    if (`cassier|${nom}` === selectedValue) option.selected = true;
    bralimaCassierGroup.appendChild(option);
  });
  produitSelect.appendChild(bralimaCassierGroup);
  updatePrix();
}
function updatePrix() {
  if (!produitSelect || !document.getElementById("prix")) return;
  const value = produitSelect.value;
  if (!value || value === "") {
    document.getElementById("prix").value = "";
    if (typeof updateTotal === "function") updateTotal();
    return;
  }
  const [type, nom] = value.split("|");
  if (type === "bouteille") {
    if (produits.BRACONGO.bouteille[nom])
      document.getElementById("prix").value =
        produits.BRACONGO.bouteille[nom].prix;
    else if (produits.BRALIMA.bouteille[nom])
      document.getElementById("prix").value =
        produits.BRALIMA.bouteille[nom].prix;
    else document.getElementById("prix").value = "";
  } else if (type === "cassier") {
    if (produits.BRACONGO.cassier[nom])
      document.getElementById("prix").value =
        produits.BRACONGO.cassier[nom].prixCassier;
    else if (produits.BRALIMA.cassier[nom])
      document.getElementById("prix").value =
        produits.BRALIMA.cassier[nom].prixCassier;
    else document.getElementById("prix").value = "";
  } else document.getElementById("prix").value = "";
  if (typeof updateTotal === "function") updateTotal();
}
function updateTotal() {
  const quantite = parseFloat(document.getElementById("quantite")?.value) || 0;
  const prix = parseFloat(document.getElementById("prix")?.value) || 0;
  const total = quantite * prix;
  let totalDisplay = document.getElementById("totalDisplay");
  if (!totalDisplay) {
    totalDisplay = document.createElement("p");
    totalDisplay.id = "totalDisplay";
    totalDisplay.className = "mt-3 text-right font-bold text-emerald-600";
    const prixInput = document.getElementById("prix");
    if (prixInput) prixInput.insertAdjacentElement("afterend", totalDisplay);
  }
  if (totalDisplay) {
    if (quantite > 0 && prix > 0)
      totalDisplay.innerHTML = `💰 Total : ${formatNumberFC(total)} FC`;
    else totalDisplay.innerHTML = "";
  }
}
function afficherListeProduits() {
  if (bracongoBouteilleBody) {
    bracongoBouteilleBody.innerHTML = "";
    Object.entries(produits.BRACONGO.bouteille).forEach(([nom, data]) => {
      const tr = document.createElement("tr");
      tr.className = "border-b border-gray-100 hover:bg-gray-50";
      tr.innerHTML = `<td class="px-4 py-3">${escapeHtml(nom)}<\/td><td class="px-4 py-3">${data.format}<\/td><td class="px-4 py-3 text-right">${formatNumberFC(data.prix)} FC<\/td><td class="px-4 py-3 text-center"><button class="btn-edit-produit text-blue-600 hover:text-blue-800 mr-2" data-id="${data.id}" data-nom="${escapeHtml(nom)}" data-fournisseur="BRACONGO" data-type="bouteille" data-format="${data.format}" data-prix="${data.prix}"><i class="fas fa-edit"></i></button><button class="btn-delete-produit text-red-600 hover:text-red-800" data-id="${data.id}" data-nom="${escapeHtml(nom)}"><i class="fas fa-trash"></i></button><\/td>`;
      bracongoBouteilleBody.appendChild(tr);
    });
  }
  if (bracongoCassierBody) {
    bracongoCassierBody.innerHTML = "";
    Object.entries(produits.BRACONGO.cassier).forEach(([nom, data]) => {
      const prixUnitaire = Math.round(data.prixCassier / data.nbBouteilles);
      const tr = document.createElement("tr");
      tr.className = "border-b border-gray-100 hover:bg-gray-50";
      tr.innerHTML = `<td class="px-4 py-3">${escapeHtml(nom)}<\/td><td class="px-4 py-3">${data.format}<\/td><td class="px-4 py-3 text-right">${formatNumberFC(data.prixCassier)} FC<\/td><td class="px-4 py-3 text-right">${data.nbBouteilles}<\/td><td class="px-4 py-3 text-right">${formatNumberFC(prixUnitaire)} FC<\/td><td class="px-4 py-3 text-center"><button class="btn-edit-produit text-blue-600 hover:text-blue-800 mr-2" data-id="${data.id}" data-nom="${escapeHtml(nom)}" data-fournisseur="BRACONGO" data-type="cassier" data-format="${data.format}" data-prixcassier="${data.prixCassier}" data-nbbouteilles="${data.nbBouteilles}"><i class="fas fa-edit"></i></button><button class="btn-delete-produit text-red-600 hover:text-red-800" data-id="${data.id}" data-nom="${escapeHtml(nom)}"><i class="fas fa-trash"></i></button><\/td>`;
      bracongoCassierBody.appendChild(tr);
    });
  }
  if (bralimaBouteilleBody) {
    bralimaBouteilleBody.innerHTML = "";
    Object.entries(produits.BRALIMA.bouteille).forEach(([nom, data]) => {
      const tr = document.createElement("tr");
      tr.className = "border-b border-gray-100 hover:bg-gray-50";
      tr.innerHTML = `<td class="px-4 py-3">${escapeHtml(nom)}<\/td><td class="px-4 py-3">${data.format}<\/td><td class="px-4 py-3 text-right">${formatNumberFC(data.prix)} FC<\/td><td class="px-4 py-3 text-center"><button class="btn-edit-produit text-blue-600 hover:text-blue-800 mr-2" data-id="${data.id}" data-nom="${escapeHtml(nom)}" data-fournisseur="BRALIMA" data-type="bouteille" data-format="${data.format}" data-prix="${data.prix}"><i class="fas fa-edit"></i></button><button class="btn-delete-produit text-red-600 hover:text-red-800" data-id="${data.id}" data-nom="${escapeHtml(nom)}"><i class="fas fa-trash"></i></button><\/td>`;
      bralimaBouteilleBody.appendChild(tr);
    });
  }
  if (bralimaCassierBody) {
    bralimaCassierBody.innerHTML = "";
    Object.entries(produits.BRALIMA.cassier).forEach(([nom, data]) => {
      const prixUnitaire = Math.round(data.prixCassier / data.nbBouteilles);
      const tr = document.createElement("tr");
      tr.className = "border-b border-gray-100 hover:bg-gray-50";
      tr.innerHTML = `<td class="px-4 py-3">${escapeHtml(nom)}<\/td><td class="px-4 py-3">${data.format}<\/td><td class="px-4 py-3 text-right">${formatNumberFC(data.prixCassier)} FC<\/td><td class="px-4 py-3 text-right">${data.nbBouteilles}<\/td><td class="px-4 py-3 text-right">${formatNumberFC(prixUnitaire)} FC<\/td><td class="px-4 py-3 text-center"><button class="btn-edit-produit text-blue-600 hover:text-blue-800 mr-2" data-id="${data.id}" data-nom="${escapeHtml(nom)}" data-fournisseur="BRALIMA" data-type="cassier" data-format="${data.format}" data-prixcassier="${data.prixCassier}" data-nbbouteilles="${data.nbBouteilles}"><i class="fas fa-edit"></i></button><button class="btn-delete-produit text-red-600 hover:text-red-800" data-id="${data.id}" data-nom="${escapeHtml(nom)}"><i class="fas fa-trash"></i></button><\/td>`;
      bralimaCassierBody.appendChild(tr);
    });
  }
  document.querySelectorAll(".btn-edit-produit").forEach((btn) => {
    btn.removeEventListener("click", handleEditClick);
    btn.addEventListener("click", handleEditClick);
  });
  document.querySelectorAll(".btn-delete-produit").forEach((btn) => {
    btn.removeEventListener("click", handleDeleteClick);
    btn.addEventListener("click", handleDeleteClick);
  });
}
async function handleEditClick(e) {
  const btn = e.currentTarget;
  const id = btn.getAttribute("data-id");
  const nom = btn.getAttribute("data-nom");
  const fournisseur = btn.getAttribute("data-fournisseur");
  const type = btn.getAttribute("data-type");
  const format = btn.getAttribute("data-format");
  const prix = btn.getAttribute("data-prix");
  const prixCassier = btn.getAttribute("data-prixcassier");
  const nbBouteilles = btn.getAttribute("data-nbbouteilles");
  ouvrirModalEdition(
    id,
    fournisseur,
    type,
    nom,
    format,
    prix,
    prixCassier,
    nbBouteilles,
  );
}
async function handleDeleteClick(e) {
  const btn = e.currentTarget;
  const id = btn.getAttribute("data-id");
  const nom = btn.getAttribute("data-nom");
  if (confirm(`⚠️ Supprimer "${nom}" ?`)) {
    try {
      await supprimerProduitAPI(id);
      await chargerProduits();
      mettreAJourSelecteurProduits();
      afficherListeProduits();
      panier = panier.filter((item) => item.nom !== nom);
      afficherPanier();
      showTemporaryNotification(`✅ "${nom}" supprimé`);
    } catch (error) {
      showTemporaryNotification(`❌ Erreur: ${error.message}`, "error");
    }
  }
}
function ouvrirModalAjout() {
  produitEnEdition = null;
  modalTitle.textContent = "Ajouter un produit";
  produitNomInput.value = "";
  produitFormatInput.value = "";
  produitTypeSelect.value = "bouteille";
  produitPrixInput.value = "";
  produitPrixCassierInput.value = "";
  if (produitNbBouteillesInput) produitNbBouteillesInput.value = "24";
  produitFournisseurSelect.value = currentFournisseur;
  prixBouteilleGroup.style.display = "block";
  prixCassierGroup.style.display = "none";
  if (nbBouteillesGroup) nbBouteillesGroup.style.display = "none";
  produitModal.classList.remove("hidden");
  produitModal.classList.add("flex");
}
function ouvrirModalEdition(
  id,
  fournisseur,
  type,
  nom,
  format,
  prix,
  prixCassier,
  nbBouteilles,
) {
  produitEnEdition = { id, fournisseur, type, nom };
  modalTitle.textContent = `Modifier : ${nom}`;
  produitNomInput.value = nom;
  produitTypeSelect.value = type;
  produitFournisseurSelect.value = fournisseur;
  produitFormatInput.value = format || "";
  if (type === "bouteille") {
    produitPrixInput.value = prix;
    prixBouteilleGroup.style.display = "block";
    prixCassierGroup.style.display = "none";
    if (nbBouteillesGroup) nbBouteillesGroup.style.display = "none";
  } else {
    produitPrixCassierInput.value = prixCassier;
    if (produitNbBouteillesInput)
      produitNbBouteillesInput.value = nbBouteilles || 24;
    prixBouteilleGroup.style.display = "none";
    prixCassierGroup.style.display = "block";
    if (nbBouteillesGroup) nbBouteillesGroup.style.display = "block";
  }
  produitModal.classList.remove("hidden");
  produitModal.classList.add("flex");
}
function fermerModal() {
  produitModal.classList.add("hidden");
  produitModal.classList.remove("flex");
  produitEnEdition = null;
}
async function sauvegarderProduit() {
  const nom = produitNomInput.value.trim();
  const format = produitFormatInput.value.trim();
  const type = produitTypeSelect.value;
  const fournisseur = produitFournisseurSelect.value;
  if (!nom) {
    showTemporaryNotification("❌ Veuillez entrer un nom", "error");
    return;
  }
  try {
    if (produitEnEdition) {
      const { id } = produitEnEdition;
      if (type === "bouteille") {
        const prix = parseFloat(produitPrixInput.value);
        if (isNaN(prix) || prix <= 0) throw new Error("Prix invalide");
        await modifierProduitAPI(id, {
          nom,
          prix,
          format,
          type: "bouteille",
          fournisseur,
        });
      } else {
        const prixCassier = parseFloat(produitPrixCassierInput.value);
        const nbBouteilles = parseInt(produitNbBouteillesInput.value) || 24;
        if (isNaN(prixCassier) || prixCassier <= 0)
          throw new Error("Prix invalide");
        if (nbBouteilles <= 0) throw new Error("Nombre de bouteilles invalide");
        await modifierProduitAPI(id, {
          nom,
          prixCassier,
          format,
          type: "cassier",
          fournisseur,
          nbBouteilles,
        });
      }
    } else {
      if (type === "bouteille") {
        const prix = parseFloat(produitPrixInput.value);
        if (isNaN(prix) || prix <= 0) throw new Error("Prix invalide");
        await ajouterProduitAPI({
          nom,
          prix,
          format,
          type: "bouteille",
          fournisseur,
        });
      } else {
        const prixCassier = parseFloat(produitPrixCassierInput.value);
        const nbBouteilles = parseInt(produitNbBouteillesInput.value) || 24;
        if (isNaN(prixCassier) || prixCassier <= 0)
          throw new Error("Prix invalide");
        if (nbBouteilles <= 0) throw new Error("Nombre de bouteilles invalide");
        await ajouterProduitAPI({
          nom,
          prixCassier,
          format,
          type: "cassier",
          fournisseur,
          nbBouteilles,
        });
      }
    }
    await chargerProduits();
    mettreAJourSelecteurProduits();
    afficherListeProduits();
    fermerModal();
    showTemporaryNotification(`✅ Produit "${nom}" sauvegardé !`);
  } catch (error) {
    showTemporaryNotification(`❌ Erreur: ${error.message}`, "error");
  }
}
function initGestionProduits() {
  chargerProduits().then(() => {
    initFournisseurTabs();
    initTypeTabs();
    initTypeChangeListener();
    mettreAJourSelecteurProduits();
    afficherListeProduits();
  });
  const addProductBtn = document.getElementById("ajouterProduitBtn");
  if (addProductBtn) addProductBtn.addEventListener("click", ouvrirModalAjout);
  if (modalSaveBtn) modalSaveBtn.addEventListener("click", sauvegarderProduit);
  if (modalCancelBtn) modalCancelBtn.addEventListener("click", fermerModal);
  if (produitModal)
    produitModal.addEventListener("click", (e) => {
      if (e.target === produitModal) fermerModal();
    });
  if (produitSelect) produitSelect.addEventListener("change", updatePrix);
}

// ============================================
// CLIENTS (RECHERCHE, AJOUT, LISTE, MODIFICATION, SUPPRESSION)
// ============================================
const button = document.getElementById("searchBtn");
const clientIdInput = document.getElementById("clientId");
const resultDiv = document.getElementById("result");
if (button) button.addEventListener("click", searchClient);
async function searchClient() {
  const clientId = clientIdInput.value.trim();
  if (!clientId) {
    showError("Veuillez entrer un ID client", resultDiv);
    return;
  }
  showLoading(resultDiv);
  try {
    const response = await fetch(`${CLIENTS_URL}/${String(clientId)}`);
    if (!response.ok)
      throw new Error(`Client avec l'ID ${clientId} non trouvé`);
    const client = await response.json();
    displayClient(client);
  } catch (error) {
    showError(error.message, resultDiv);
  }
}
function displayClient(client) {
  resultDiv.innerHTML = `<div class="border-2 border-emerald-500 rounded-lg p-4 mt-3 bg-emerald-50"><div class="flex justify-between items-center mb-3"><h3 class="font-bold text-emerald-700">✅ Client trouvé</h3><button onclick="clearResult()" class="bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600">✕</button></div><div class="space-y-1 text-sm"><p><strong>🆔 ID :</strong> ${client.id}</p><p><strong>👤 Nom :</strong> ${escapeHtml(client.nom)}</p><p><strong>📞 Téléphone :</strong> ${escapeHtml(client.telephone)}</p></div><div class="flex gap-2 mt-3"><button onclick="fillVenteForm('${client.id}')" class="bg-emerald-600 text-white px-3 py-1 rounded text-sm hover:bg-emerald-700">🛒 Faire une vente</button><button onclick="copyToClipboard('${client.id}')" class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">📋 Copier l'ID</button></div></div>`;
}
function fillVenteForm(clientId) {
  const venteClientInput = document.getElementById("venteClientId");
  if (venteClientInput) {
    venteClientInput.value = clientId;
    const event = new Event("input", { bubbles: true });
    venteClientInput.dispatchEvent(event);
    showTemporaryMessage("✅ ID client pré-rempli !", "venteMessage");
  }
}
function showLoading(container) {
  container.innerHTML = `<div class="border border-blue-500 p-3 mt-3 rounded bg-blue-50 text-blue-600">⏳ Recherche en cours...</div>`;
}
function showError(message, container) {
  container.innerHTML = `<div class="border border-red-500 p-3 mt-3 rounded bg-red-50 text-red-600">❌ ${message}</div>`;
  setTimeout(() => {
    if (container.innerHTML.includes(message)) container.innerHTML = "";
  }, 5000);
}
function showTemporaryMessage(message, elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    const originalContent = element.innerHTML;
    element.innerHTML = `<span class="text-emerald-600">${message}</span>`;
    setTimeout(() => {
      if (
        element.innerHTML === `<span class="text-emerald-600">${message}</span>`
      )
        element.innerHTML = originalContent;
    }, 3000);
  }
}
function clearResult() {
  if (resultDiv) resultDiv.innerHTML = "";
}
if (clientIdInput) {
  clientIdInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      searchClient();
    }
  });
}
const clearButton = document.createElement("button");
clearButton.textContent = "Effacer";
clearButton.className =
  "bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition ml-2";
clearButton.addEventListener("click", () => {
  if (clientIdInput) clientIdInput.value = "";
  if (resultDiv) resultDiv.innerHTML = "";
  if (clientIdInput) clientIdInput.focus();
});
if (button) button.insertAdjacentElement("afterend", clearButton);

const addBtn = document.getElementById("addClientBtn");
const nomInput = document.getElementById("nom");
const telephoneInput = document.getElementById("telephone");
const messageDiv = document.getElementById("clientMessage");
if (addBtn) addBtn.addEventListener("click", addClient);
if (nomInput)
  nomInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addClient();
    }
  });
if (telephoneInput)
  telephoneInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addClient();
    }
  });
async function addClient() {
  const nom = nomInput.value.trim();
  const telephone = telephoneInput.value.trim();
  if (!nom || !telephone) {
    showErrorMessage("Veuillez remplir tous les champs", messageDiv);
    return;
  }
  if (nom.length < 2) {
    showErrorMessage("Le nom doit contenir au moins 2 caractères", messageDiv);
    return;
  }
  const phoneRegex = /^[0-9+\-\s]{8,}$/;
  if (!phoneRegex.test(telephone)) {
    showErrorMessage(
      "Veuillez entrer un numéro de téléphone valide (au moins 8 chiffres)",
      messageDiv,
    );
    return;
  }
  showLoadingMessage(messageDiv);
  try {
    const response = await fetch(CLIENTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, telephone }),
    });
    if (!response.ok) throw new Error("Erreur création");
    const data = await response.json();
    messageDiv.innerHTML = `<div class="bg-emerald-50 border border-emerald-500 rounded-lg p-4"><div class="flex justify-between items-start"><div><strong class="text-emerald-700">✅ Client ajouté avec succès !</strong><div class="bg-emerald-100 rounded p-2 my-2"><strong>🆔 ID du client :</strong> <span class="font-bold text-emerald-700 text-lg">${data.id}</span></div><p><strong>👤 Nom :</strong> ${escapeHtml(nom)}</p><p><strong>📞 Téléphone :</strong> ${escapeHtml(telephone)}</p><div class="flex gap-2 mt-3"><button onclick="fillVenteFormWithId('${data.id}')" class="bg-emerald-600 text-white px-3 py-1 rounded text-sm hover:bg-emerald-700">🛒 Faire une vente</button><button onclick="copyToClipboard('${data.id}')" class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">📋 Copier l'ID</button></div></div><button onclick="this.parentElement.parentElement.remove()" class="text-gray-400 hover:text-gray-600">✕</button></div></div>`;
    nomInput.value = "";
    telephoneInput.value = "";
    nomInput.focus();
    showTemporaryNotification("✅ Client créé avec succès !");
    loadDashboardStats();
    loadClientsList();
  } catch (error) {
    showErrorMessage(`Erreur lors de l'ajout : ${error.message}`, messageDiv);
  }
}
function showErrorMessage(message, container) {
  container.innerHTML = `<div class="bg-red-50 border border-red-500 rounded-lg p-3 text-red-600">❌ ${message}<button onclick="this.parentElement.remove()" class="float-right text-red-400">✕</button></div>`;
  setTimeout(() => {
    if (container.innerHTML.includes(message)) container.innerHTML = "";
  }, 5000);
}
function showLoadingMessage(container) {
  container.innerHTML = `<div class="bg-blue-50 border border-blue-500 rounded-lg p-3 text-blue-600">⏳ Création en cours...</div>`;
}
function fillVenteFormWithId(clientId) {
  const venteClientInput = document.getElementById("venteClientId");
  if (venteClientInput) {
    venteClientInput.value = clientId;
    const event = new Event("input", { bubbles: true });
    venteClientInput.dispatchEvent(event);
    showTemporaryNotification("✅ ID client pré-rempli !");
  }
}
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text.toString());
    showCopyNotification("✅ ID copié !");
  } catch (err) {
    showCopyNotification("❌ Impossible de copier l'ID", "error");
  }
}
function showCopyNotification(message, type = "success") {
  const notification = document.createElement("div");
  notification.className = `fixed bottom-5 right-5 z-50 px-4 py-2 rounded-lg shadow-lg text-white ${type === "success" ? "bg-emerald-600" : "bg-red-600"}`;
  notification.innerHTML = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 2000);
}

function initClientsTabs() {
  const tabAjouter = document.getElementById("tabAjouterClient");
  const tabLister = document.getElementById("tabListerClients");
  const panelAjouter = document.getElementById("panelAjouterClient");
  const panelLister = document.getElementById("panelListerClients");
  if (tabAjouter) {
    tabAjouter.addEventListener("click", () => {
      tabAjouter.classList.add("text-emerald-600", "border-emerald-600");
      tabAjouter.classList.remove("text-gray-500", "border-transparent");
      tabLister.classList.remove("text-emerald-600", "border-emerald-600");
      tabLister.classList.add("text-gray-500", "border-transparent");
      panelAjouter.classList.remove("hidden");
      panelLister.classList.add("hidden");
    });
  }
  if (tabLister) {
    tabLister.addEventListener("click", () => {
      tabLister.classList.add("text-emerald-600", "border-emerald-600");
      tabLister.classList.remove("text-gray-500", "border-transparent");
      tabAjouter.classList.remove("text-emerald-600", "border-emerald-600");
      tabAjouter.classList.add("text-gray-500", "border-transparent");
      panelAjouter.classList.add("hidden");
      panelLister.classList.remove("hidden");
      loadClientsList();
    });
  }
}
async function loadClientsList() {
  try {
    const response = await fetch(CLIENTS_URL);
    allClients = await response.json();
    filteredClients = [...allClients];
    displayClientsTable();
  } catch (error) {
    showTemporaryNotification("❌ Erreur chargement clients", "error");
  }
}
function displayClientsTable() {
  const tbody = document.getElementById("clientsTableBody");
  if (!tbody) return;
  const searchTerm =
    document.getElementById("searchClientList")?.value.toLowerCase() || "";
  filteredClients = allClients.filter(
    (client) =>
      client.nom?.toLowerCase().includes(searchTerm) ||
      client.telephone?.toLowerCase().includes(searchTerm),
  );
  const totalPages = Math.ceil(filteredClients.length / clientsPerPage);
  const start = (currentClientsPage - 1) * clientsPerPage;
  const end = start + clientsPerPage;
  const clientsToShow = filteredClients.slice(start, end);
  tbody.innerHTML = "";
  if (clientsToShow.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="px-4 py-8 text-center text-gray-400">Aucun client trouvé</td></tr>';
  } else {
    clientsToShow.forEach((client) => {
      const tr = document.createElement("tr");
      tr.className = "border-b border-gray-100 hover:bg-gray-50";
      tr.innerHTML = `<td class="px-4 py-3 text-sm font-mono">${client.id}<\/td><td class="px-4 py-3 text-sm">${escapeHtml(client.nom)}<\/td><td class="px-4 py-3 text-sm">${escapeHtml(client.telephone)}<\/td><td class="px-4 py-3 text-sm text-center"><button class="edit-client-btn text-blue-600 hover:text-blue-800 mr-3 transition" data-id="${client.id}" data-nom="${escapeHtml(client.nom)}" data-telephone="${escapeHtml(client.telephone)}"><i class="fas fa-edit"></i> Modifier</button><button class="delete-client-btn text-red-600 hover:text-red-800 transition" data-id="${client.id}" data-nom="${escapeHtml(client.nom)}"><i class="fas fa-trash"></i> Supprimer</button><\/td>`;
      tbody.appendChild(tr);
    });
  }
  updateClientsPagination(totalPages);
  document.querySelectorAll(".edit-client-btn").forEach((btn) => {
    btn.removeEventListener("click", handleEditClient);
    btn.addEventListener("click", handleEditClient);
  });
  document.querySelectorAll(".delete-client-btn").forEach((btn) => {
    btn.removeEventListener("click", handleDeleteClient);
    btn.addEventListener("click", handleDeleteClient);
  });
}
function updateClientsPagination(totalPages) {
  const paginationDiv = document.getElementById("clientsPagination");
  if (!paginationDiv) return;
  if (totalPages <= 1) {
    paginationDiv.innerHTML = "";
    return;
  }
  let paginationHtml = '<div class="flex gap-2">';
  for (let i = 1; i <= totalPages; i++) {
    paginationHtml += `<button class="client-page-btn px-3 py-1 rounded-lg text-sm transition ${i === currentClientsPage ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}" data-page="${i}">${i}</button>`;
  }
  paginationHtml += "</div>";
  paginationDiv.innerHTML = paginationHtml;
  document.querySelectorAll(".client-page-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentClientsPage = parseInt(btn.dataset.page);
      displayClientsTable();
    });
  });
}
function handleEditClient(e) {
  const btn = e.currentTarget;
  currentEditClientId = btn.getAttribute("data-id");
  const nom = btn.getAttribute("data-nom");
  const telephone = btn.getAttribute("data-telephone");
  document.getElementById("editClientNom").value = nom;
  document.getElementById("editClientTelephone").value = telephone;
  document.getElementById("editClientModal").classList.remove("hidden");
  document.getElementById("editClientModal").classList.add("flex");
}
async function saveEditClient() {
  const newNom = document.getElementById("editClientNom").value.trim();
  const newTelephone = document
    .getElementById("editClientTelephone")
    .value.trim();
  if (!newNom || !newTelephone) {
    showTemporaryNotification("❌ Veuillez remplir tous les champs", "error");
    return;
  }
  try {
    const response = await fetch(`${CLIENTS_URL}/${currentEditClientId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: newNom,
        telephone: newTelephone,
        id: currentEditClientId,
      }),
    });
    if (!response.ok) throw new Error("Erreur modification");
    showTemporaryNotification("✅ Client modifié avec succès !");
    document.getElementById("editClientModal").classList.add("hidden");
    document.getElementById("editClientModal").classList.remove("flex");
    loadClientsList();
    loadDashboardStats();
  } catch (error) {
    showTemporaryNotification(`❌ Erreur: ${error.message}`, "error");
  }
}
async function handleDeleteClient(e) {
  const btn = e.currentTarget;
  const clientId = btn.getAttribute("data-id");
  const clientNom = btn.getAttribute("data-nom");
  if (
    confirm(`⚠️ Êtes-vous sûr de vouloir supprimer le client "${clientNom}" ?`)
  ) {
    try {
      const response = await fetch(`${CLIENTS_URL}/${clientId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erreur suppression");
      showTemporaryNotification(`✅ Client "${clientNom}" supprimé !`);
      loadClientsList();
      loadDashboardStats();
    } catch (error) {
      showTemporaryNotification(`❌ Erreur: ${error.message}`, "error");
    }
  }
}
function initClientSearch() {
  const searchInput = document.getElementById("searchClientList");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      currentClientsPage = 1;
      displayClientsTable();
    });
  }
}
function initEditClientModal() {
  const modal = document.getElementById("editClientModal");
  const closeBtn = document.getElementById("closeEditModalBtn");
  const saveBtn = document.getElementById("saveEditClientBtn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    });
  }
  if (saveBtn) {
    saveBtn.addEventListener("click", saveEditClient);
  }
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
      }
    });
  }
}
function initGestionClients() {
  initClientsTabs();
  initClientSearch();
  initEditClientModal();
  const refreshBtn = document.getElementById("refreshClientsBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadClientsList);
  }
}

// ============================================
// PANIER ET VENTES
// ============================================
const venteBtn = document.getElementById("addVenteBtn");
const clientInput = document.getElementById("venteClientId");
const clientInfoDiv = document.getElementById("clientInfo");
const message = document.getElementById("venteMessage");
const quantiteInput = document.getElementById("quantite");
const prixInputVente = document.getElementById("prix");
const ajouterPanierBtn = document.getElementById("ajouterPanierBtn");
if (quantiteInput) quantiteInput.addEventListener("input", updateTotal);
if (prixInputVente) prixInputVente.addEventListener("input", updateTotal);
let debounceTimeout;
if (clientInput) {
  clientInput.addEventListener("input", function () {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(afficherClient, 500);
  });
}
async function afficherClient() {
  const clientId = clientInput.value.trim();
  if (!clientId) {
    if (clientInfoDiv) clientInfoDiv.innerHTML = "";
    return;
  }
  try {
    const response = await fetch(`${CLIENTS_URL}/${String(clientId)}`);
    if (!response.ok) {
      if (clientInfoDiv)
        clientInfoDiv.innerHTML = `<span class="text-red-600 text-sm">❌ Client introuvable</span>`;
      return;
    }
    const data = await response.json();
    if (clientInfoDiv)
      clientInfoDiv.innerHTML = `<div class="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm">✅ <strong>${escapeHtml(data.nom)}</strong><br>📞 ${data.telephone || "N/A"}<br>🆔 ${data.id}</div>`;
  } catch (error) {
    if (clientInfoDiv)
      clientInfoDiv.innerHTML = `<span class="text-red-600 text-sm">❌ Erreur connexion</span>`;
  }
}
function ajouterAuPanier() {
  const produitValue = produitSelect.value;
  const quantite = Number(quantiteInput.value);
  const prix = Number(prixInputVente.value);
  if (!produitValue || quantite <= 0 || prix <= 0) {
    showTemporaryNotification("❌ Données invalides");
    return;
  }
  const produitNom = produitValue.split("|")[1] || produitValue;
  const type = produitValue.split("|")[0] || "bouteille";
  panier.push({ nom: produitNom, quantite: quantite, prix: prix, type: type });
  afficherPanier();
  quantiteInput.value = "1";
  updateTotal();
  showTemporaryNotification(`✅ ${produitNom} ajouté au panier !`);
}
function afficherPanier() {
  let panierDiv = document.getElementById("panier");
  if (!panierDiv) return;
  if (panier.length === 0) {
    panierDiv.innerHTML =
      '<div class="text-center text-gray-400 py-4"><i class="fas fa-shopping-cart text-3xl mb-2 block"></i>Panier vide</div>';
    return;
  }
  let total = 0;
  let html = '<div class="space-y-2">';
  panier.forEach((item, index) => {
    const sousTotal = item.prix * item.quantite;
    total += sousTotal;
    const typeLabel = item.type === "cassier" ? "📦 Cassier" : "🍾 Bouteille";
    const typeClass =
      item.type === "cassier"
        ? "bg-orange-100 text-orange-700"
        : "bg-blue-100 text-blue-700";
    html += `<div class="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100"><div class="flex-1"><span class="inline-block px-2 py-0.5 rounded text-xs font-medium ${typeClass} mr-2">${typeLabel}</span><span class="font-medium">${escapeHtml(item.nom)}</span><div class="text-sm text-gray-500">${item.quantite} x ${formatNumberFC(item.prix)} FC</div></div><div class="text-right"><div class="font-bold text-emerald-600">${formatNumberFC(sousTotal)} FC</div><button onclick="supprimerDuPanier(${index})" class="text-red-500 hover:text-red-700 text-sm mt-1">❌ Supprimer</button></div></div>`;
  });
  html += `</div><div class="mt-4 pt-3 border-t text-right"><strong class="text-lg">Total : ${formatNumberFC(total)} FC</strong></div>`;
  panierDiv.innerHTML = html;
}
function supprimerDuPanier(index) {
  const produit = panier[index].nom;
  panier.splice(index, 1);
  afficherPanier();
  showTemporaryNotification(`❌ ${produit} retiré du panier`);
}
async function addVente() {
  const clientId = clientInput.value.trim();
  if (!clientId) {
    showTemporaryNotification("❌ Veuillez sélectionner un client");
    return;
  }
  if (panier.length === 0) {
    showTemporaryNotification("❌ Ajoutez des produits au panier");
    return;
  }
  message.innerHTML =
    '<div class="bg-blue-50 text-blue-600 p-3 rounded-lg">⏳ Enregistrement en cours...</div>';
  try {
    const clientResponse = await fetch(`${CLIENTS_URL}/${String(clientId)}`);
    if (!clientResponse.ok) {
      message.innerHTML =
        '<div class="bg-red-50 text-red-600 p-3 rounded-lg">❌ Client introuvable</div>';
      return;
    }
    const clientData = await clientResponse.json();
    const total = panier.reduce(
      (sum, item) => sum + item.prix * item.quantite,
      0,
    );
    const response = await fetch(VENTES_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: String(clientId),
        produits: panier,
        total: total,
        date: new Date().toISOString(),
      }),
    });
    const data = await response.json();
    genererFacturePanier(data, clientData);
    panier = [];
    afficherPanier();
    message.innerHTML = `<div class="bg-emerald-50 text-emerald-700 p-4 rounded-lg">✅ Vente enregistrée ! ID: ${data.id}<br>💰 Total: ${formatNumberFC(total)} FC</div>`;
    clientInput.focus();
    loadDashboardStats();
    setTimeout(() => {
      if (message.innerHTML.includes("Vente enregistrée"))
        message.innerHTML = "";
    }, 5000);
  } catch (error) {
    message.innerHTML = `<div class="bg-red-50 text-red-600 p-3 rounded-lg">❌ Erreur: ${error.message}</div>`;
  }
}
if (ajouterPanierBtn)
  ajouterPanierBtn.addEventListener("click", ajouterAuPanier);
if (venteBtn) venteBtn.addEventListener("click", addVente);
if (clientInput)
  clientInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      afficherClient();
    }
  });

// ============================================
// HISTORIQUE
// ============================================
const showHistoriqueBtn = document.getElementById("showHistoriqueBtn");
const historiqueClientIdElem = document.getElementById("historiqueClientId");
const historiqueMessageDiv = document.getElementById("historiqueMessage");
const historiqueTableElem = document.getElementById("historiqueTable");
const historiqueTableBody = document.getElementById("historiqueTableBody");
let currentClientData = null;
let ventesOriginales = [];

if (showHistoriqueBtn)
  showHistoriqueBtn.addEventListener("click", afficherHistorique);
if (historiqueClientIdElem)
  historiqueClientIdElem.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      afficherHistorique();
    }
  });

// Fonction globale pour les détails
window.showVenteDetail = async function (venteId) {
  try {
    const response = await fetch(`${VENTES_URL}/${venteId}`);
    if (!response.ok) throw new Error("Vente non trouvée");
    const vente = await response.json();
    const clientResponse = await fetch(
      `${CLIENTS_URL}/${String(vente.clientId)}`,
    );
    const client = clientResponse.ok ? await clientResponse.json() : null;
    const venteNettoyee = nettoyerVente(vente);
    const produits = venteNettoyee.produits;
    const total = venteNettoyee.total;
    let produitsHtml = produits
      .map(
        (p) =>
          `<li>${escapeHtml(p.nom)} : ${p.quantite} x ${formatNumberFC(p.prix)} FC = ${formatNumberFC(p.prix * p.quantite)} FC</li>`,
      )
      .join("");
    let totalArticles = produits.reduce((sum, p) => sum + p.quantite, 0);
    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 bg-black/50 z-50 flex items-center justify-center";
    modal.innerHTML = `<div class="bg-white rounded-xl shadow-xl max-w-md w-full mx-4"><div class="px-6 py-4 border-b"><h3 class="text-lg font-semibold">📋 Détails de la vente</h3></div><div class="p-6 space-y-2 text-sm"><p><strong>🆔 ID Vente :</strong> ${vente.id}</p>${client ? `<p><strong>👤 Client :</strong> ${escapeHtml(client.nom)} (ID: ${client.id})</p>` : ""}<p><strong>📦 Produits :</strong></p><ul class="list-disc pl-5">${produitsHtml}</ul><p><strong>📊 Total articles :</strong> ${totalArticles}</p><p><strong>💰 Total :</strong> <span class="font-bold text-emerald-600">${formatNumberFC(total)} FC</span></p><p><strong>📅 Date :</strong> ${formatDate(vente.date)}</p></div><div class="px-6 py-4 border-t flex justify-end"><button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Fermer</button></div></div>`;
    document.body.appendChild(modal);
  } catch (error) {
    showTemporaryNotification("❌ Erreur chargement détails", "error");
  }
};

function showClientInfo(clientData) {
  let infoDiv = document.getElementById("clientInfoHistorique");
  if (!infoDiv) {
    infoDiv = document.createElement("div");
    infoDiv.id = "clientInfoHistorique";
    infoDiv.className = "bg-emerald-50 p-3 rounded-lg mb-4";
    if (historiqueMessageDiv)
      historiqueMessageDiv.insertAdjacentElement("afterend", infoDiv);
  }
  infoDiv.innerHTML = `<strong>👤 Client :</strong> ${escapeHtml(clientData.nom)} (ID: ${clientData.id})<br>📞 ${escapeHtml(clientData.telephone)}`;
}
function showMessage(msg, color) {
  if (historiqueMessageDiv) {
    const colorClass =
      color === "red"
        ? "text-red-600"
        : color === "green"
          ? "text-emerald-600"
          : "text-blue-600";
    historiqueMessageDiv.innerHTML = `<span class="${colorClass}">${msg}</span>`;
  }
}
function resetDisplay() {
  if (historiqueTableBody) historiqueTableBody.innerHTML = "";
  if (historiqueTableElem) historiqueTableElem.classList.add("hidden");
  if (historiqueMessageDiv) historiqueMessageDiv.innerHTML = "";
  const infoDiv = document.getElementById("clientInfoHistorique");
  if (infoDiv) infoDiv.remove();
  const filterContainer = document.getElementById("filterContainer");
  if (filterContainer) filterContainer.remove();
  const actionButtons = document.querySelector(".action-buttons-container");
  if (actionButtons) actionButtons.remove();
}
async function afficherHistorique() {
  const clientId = historiqueClientIdElem.value.trim();
  resetDisplay();
  if (!clientId) {
    showMessage("Entrez l'ID du client", "red");
    return;
  }
  showMessage("⏳ Chargement...", "blue");
  try {
    const clientResponse = await fetch(`${CLIENTS_URL}/${String(clientId)}`);
    if (!clientResponse.ok) {
      showMessage(`❌ Client avec l'ID ${clientId} non trouvé`, "red");
      return;
    }
    const clientData = await clientResponse.json();
    currentClientData = clientData;
    showClientInfo(clientData);
    const allVentesResponse = await fetch(VENTES_URL);
    const allVentes = await allVentesResponse.json();
    const ventes = allVentes.filter(
      (v) => String(v.clientId) === String(clientId),
    );
    if (ventes.length === 0) {
      showMessage(`📭 Aucune vente pour ${clientData.nom}`, "blue");
      return;
    }
    ventesOriginales = ventes;
    displayVentesMulti(ventes, clientData);
    showMessage(`✅ ${ventes.length} vente(s) trouvée(s)`, "green");
  } catch (error) {
    showMessage("❌ Erreur de connexion", "red");
  }
}
function displayVentesMulti(ventes, clientData) {
  if (!historiqueTableBody) return;
  historiqueTableBody.innerHTML = "";
  let totalQuantite = 0;
  let totalPrix = 0;
  ventes
    .sort((a, b) => parseDate(b.date) - parseDate(a.date))
    .forEach((v, index) => {
      const venteNettoyee = nettoyerVente(v);
      const produitsListe = venteNettoyee.produits;
      const total = venteNettoyee.total;
      let quantiteTotale = produitsListe.reduce(
        (sum, p) => sum + p.quantite,
        0,
      );
      const prixMoyen = quantiteTotale > 0 ? total / quantiteTotale : 0;
      if (isNaN(total) || !isFinite(total)) return;
      const row = document.createElement("tr");
      row.className = index % 2 === 0 ? "bg-gray-50" : "";
      row.innerHTML = `<td class="px-4 py-3 text-sm">${v.id}<\/td><td class="px-4 py-3 text-sm">${afficherProduitsListe(produitsListe)}<\/td><td class="px-4 py-3 text-sm text-center">${quantiteTotale}<\/td><td class="px-4 py-3 text-sm text-right">${formatNumberFC(prixMoyen)} FC<\/td><td class="px-4 py-3 text-sm text-right font-bold text-emerald-600">${formatNumberFC(total)} FC<\/td><td class="px-4 py-3 text-sm">${formatDate(v.date)}<\/td><td class="px-4 py-3 text-sm text-center"><button onclick="window.showVenteDetail('${v.id}')" class="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 mr-1">📄 Détails</button><button onclick="genererFacturePanier(${JSON.stringify(venteNettoyee).replace(/"/g, "&quot;")}, ${JSON.stringify(clientData).replace(/"/g, "&quot;")})" class="bg-emerald-600 text-white px-2 py-1 rounded text-xs hover:bg-emerald-700">🧾 Facture</button><\/td>`;
      historiqueTableBody.appendChild(row);
      totalQuantite += quantiteTotale;
      totalPrix += total;
    });
  document.getElementById("totalQuantite").textContent = totalQuantite;
  document.getElementById("totalPrix").textContent =
    formatNumberFC(totalPrix) + " FC";
  historiqueTableElem.classList.remove("hidden");
  let filterContainer = document.getElementById("filterContainer");
  if (!filterContainer) {
    filterContainer = document.createElement("div");
    filterContainer.id = "filterContainer";
    filterContainer.className =
      "mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200";
    filterContainer.innerHTML = `<strong class="text-gray-700">🔍 Filtrer les ventes :</strong><div class="flex flex-wrap gap-3 mt-2"><label class="inline-flex items-center gap-2"><input type="radio" name="filterType" value="all" checked class="text-emerald-600"> Toutes</label><label class="inline-flex items-center gap-2"><input type="radio" name="filterType" value="today" class="text-emerald-600"> Aujourd'hui</label><label class="inline-flex items-center gap-2"><input type="radio" name="filterType" value="week" class="text-emerald-600"> Cette semaine</label><label class="inline-flex items-center gap-2"><input type="radio" name="filterType" value="month" class="text-emerald-600"> Ce mois</label><button id="applyFilterBtn" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1 rounded-lg transition text-sm">Appliquer</button></div>`;
    const historiqueContainer =
      document.getElementById("historiqueTable").parentElement;
    historiqueContainer.appendChild(filterContainer);
  }
  const applyFilterBtn = document.getElementById("applyFilterBtn");
  if (applyFilterBtn) {
    const newBtn = applyFilterBtn.cloneNode(true);
    applyFilterBtn.parentNode.replaceChild(newBtn, applyFilterBtn);
    newBtn.addEventListener("click", () => appliquerFiltre(ventes, clientData));
  }
  const existingButtons = document.querySelector(".action-buttons-container");
  if (existingButtons) existingButtons.remove();
  const actionButtons = document.createElement("div");
  actionButtons.className =
    "action-buttons-container flex gap-3 mt-4 justify-end";
  const csvBtn = document.createElement("button");
  csvBtn.className =
    "bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2";
  csvBtn.innerHTML = '<i class="fas fa-download"></i> Exporter CSV';
  csvBtn.onclick = () => exportToCSV(ventes, clientData);
  const factureMensuelleBtn = document.createElement("button");
  factureMensuelleBtn.className =
    "bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2";
  factureMensuelleBtn.innerHTML =
    '<i class="fas fa-file-invoice"></i> Facture mensuelle';
  factureMensuelleBtn.onclick = () =>
    genererFactureMensuelleMulti(ventes, clientData);
  actionButtons.appendChild(csvBtn);
  actionButtons.appendChild(factureMensuelleBtn);
  const historiqueContainer =
    document.getElementById("historiqueTable").parentElement;
  historiqueContainer.appendChild(actionButtons);
}
function appliquerFiltre(ventesOriginales, clientData) {
  const filterType = document.querySelector(
    'input[name="filterType"]:checked',
  ).value;
  const now = new Date();
  let ventesFiltrees = [...ventesOriginales];
  switch (filterType) {
    case "today":
      ventesFiltrees = ventesOriginales.filter(
        (v) => parseDate(v.date).toDateString() === now.toDateString(),
      );
      break;
    case "week":
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      ventesFiltrees = ventesOriginales.filter(
        (v) => parseDate(v.date) >= weekAgo,
      );
      break;
    case "month":
      const currentYear = now.getFullYear(),
        currentMonth = now.getMonth();
      ventesFiltrees = ventesOriginales.filter((v) => {
        const dateVente = parseDate(v.date);
        if (isNaN(dateVente.getTime())) return false;
        return (
          dateVente.getMonth() === currentMonth &&
          dateVente.getFullYear() === currentYear
        );
      });
      break;
    default:
      break;
  }
  if (ventesFiltrees.length === 0) {
    showMessage(`📭 Aucune vente trouvée pour cette période`, "blue");
    if (historiqueTableBody) historiqueTableBody.innerHTML = "";
    document.getElementById("totalQuantite").textContent = "0";
    document.getElementById("totalPrix").textContent = "0 FC";
  } else {
    historiqueTableBody.innerHTML = "";
    let totalQuantite = 0,
      totalPrix = 0;
    ventesFiltrees
      .sort((a, b) => parseDate(b.date) - parseDate(a.date))
      .forEach((v, index) => {
        const venteNettoyee = nettoyerVente(v);
        const produitsListe = venteNettoyee.produits;
        const total = venteNettoyee.total;
        let quantiteTotale = produitsListe.reduce(
          (sum, p) => sum + p.quantite,
          0,
        );
        const prixMoyen = quantiteTotale > 0 ? total / quantiteTotale : 0;
        if (isNaN(total) || !isFinite(total)) return;
        const row = document.createElement("tr");
        row.className = index % 2 === 0 ? "bg-gray-50" : "";
        row.innerHTML = `<td class="px-4 py-3 text-sm">${v.id}<\/td><td class="px-4 py-3 text-sm">${afficherProduitsListe(produitsListe)}<\/td><td class="px-4 py-3 text-sm text-center">${quantiteTotale}<\/td><td class="px-4 py-3 text-sm text-right">${formatNumberFC(prixMoyen)} FC<\/td><td class="px-4 py-3 text-sm text-right font-bold text-emerald-600">${formatNumberFC(total)} FC<\/td><td class="px-4 py-3 text-sm">${formatDate(v.date)}<\/td><td class="px-4 py-3 text-sm text-center"><button onclick="window.showVenteDetail('${v.id}')" class="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 mr-1">📄 Détails</button><button onclick="genererFacturePanier(${JSON.stringify(venteNettoyee).replace(/"/g, "&quot;")}, ${JSON.stringify(clientData).replace(/"/g, "&quot;")})" class="bg-emerald-600 text-white px-2 py-1 rounded text-xs hover:bg-emerald-700">🧾 Facture</button><\/td>`;
        historiqueTableBody.appendChild(row);
        totalQuantite += quantiteTotale;
        totalPrix += total;
      });
    document.getElementById("totalQuantite").textContent = totalQuantite;
    document.getElementById("totalPrix").textContent =
      formatNumberFC(totalPrix) + " FC";
    showMessage(
      `✅ ${ventesFiltrees.length} vente(s) trouvée(s) pour cette période`,
      "green",
    );
  }
}

// ============================================
// FACTURES
// ============================================
function genererFacturePanier(vente, client) {
  if (typeof window.jspdf === "undefined") {
    showTemporaryNotification("❌ Erreur: Bibliothèque PDF non chargée");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 20,
    rightX = pageWidth - marginX;
  const venteNettoyee = nettoyerVente(vente);
  const total = venteNettoyee.total,
    produits = venteNettoyee.produits,
    dateFacture = new Date().toLocaleString("fr-FR");
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURE", pageWidth / 2, 20, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("VentesPro SARL", marginX, 35);
  doc.text("123 Avenue du Commerce", marginX, 40);
  doc.text("Kinshasa, RDC", marginX, 45);
  doc.text("Tél: +243 XXX XXX XXX", marginX, 50);
  doc.setFontSize(9);
  doc.text(`Facture N°: ${vente.id || "N/A"}`, rightX - 40, 35, {
    align: "right",
  });
  doc.text(`Date: ${dateFacture}`, rightX - 40, 40, { align: "right" });
  doc.line(marginX, 55, rightX, 55);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Client :", marginX, 68);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(client.nom, marginX + 30, 68);
  doc.text(`Téléphone: ${client.telephone}`, marginX, 75);
  doc.text(`ID Client: ${client.id}`, marginX, 82);
  doc.line(marginX, 88, rightX, 88);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Détails des produits", marginX, 98);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Produit", marginX, 108);
  doc.text("Qté", 100, 108);
  doc.text("Prix unit.", 130, 108);
  doc.text("Total", 165, 108);
  doc.line(marginX, 110, rightX, 110);
  let yPosition = 118;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  produits.forEach((item, index) => {
    const sousTotal = item.prix * item.quantite;
    doc.text(item.nom.substring(0, 25), marginX, yPosition);
    doc.text(item.quantite.toString(), 100, yPosition);
    doc.text(`${formatNumberFC(item.prix)} FC`, 130, yPosition);
    doc.text(`${formatNumberFC(sousTotal)} FC`, 165, yPosition);
    yPosition += 7;
    if (yPosition > 250 && index < produits.length - 1) {
      doc.addPage();
      yPosition = 20;
    }
  });
  yPosition += 5;
  doc.line(marginX, yPosition, rightX, yPosition);
  yPosition += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL À PAYER :", 130, yPosition);
  doc.setFontSize(14);
  doc.setTextColor(76, 175, 80);
  doc.text(`${formatNumberFC(total)} FC`, rightX, yPosition, {
    align: "right",
  });
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Merci de votre confiance !", pageWidth / 2, 280, {
    align: "center",
  });
  doc.save(
    `facture_${client.nom.replace(/\s/g, "_")}_${vente.id || Date.now()}.pdf`,
  );
  showTemporaryNotification("✅ Facture générée !");
}
function genererFactureMensuelleMulti(ventes, client) {
  if (typeof window.jspdf === "undefined") {
    showTemporaryNotification("❌ Erreur: Bibliothèque PDF non chargée");
    return;
  }
  const maintenant = new Date();
  const moisActuel = maintenant.getMonth(),
    anneeActuelle = maintenant.getFullYear();
  const ventesDuMois = ventes.filter((v) => {
    const dateVente = parseDate(v.date);
    if (isNaN(dateVente.getTime())) return false;
    return (
      dateVente.getMonth() === moisActuel &&
      dateVente.getFullYear() === anneeActuelle
    );
  });
  if (ventesDuMois.length === 0) {
    showTemporaryNotification("❌ Aucune vente ce mois-ci");
    return;
  }
  let total = 0;
  ventesDuMois.forEach((v) => {
    const venteNettoyee = nettoyerVente(v);
    total += venteNettoyee.total;
  });
  const remise = total * 0.05,
    totalFinal = total - remise,
    dateFacture = new Date().toLocaleString("fr-FR");
  const moisTexte = maintenant.toLocaleString("fr-FR", {
    month: "long",
    year: "numeric",
  });
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth(),
    marginX = 20,
    rightX = pageWidth - marginX;
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURE MENSUELLE", pageWidth / 2, 20, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("VentesPro SARL", marginX, 35);
  doc.text("123 Avenue du Commerce", marginX, 40);
  doc.text("Kinshasa, RDC", marginX, 45);
  doc.text("Tél: +243 XXX XXX XXX", marginX, 50);
  doc.setFontSize(9);
  doc.text(`Période: ${moisTexte}`, rightX - 40, 35, { align: "right" });
  doc.text(`Date d'édition: ${dateFacture}`, rightX - 40, 40, {
    align: "right",
  });
  doc.line(marginX, 55, rightX, 55);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Client :", marginX, 68);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(client.nom, marginX + 30, 68);
  doc.text(`Téléphone: ${client.telephone}`, marginX, 75);
  doc.text(`ID Client: ${client.id}`, marginX, 82);
  doc.line(marginX, 88, rightX, 88);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Récapitulatif des achats - ${moisTexte}`, marginX, 98);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Date", marginX, 108);
  doc.text("Produits", 55, 108);
  doc.text("Total", 160, 108);
  doc.line(marginX, 110, rightX, 110);
  let yPosition = 118;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  ventesDuMois.forEach((vente, index) => {
    const venteNettoyee = nettoyerVente(vente);
    let produitsListe = venteNettoyee.produits
      .map((p) => `${p.nom}(${p.quantite})`)
      .join(", ");
    const dateStr = formatDate(vente.date);
    doc.text(dateStr.substring(0, 10), marginX, yPosition);
    doc.text(produitsListe.substring(0, 45), 55, yPosition);
    doc.text(`${formatNumberFC(venteNettoyee.total)} FC`, 160, yPosition);
    yPosition += 7;
    if (yPosition > 250 && index < ventesDuMois.length - 1) {
      doc.addPage();
      yPosition = 20;
    }
  });
  yPosition += 5;
  doc.line(marginX, yPosition, rightX, yPosition);
  yPosition += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Sous-total:", 130, yPosition);
  doc.text(`${formatNumberFC(total)} FC`, rightX, yPosition, {
    align: "right",
  });
  yPosition += 7;
  doc.text("Remise (5%):", 130, yPosition);
  doc.text(`-${formatNumberFC(remise)} FC`, rightX, yPosition, {
    align: "right",
  });
  yPosition += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL À PAYER :", 130, yPosition);
  doc.setFontSize(14);
  doc.setTextColor(76, 175, 80);
  doc.text(`${formatNumberFC(totalFinal)} FC`, rightX, yPosition, {
    align: "right",
  });
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Merci de votre confiance !", pageWidth / 2, 280, {
    align: "center",
  });
  doc.save(
    `facture_mensuelle_${client.nom.replace(/\s/g, "_")}_${moisTexte.replace(/\s/g, "_")}.pdf`,
  );
  showTemporaryNotification("✅ Facture mensuelle générée !");
}
function exportToCSV(ventes, client) {
  if (!ventes || ventes.length === 0) {
    showTemporaryNotification("Aucune donnée à exporter", "error");
    return;
  }
  let separator = ";";
  const formatField = (field) => {
    if (field === undefined || field === null) return "";
    const stringField = String(field);
    if (
      stringField.includes(separator) ||
      stringField.includes('"') ||
      stringField.includes("\n")
    )
      return `"${stringField.replace(/"/g, '""')}"`;
    return stringField;
  };
  const headers = [
    "ID Vente",
    "Produits",
    "Quantité totale",
    "Total (FC)",
    "Date",
  ].map((h) => formatField(h));
  const rows = ventes.map((v) => {
    const venteNettoyee = nettoyerVente(v);
    let produitsListe = "",
      quantiteTotale = 0;
    if (venteNettoyee.produits.length > 0) {
      produitsListe = venteNettoyee.produits
        .map((p) => `${p.nom}(${p.quantite})`)
        .join(", ");
      quantiteTotale = venteNettoyee.produits.reduce(
        (sum, p) => sum + p.quantite,
        0,
      );
    }
    return [
      v.id,
      produitsListe,
      quantiteTotale,
      formatNumberFC(venteNettoyee.total),
      formatDate(v.date),
    ].map((field) => formatField(field));
  });
  const csvContent = [headers, ...rows]
    .map((row) => row.join(separator))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `ventes_${client.nom.replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`,
  );
  link.click();
  URL.revokeObjectURL(url);
  showTemporaryNotification("📥 Export CSV effectué !");
}

// ============================================
// INITIALISATION
// ============================================
loadDashboardStats();
initGestionProduits();
initGestionClients();
showTemporaryNotification("Bienvenue sur VentesPro !");
