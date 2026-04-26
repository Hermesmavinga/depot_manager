// ============================================
// CONFIGURATION API - CORRECTION POUR LOCAL ET RENDER
// ============================================

// Détection de l'environnement
const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.protocol === "file:";

// Configuration des URLs
let API_BASE_URL;

if (isLocal) {
  // En local : json-server tourne sur le port 4000
  API_BASE_URL = "http://localhost:4000";
} else {
  // Sur Render : l'API est sur le même domaine
  API_BASE_URL = "https://depot-manager.onrender.com";
}

// URLs spécifiques
const CLIENTS_URL = `${API_BASE_URL}/clients`;
const VENTES_URL = `${API_BASE_URL}/ventes`;

console.log("🌐 Environnement:", isLocal ? "LOCAL" : "RENDER");
console.log("📡 API_BASE_URL:", API_BASE_URL);
console.log("📡 CLIENTS_URL:", CLIENTS_URL);
console.log("📡 VENTES_URL:", VENTES_URL);

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

function showNotification(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast-notification fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 ${
    type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
  }`;
  toast.innerHTML = `
    <i class="fas ${type === "success" ? "fa-check-circle" : "fa-exclamation-circle"}"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
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
  const str = Math.floor(num).toString();
  return str.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
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

if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener("click", openMobileMenu);
}

if (overlay) {
  overlay.addEventListener("click", closeMobileMenu);
}

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

    if (sections[sectionId]) {
      sections[sectionId].classList.remove("hidden");
    }

    const pageTitle = document.getElementById("currentPageTitle");
    if (pageTitle) {
      pageTitle.textContent = item.querySelector("span").textContent;
    }

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
    const ventesRes = await fetch(VENTES_URL);
    const ventes = await ventesRes.json();

    const clientsRes = await fetch(CLIENTS_URL);
    const clients = await clientsRes.json();

    const nbVentes = ventes.length;

    let quantiteTotale = 0;
    ventes.forEach((v) => {
      if (v.produits && Array.isArray(v.produits)) {
        quantiteTotale += v.produits.reduce((s, p) => s + (p.quantite || 0), 0);
      } else if (v.quantite) {
        quantiteTotale += v.quantite;
      }
    });

    document.getElementById("statVentes").textContent = nbVentes;
    document.getElementById("statQuantite").textContent = quantiteTotale;
    document.getElementById("statClients").textContent = clients.length;

    const produitsMap = new Map();
    ventes.forEach((v) => {
      if (v.produits && Array.isArray(v.produits)) {
        v.produits.forEach((p) => {
          if (!produitsMap.has(p.nom)) {
            produitsMap.set(p.nom, { nom: p.nom, quantite: 0 });
          }
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
            (p, i) => `
          <div class="flex justify-between items-center px-6 py-3 hover:bg-gray-50">
            <span class="font-medium text-gray-700"><span class="text-emerald-600 font-bold mr-2">${i + 1}.</span> ${escapeHtml(p.nom)}</span>
            <span class="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-semibold">${p.quantite} unités</span>
          </div>
        `,
          )
          .join("");
      }
    }
  } catch (error) {
    console.error("Erreur chargement dashboard:", error);
  }
}

// ============================================
// MODULE 1: TROUVER UN CLIENT
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

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Client avec l'ID ${clientId} non trouvé`);
      } else {
        throw new Error(`Erreur serveur (${response.status})`);
      }
    }

    const client = await response.json();
    displayClient(client);
  } catch (error) {
    console.error("Erreur recherche:", error);
    showError(error.message, resultDiv);
  }
}

function displayClient(client) {
  resultDiv.innerHTML = `
    <div class="border-2 border-emerald-500 rounded-lg p-4 mt-3 bg-emerald-50">
      <div class="flex justify-between items-center mb-3">
        <h3 class="font-bold text-emerald-700">✅ Client trouvé</h3>
        <button onclick="clearResult()" class="bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600 transition">✕</button>
      </div>
      <div class="space-y-1 text-sm">
        <p><strong>🆔 ID :</strong> ${client.id}</p>
        <p><strong>👤 Nom :</strong> ${escapeHtml(client.nom)}</p>
        <p><strong>📞 Téléphone :</strong> ${escapeHtml(client.telephone)}</p>
      </div>
      <div class="flex gap-2 mt-3">
        <button onclick="fillVenteForm('${client.id}')" class="bg-emerald-600 text-white px-3 py-1 rounded text-sm hover:bg-emerald-700 transition">🛒 Faire une vente</button>
        <button onclick="copyToClipboard('${client.id}')" class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition">📋 Copier l'ID</button>
      </div>
    </div>
  `;
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

// ============================================
// MODULE 2: CRÉER UN CLIENT
// ============================================

const addBtn = document.getElementById("addClientBtn");
const nomInput = document.getElementById("nom");
const telephoneInput = document.getElementById("telephone");
const messageDiv = document.getElementById("clientMessage");

if (addBtn) addBtn.addEventListener("click", addClient);
if (nomInput) {
  nomInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addClient();
    }
  });
}
if (telephoneInput) {
  telephoneInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addClient();
    }
  });
}

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

    if (!response.ok) {
      if (response.status === 400) throw new Error("Données invalides");
      else if (response.status === 409)
        throw new Error("Ce client existe peut-être déjà");
      else throw new Error(`Erreur serveur (${response.status})`);
    }

    const data = await response.json();

    messageDiv.innerHTML = `
      <div class="bg-emerald-50 border border-emerald-500 rounded-lg p-4">
        <div class="flex justify-between items-start">
          <div>
            <strong class="text-emerald-700">✅ Client ajouté avec succès !</strong>
            <div class="bg-emerald-100 rounded p-2 my-2">
              <strong>🆔 ID du client :</strong> <span class="font-bold text-emerald-700 text-lg">${data.id}</span>
            </div>
            <p><strong>👤 Nom :</strong> ${escapeHtml(nom)}</p>
            <p><strong>📞 Téléphone :</strong> ${escapeHtml(telephone)}</p>
            <div class="flex gap-2 mt-3">
              <button onclick="fillVenteFormWithId('${data.id}')" class="bg-emerald-600 text-white px-3 py-1 rounded text-sm hover:bg-emerald-700 transition">🛒 Faire une vente</button>
              <button onclick="copyToClipboard('${data.id}')" class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition">📋 Copier l'ID</button>
            </div>
          </div>
          <button onclick="this.parentElement.parentElement.remove()" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>
      </div>
    `;

    nomInput.value = "";
    telephoneInput.value = "";
    nomInput.focus();

    showTemporaryNotification("✅ Client créé avec succès !");
    loadDashboardStats();
  } catch (error) {
    console.error("Erreur création client:", error);
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

// ============================================
// FONCTION COPIER ID
// ============================================

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text.toString());
    showCopyNotification("✅ ID copié !");
  } catch (err) {
    console.error("Erreur de copie:", err);
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

// ============================================
// MODULE 3: PANIER ET VENTE
// ============================================

let panier = [];

const venteBtn = document.getElementById("addVenteBtn");
const clientInput = document.getElementById("venteClientId");
const clientInfoDiv = document.getElementById("clientInfo");
const message = document.getElementById("venteMessage");
const produitSelect = document.getElementById("produit");
const quantiteInput = document.getElementById("quantite");
const prixInput = document.getElementById("prix");
const ajouterPanierBtn = document.getElementById("ajouterPanierBtn");

let totalDisplay = null;

function initTotalDisplay() {
  totalDisplay = document.createElement("p");
  totalDisplay.id = "totalDisplay";
  totalDisplay.className = "mt-3 text-right font-bold text-emerald-600";
  if (prixInput) prixInput.insertAdjacentElement("afterend", totalDisplay);
}

function updateTotal() {
  const quantite = parseFloat(quantiteInput?.value) || 0;
  const prix = parseFloat(prixInput?.value) || 0;
  const total = quantite * prix;
  if (totalDisplay) {
    if (quantite > 0 && prix > 0) {
      totalDisplay.innerHTML = `💰 Total : ${formatNumberFC(total)} FC`;
    } else {
      totalDisplay.innerHTML = "";
    }
  }
}

if (quantiteInput) quantiteInput.addEventListener("input", updateTotal);
if (prixInput) prixInput.addEventListener("input", updateTotal);
initTotalDisplay();

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
    if (clientInfoDiv) {
      clientInfoDiv.innerHTML = `<div class="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm">✅ <strong>${escapeHtml(data.nom)}</strong><br>📞 ${data.telephone || "N/A"}<br>🆔 ${data.id}</div>`;
    }
  } catch (error) {
    if (clientInfoDiv)
      clientInfoDiv.innerHTML = `<span class="text-red-600 text-sm">❌ Erreur connexion</span>`;
  }
}

function ajouterAuPanier() {
  const produitValue = produitSelect.value;
  const quantite = Number(quantiteInput.value);
  const prix = Number(prixInput.value);

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

    html += `
      <div class="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100">
        <div class="flex-1">
          <span class="inline-block px-2 py-0.5 rounded text-xs font-medium ${typeClass} mr-2">${typeLabel}</span>
          <span class="font-medium">${escapeHtml(item.nom)}</span>
          <div class="text-sm text-gray-500">${item.quantite} x ${formatNumberFC(item.prix)} FC</div>
        </div>
        <div class="text-right">
          <div class="font-bold text-emerald-600">${formatNumberFC(sousTotal)} FC</div>
          <button onclick="supprimerDuPanier(${index})" class="text-red-500 hover:text-red-700 text-sm mt-1">❌ Supprimer</button>
        </div>
      </div>
    `;
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

function afficherProduitsHtml(produits) {
  if (!produits || produits.length === 0) return "Aucun produit";
  return produits
    .map(
      (p) =>
        `&nbsp;&nbsp;• ${escapeHtml(p.nom)} : ${p.quantite} x ${formatNumberFC(p.prix)} FC = ${formatNumberFC(p.prix * p.quantite)} FC<br>`,
    )
    .join("");
}

if (ajouterPanierBtn)
  ajouterPanierBtn.addEventListener("click", ajouterAuPanier);
if (venteBtn) venteBtn.addEventListener("click", addVente);
if (clientInput) {
  clientInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      afficherClient();
    }
  });
}

// ============================================
// MODULE 4: HISTORIQUE
// ============================================

const showHistoriqueBtn = document.getElementById("showHistoriqueBtn");
const historiqueClientId = document.getElementById("historiqueClientId");
const historiqueMessage = document.getElementById("historiqueMessage");
const historiqueTable = document.getElementById("historiqueTable");
const historiqueTableBody = document.getElementById("historiqueTableBody");

let currentClientId = null;
let ventesOriginales = [];
let currentClientData = null;

if (showHistoriqueBtn)
  showHistoriqueBtn.addEventListener("click", afficherHistorique);
if (historiqueClientId) {
  historiqueClientId.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      afficherHistorique();
    }
  });
}

function showClientInfo(clientData) {
  let infoDiv = document.getElementById("clientInfoHistorique");
  if (!infoDiv) {
    infoDiv = document.createElement("div");
    infoDiv.id = "clientInfoHistorique";
    infoDiv.className = "bg-emerald-50 p-3 rounded-lg mb-4";
    if (historiqueMessage)
      historiqueMessage.insertAdjacentElement("afterend", infoDiv);
  }
  infoDiv.innerHTML = `<strong>👤 Client :</strong> ${escapeHtml(clientData.nom)} (ID: ${clientData.id})<br>📞 ${escapeHtml(clientData.telephone)}`;
}

function showMessage(msg, color) {
  if (historiqueMessage) {
    const colorClass =
      color === "red"
        ? "text-red-600"
        : color === "green"
          ? "text-emerald-600"
          : "text-blue-600";
    historiqueMessage.innerHTML = `<span class="${colorClass}">${msg}</span>`;
  }
}

function resetDisplay() {
  if (historiqueTableBody) historiqueTableBody.innerHTML = "";
  if (historiqueTable) historiqueTable.classList.add("hidden");
  if (historiqueMessage) historiqueMessage.innerHTML = "";
  const infoDiv = document.getElementById("clientInfoHistorique");
  if (infoDiv) infoDiv.remove();
  const filterContainer = document.getElementById("filterContainer");
  if (filterContainer) filterContainer.remove();
  const actionButtons = document.querySelector(".action-buttons-container");
  if (actionButtons) actionButtons.remove();
}

async function afficherHistorique() {
  const clientId = historiqueClientId.value.trim();
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
    currentClientId = clientId;
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
    console.error("Erreur historique:", error);
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

      row.innerHTML = `
      <td class="px-4 py-3 text-sm">${v.id}</td>
      <td class="px-4 py-3 text-sm">${afficherProduitsListe(produitsListe)}</td>
      <td class="px-4 py-3 text-sm text-center">${quantiteTotale}</td>
      <td class="px-4 py-3 text-sm text-right">${formatNumberFC(prixMoyen)} FC</td>
      <td class="px-4 py-3 text-sm text-right font-bold text-emerald-600">${formatNumberFC(total)} FC</td>
      <td class="px-4 py-3 text-sm">${formatDate(v.date)}</tr>
      <td class="px-4 py-3 text-sm text-center">
        <button onclick="showVenteDetails(${v.id})" class="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition mr-1">📄 Détails</button>
        <button onclick="genererFacturePanier(venteNettoyee, clientData)" class="bg-emerald-600 text-white px-2 py-1 rounded text-xs hover:bg-emerald-700 transition">🧾 Facture</button>
      </td>
    `;
      historiqueTableBody.appendChild(row);

      totalQuantite += quantiteTotale;
      totalPrix += total;
    });

  document.getElementById("totalQuantite").textContent = totalQuantite;
  document.getElementById("totalPrix").textContent =
    formatNumberFC(totalPrix) + " FC";
  historiqueTable.classList.remove("hidden");

  // Ajouter les filtres
  let filterContainer = document.getElementById("filterContainer");
  if (!filterContainer) {
    filterContainer = document.createElement("div");
    filterContainer.id = "filterContainer";
    filterContainer.className =
      "mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200";
    filterContainer.innerHTML = `
      <strong class="text-gray-700">🔍 Filtrer les ventes :</strong>
      <div class="flex flex-wrap gap-3 mt-2">
        <label class="inline-flex items-center gap-2">
          <input type="radio" name="filterType" value="all" checked class="text-emerald-600"> Toutes
        </label>
        <label class="inline-flex items-center gap-2">
          <input type="radio" name="filterType" value="today" class="text-emerald-600"> Aujourd'hui
        </label>
        <label class="inline-flex items-center gap-2">
          <input type="radio" name="filterType" value="week" class="text-emerald-600"> Cette semaine
        </label>
        <label class="inline-flex items-center gap-2">
          <input type="radio" name="filterType" value="month" class="text-emerald-600"> Ce mois
        </label>
        <button id="applyFilterBtn" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1 rounded-lg transition text-sm">Appliquer</button>
      </div>
    `;
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

  // Ajouter les boutons CSV et Facture mensuelle
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
      ventesFiltrees = ventesOriginales.filter((v) => {
        const dateVente = parseDate(v.date);
        return dateVente.toDateString() === now.toDateString();
      });
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
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
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
    let totalQuantite = 0;
    let totalPrix = 0;

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
        row.innerHTML = `
        <td class="px-4 py-3 text-sm">${v.id}</td>
        <td class="px-4 py-3 text-sm">${afficherProduitsListe(produitsListe)}</td>
        <td class="px-4 py-3 text-sm text-center">${quantiteTotale}</td>
        <td class="px-4 py-3 text-sm text-right">${formatNumberFC(prixMoyen)} FC</td>
        <td class="px-4 py-3 text-sm text-right font-bold text-emerald-600">${formatNumberFC(total)} FC</td>
        <td class="px-4 py-3 text-sm">${formatDate(v.date)}</td>
        <td class="px-4 py-3 text-sm text-center">
          <button onclick="showVenteDetails(${v.id})" class="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition mr-1">📄 Détails</button>
          <button onclick="genererFacturePanier(venteNettoyee, clientData)" class="bg-emerald-600 text-white px-2 py-1 rounded text-xs hover:bg-emerald-700 transition">🧾 Facture</button>
        </td>
      `;
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

async function showVenteDetails(venteId) {
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
    modal.innerHTML = `
      <div class="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div class="px-6 py-4 border-b">
          <h3 class="text-lg font-semibold">📋 Détails de la vente</h3>
        </div>
        <div class="p-6 space-y-2 text-sm">
          <p><strong>🆔 ID Vente :</strong> ${vente.id}</p>
          ${client ? `<p><strong>👤 Client :</strong> ${escapeHtml(client.nom)} (ID: ${client.id})</p>` : ""}
          <p><strong>📦 Produits :</strong></p>
          <ul class="list-disc pl-5">${produitsHtml}</ul>
          <p><strong>📊 Total articles :</strong> ${totalArticles}</p>
          <p><strong>💰 Total :</strong> <span class="font-bold text-emerald-600">${formatNumberFC(total)} FC</span></p>
          <p><strong>📅 Date :</strong> ${formatDate(vente.date)}</p>
        </div>
        <div class="px-6 py-4 border-t flex justify-end">
          <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">Fermer</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } catch (error) {
    showTemporaryNotification("❌ Erreur chargement détails", "error");
  }
}

// ============================================
// EXPORT CSV
// ============================================

function exportToCSV(ventes, client) {
  if (!ventes || ventes.length === 0) {
    showTemporaryNotification("Aucune donnée à exporter", "error");
    return;
  }

  let separator = ";";

  function formatField(field) {
    if (field === undefined || field === null) return "";
    const stringField = String(field);
    if (
      stringField.includes(separator) ||
      stringField.includes('"') ||
      stringField.includes("\n")
    ) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
  }

  const headers = [
    "ID Vente",
    "Produits",
    "Quantité totale",
    "Total (FC)",
    "Date",
  ].map((h) => formatField(h));

  const rows = ventes.map((v) => {
    const venteNettoyee = nettoyerVente(v);
    let produitsListe = "";
    let quantiteTotale = 0;

    if (venteNettoyee.produits.length > 0) {
      produitsListe = venteNettoyee.produits
        .map((p) => `${p.nom}(${p.quantite})`)
        .join(", ");
      quantiteTotale = venteNettoyee.produits.reduce(
        (sum, p) => sum + p.quantite,
        0,
      );
    }

    const row = [
      v.id,
      produitsListe,
      quantiteTotale,
      formatNumberFC(venteNettoyee.total),
      formatDate(v.date),
    ].map((field) => formatField(field));

    return row;
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
// FACTURE MENSUELLE
// ============================================

function genererFactureMensuelleMulti(ventes, client) {
  if (typeof window.jspdf === "undefined") {
    showTemporaryNotification("❌ Erreur: Bibliothèque PDF non chargée");
    return;
  }

  const maintenant = new Date();
  const moisActuel = maintenant.getMonth();
  const anneeActuelle = maintenant.getFullYear();

  const ventesDuMois = ventes.filter((vente) => {
    const dateVente = parseDate(vente.date);
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
  ventesDuMois.forEach((vente) => {
    const venteNettoyee = nettoyerVente(vente);
    total += venteNettoyee.total;
  });

  const remise = total * 0.05;
  const totalFinal = total - remise;
  const dateFacture = new Date().toLocaleString("fr-FR");
  const moisTexte = maintenant.toLocaleString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 20;
  const rightX = pageWidth - marginX;

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

// ============================================
// FACTURE SIMPLE
// ============================================

function genererFacturePanier(vente, client) {
  if (typeof window.jspdf === "undefined") {
    showTemporaryNotification("❌ Erreur: Bibliothèque PDF non chargée");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 20;
  const rightX = pageWidth - marginX;

  const venteNettoyee = nettoyerVente(vente);
  const total = venteNettoyee.total;
  const produits = venteNettoyee.produits;
  const dateFacture = new Date().toLocaleString("fr-FR");

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
  doc.text(`Facture N°: ${vente.id}`, rightX - 40, 35, { align: "right" });
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

  doc.save(`facture_${client.nom.replace(/\s/g, "_")}_${vente.id}.pdf`);
  showTemporaryNotification("✅ Facture générée !");
}

// ============================================
// MODULE 5: GESTION DES PRODUITS
// ============================================

const PRODUITS_STORAGE_KEY = "ventes_pro_produits_v2";

let produits = {
  BRACONGO: {
    bouteille: {
      "NGOK (33cl)": { prix: 25000, format: "33cl", unite: "bouteille" },
      "NGOK (50cl)": { prix: 35000, format: "50cl", unite: "bouteille" },
      "DOGMO (33cl)": { prix: 22000, format: "33cl", unite: "bouteille" },
      "DOGMO (50cl)": { prix: 32000, format: "50cl", unite: "bouteille" },
      "TURBO KING (33cl)": { prix: 28000, format: "33cl", unite: "bouteille" },
      "BREEZE (33cl)": { prix: 20000, format: "33cl", unite: "bouteille" },
    },
    cassier: {
      "NGOK (33cl)": {
        prixCassier: 550000,
        prixUnitaire: 22917,
        format: "33cl",
        quantite: 24,
      },
      "NGOK (50cl)": {
        prixCassier: 780000,
        prixUnitaire: 32500,
        format: "50cl",
        quantite: 24,
      },
      "DOGMO (33cl)": {
        prixCassier: 480000,
        prixUnitaire: 20000,
        format: "33cl",
        quantite: 24,
      },
      "DOGMO (50cl)": {
        prixCassier: 700000,
        prixUnitaire: 29167,
        format: "50cl",
        quantite: 24,
      },
    },
  },
  BRALIMA: {
    bouteille: {
      "XXL (30cl)": { prix: 30000, format: "30cl", unite: "bouteille" },
      "NKOY (65cl)": { prix: 37000, format: "65cl", unite: "bouteille" },
      "33 EXPORT (65cl)": { prix: 40000, format: "65cl", unite: "bouteille" },
      "TEMBO (65cl)": { prix: 47000, format: "65cl", unite: "bouteille" },
      "CASTEL (50cl)": { prix: 53500, format: "50cl", unite: "bouteille" },
      "Beaufort (50cl)": { prix: 53500, format: "50cl", unite: "bouteille" },
      "Nkoy Black (50cl)": { prix: 44000, format: "50cl", unite: "bouteille" },
      "Doppel (50cl)": { prix: 48000, format: "50cl", unite: "bouteille" },
    },
    cassier: {
      "XXL (30cl)": {
        prixCassier: 650000,
        prixUnitaire: 27083,
        format: "30cl",
        quantite: 24,
      },
      "NKOY (65cl)": {
        prixCassier: 850000,
        prixUnitaire: 35417,
        format: "65cl",
        quantite: 24,
      },
      "33 EXPORT (65cl)": {
        prixCassier: 920000,
        prixUnitaire: 38333,
        format: "65cl",
        quantite: 24,
      },
      "TEMBO (65cl)": {
        prixCassier: 1080000,
        prixUnitaire: 45000,
        format: "65cl",
        quantite: 24,
      },
    },
  },
};

let currentFournisseur = "BRACONGO";
let currentType = "bouteille";
let produitEnEdition = null;

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
const prixBouteilleGroup = document.getElementById("prixBouteilleGroup");
const prixCassierGroup = document.getElementById("prixCassierGroup");
const produitFournisseurSelect = document.getElementById("produitFournisseur");
const modalSaveBtn = document.getElementById("modalSaveBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");

function initFournisseurTabs() {
  if (tabBracongo)
    tabBracongo.addEventListener("click", () =>
      setActiveFournisseur("BRACONGO"),
    );
  if (tabBralima)
    tabBralima.addEventListener("click", () => setActiveFournisseur("BRALIMA"));
}

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
      if (bracongoBouteilleContainer)
        bracongoBouteilleContainer.style.display = "block";
      if (bracongoCassierContainer)
        bracongoCassierContainer.style.display = "none";
    } else {
      bracongoCassierTab.classList.add("active");
      bracongoBouteilleTab.classList.remove("active");
      if (bracongoBouteilleContainer)
        bracongoBouteilleContainer.style.display = "none";
      if (bracongoCassierContainer)
        bracongoCassierContainer.style.display = "block";
    }
  }
  if (fournisseur === "BRALIMA" && bralimaBouteilleTab && bralimaCassierTab) {
    if (type === "bouteille") {
      bralimaBouteilleTab.classList.add("active");
      bralimaCassierTab.classList.remove("active");
      if (bralimaBouteilleContainer)
        bralimaBouteilleContainer.style.display = "block";
      if (bralimaCassierContainer)
        bralimaCassierContainer.style.display = "none";
    } else {
      bralimaCassierTab.classList.add("active");
      bralimaBouteilleTab.classList.remove("active");
      if (bralimaBouteilleContainer)
        bralimaBouteilleContainer.style.display = "none";
      if (bralimaCassierContainer)
        bralimaCassierContainer.style.display = "block";
    }
  }
}

function initTypeChangeListener() {
  if (produitTypeSelect) {
    produitTypeSelect.addEventListener("change", () => {
      const isCassier = produitTypeSelect.value === "cassier";
      if (prixBouteilleGroup)
        prixBouteilleGroup.style.display = isCassier ? "none" : "block";
      if (prixCassierGroup)
        prixCassierGroup.style.display = isCassier ? "block" : "none";
    });
  }
}

function mettreAJourSelecteurProduits() {
  const selectProduit = document.getElementById("produit");
  if (!selectProduit) return;

  const selectedValue = selectProduit.value;
  selectProduit.innerHTML =
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
  selectProduit.appendChild(bracongoBouteilleGroup);

  const bracongoCassierGroup = document.createElement("optgroup");
  bracongoCassierGroup.label = "🍺 BRACONGO - Cassiers (24 bouteilles)";
  Object.entries(produits.BRACONGO.cassier).forEach(([nom, data]) => {
    const option = document.createElement("option");
    option.value = `cassier|${nom}`;
    option.textContent = `${nom} (${data.format}) - ${formatNumberFC(data.prixCassier)} FC le cassier`;
    if (`cassier|${nom}` === selectedValue) option.selected = true;
    bracongoCassierGroup.appendChild(option);
  });
  selectProduit.appendChild(bracongoCassierGroup);

  const bralimaBouteilleGroup = document.createElement("optgroup");
  bralimaBouteilleGroup.label = "🍻 BRALIMA - Bouteilles";
  Object.entries(produits.BRALIMA.bouteille).forEach(([nom, data]) => {
    const option = document.createElement("option");
    option.value = `bouteille|${nom}`;
    option.textContent = `${nom} (${data.format}) - ${formatNumberFC(data.prix)} FC`;
    if (`bouteille|${nom}` === selectedValue) option.selected = true;
    bralimaBouteilleGroup.appendChild(option);
  });
  selectProduit.appendChild(bralimaBouteilleGroup);

  const bralimaCassierGroup = document.createElement("optgroup");
  bralimaCassierGroup.label = "🍻 BRALIMA - Cassiers (24 bouteilles)";
  Object.entries(produits.BRALIMA.cassier).forEach(([nom, data]) => {
    const option = document.createElement("option");
    option.value = `cassier|${nom}`;
    option.textContent = `${nom} (${data.format}) - ${formatNumberFC(data.prixCassier)} FC le cassier`;
    if (`cassier|${nom}` === selectedValue) option.selected = true;
    bralimaCassierGroup.appendChild(option);
  });
  selectProduit.appendChild(bralimaCassierGroup);

  updatePrix();
}

function updatePrix() {
  const produitSelect = document.getElementById("produit");
  const prixInput = document.getElementById("prix");
  if (!produitSelect || !prixInput) return;

  const value = produitSelect.value;
  if (!value || value === "") {
    prixInput.value = "";
    updateTotal();
    return;
  }

  const [type, nom] = value.split("|");
  if (type === "bouteille") {
    if (produits.BRACONGO.bouteille[nom])
      prixInput.value = produits.BRACONGO.bouteille[nom].prix;
    else if (produits.BRALIMA.bouteille[nom])
      prixInput.value = produits.BRALIMA.bouteille[nom].prix;
    else prixInput.value = "";
  } else if (type === "cassier") {
    if (produits.BRACONGO.cassier[nom])
      prixInput.value = produits.BRACONGO.cassier[nom].prixCassier;
    else if (produits.BRALIMA.cassier[nom])
      prixInput.value = produits.BRALIMA.cassier[nom].prixCassier;
    else prixInput.value = "";
  } else {
    prixInput.value = "";
  }
  updateTotal();
}

function afficherListeProduits() {
  if (bracongoBouteilleBody) {
    bracongoBouteilleBody.innerHTML = "";
    Object.entries(produits.BRACONGO.bouteille).forEach(([nom, data]) => {
      const tr = document.createElement("tr");
      tr.className = "border-b border-gray-100 hover:bg-gray-50";
      tr.innerHTML = `
        <td class="px-4 py-3">${escapeHtml(nom)}</td>
        <td class="px-4 py-3">${data.format}</td>
        <td class="px-4 py-3 text-right">${formatNumberFC(data.prix)} FC</td>
        <td class="px-4 py-3 text-right">-</td>
        <td class="px-4 py-3 text-center">
          <button class="btn-edit-bracongo-bouteille text-blue-600 hover:text-blue-800 mr-2" data-nom="${escapeHtml(nom)}"><i class="fas fa-edit"></i></button>
          <button class="btn-delete-bracongo-bouteille text-red-600 hover:text-red-800" data-nom="${escapeHtml(nom)}"><i class="fas fa-trash"></i></button>
        </td>
      `;
      bracongoBouteilleBody.appendChild(tr);
    });
  }

  if (bracongoCassierBody) {
    bracongoCassierBody.innerHTML = "";
    Object.entries(produits.BRACONGO.cassier).forEach(([nom, data]) => {
      const tr = document.createElement("tr");
      tr.className = "border-b border-gray-100 hover:bg-gray-50";
      tr.innerHTML = `
        <td class="px-4 py-3">${escapeHtml(nom)}</td>
        <td class="px-4 py-3">${data.format}</td>
        <td class="px-4 py-3 text-right">${formatNumberFC(data.prixCassier)} FC</td>
        <td class="px-4 py-3 text-right">${formatNumberFC(data.prixUnitaire)} FC</td>
        <td class="px-4 py-3 text-center">
          <button class="btn-edit-bracongo-cassier text-blue-600 hover:text-blue-800 mr-2" data-nom="${escapeHtml(nom)}"><i class="fas fa-edit"></i></button>
          <button class="btn-delete-bracongo-cassier text-red-600 hover:text-red-800" data-nom="${escapeHtml(nom)}"><i class="fas fa-trash"></i></button>
        </td>
      `;
      bracongoCassierBody.appendChild(tr);
    });
  }

  if (bralimaBouteilleBody) {
    bralimaBouteilleBody.innerHTML = "";
    Object.entries(produits.BRALIMA.bouteille).forEach(([nom, data]) => {
      const tr = document.createElement("tr");
      tr.className = "border-b border-gray-100 hover:bg-gray-50";
      tr.innerHTML = `
        <td class="px-4 py-3">${escapeHtml(nom)}</td>
        <td class="px-4 py-3">${data.format}</td>
        <td class="px-4 py-3 text-right">${formatNumberFC(data.prix)} FC</td>
        <td class="px-4 py-3 text-right">-</td>
        <td class="px-4 py-3 text-center">
          <button class="btn-edit-bralima-bouteille text-blue-600 hover:text-blue-800 mr-2" data-nom="${escapeHtml(nom)}"><i class="fas fa-edit"></i></button>
          <button class="btn-delete-bralima-bouteille text-red-600 hover:text-red-800" data-nom="${escapeHtml(nom)}"><i class="fas fa-trash"></i></button>
        </td>
      `;
      bralimaBouteilleBody.appendChild(tr);
    });
  }

  if (bralimaCassierBody) {
    bralimaCassierBody.innerHTML = "";
    Object.entries(produits.BRALIMA.cassier).forEach(([nom, data]) => {
      const tr = document.createElement("tr");
      tr.className = "border-b border-gray-100 hover:bg-gray-50";
      tr.innerHTML = `
        <td class="px-4 py-3">${escapeHtml(nom)}</td>
        <td class="px-4 py-3">${data.format}</td>
        <td class="px-4 py-3 text-right">${formatNumberFC(data.prixCassier)} FC</td>
        <td class="px-4 py-3 text-right">${formatNumberFC(data.prixUnitaire)} FC</td>
        <td class="px-4 py-3 text-center">
          <button class="btn-edit-bralima-cassier text-blue-600 hover:text-blue-800 mr-2" data-nom="${escapeHtml(nom)}"><i class="fas fa-edit"></i></button>
          <button class="btn-delete-bralima-cassier text-red-600 hover:text-red-800" data-nom="${escapeHtml(nom)}"><i class="fas fa-trash"></i></button>
        </td>
      `;
      bralimaCassierBody.appendChild(tr);
    });
  }

  document.querySelectorAll(".btn-edit-bracongo-bouteille").forEach((btn) => {
    btn.addEventListener("click", () =>
      ouvrirModalEdition("BRACONGO", "bouteille", btn.dataset.nom),
    );
  });
  document.querySelectorAll(".btn-delete-bracongo-bouteille").forEach((btn) => {
    btn.addEventListener("click", () =>
      supprimerProduit("BRACONGO", "bouteille", btn.dataset.nom),
    );
  });
  document.querySelectorAll(".btn-edit-bracongo-cassier").forEach((btn) => {
    btn.addEventListener("click", () =>
      ouvrirModalEdition("BRACONGO", "cassier", btn.dataset.nom),
    );
  });
  document.querySelectorAll(".btn-delete-bracongo-cassier").forEach((btn) => {
    btn.addEventListener("click", () =>
      supprimerProduit("BRACONGO", "cassier", btn.dataset.nom),
    );
  });
  document.querySelectorAll(".btn-edit-bralima-bouteille").forEach((btn) => {
    btn.addEventListener("click", () =>
      ouvrirModalEdition("BRALIMA", "bouteille", btn.dataset.nom),
    );
  });
  document.querySelectorAll(".btn-delete-bralima-bouteille").forEach((btn) => {
    btn.addEventListener("click", () =>
      supprimerProduit("BRALIMA", "bouteille", btn.dataset.nom),
    );
  });
  document.querySelectorAll(".btn-edit-bralima-cassier").forEach((btn) => {
    btn.addEventListener("click", () =>
      ouvrirModalEdition("BRALIMA", "cassier", btn.dataset.nom),
    );
  });
  document.querySelectorAll(".btn-delete-bralima-cassier").forEach((btn) => {
    btn.addEventListener("click", () =>
      supprimerProduit("BRALIMA", "cassier", btn.dataset.nom),
    );
  });
}

function ouvrirModalAjout() {
  produitEnEdition = null;
  modalTitle.textContent = "Ajouter un produit";
  produitNomInput.value = "";
  produitFormatInput.value = "";
  produitTypeSelect.value = "bouteille";
  produitPrixInput.value = "";
  produitPrixCassierInput.value = "";
  produitFournisseurSelect.value = currentFournisseur;
  prixBouteilleGroup.style.display = "block";
  prixCassierGroup.style.display = "none";
  produitModal.classList.remove("hidden");
  produitModal.classList.add("flex");
}

function ouvrirModalEdition(fournisseur, type, nom) {
  produitEnEdition = { fournisseur, type, nom };
  modalTitle.textContent = `Modifier : ${nom}`;
  produitNomInput.value = nom;
  produitTypeSelect.value = type;
  produitFournisseurSelect.value = fournisseur;

  if (type === "bouteille") {
    const data = produits[fournisseur].bouteille[nom];
    produitFormatInput.value = data.format || "";
    produitPrixInput.value = data.prix;
    prixBouteilleGroup.style.display = "block";
    prixCassierGroup.style.display = "none";
  } else {
    const data = produits[fournisseur].cassier[nom];
    produitFormatInput.value = data.format || "";
    produitPrixCassierInput.value = data.prixCassier;
    prixBouteilleGroup.style.display = "none";
    prixCassierGroup.style.display = "block";
  }
  produitModal.classList.remove("hidden");
  produitModal.classList.add("flex");
}

function fermerModal() {
  produitModal.classList.add("hidden");
  produitModal.classList.remove("flex");
  produitEnEdition = null;
}

function sauvegarderProduit() {
  const nom = produitNomInput.value.trim();
  const format = produitFormatInput.value.trim();
  const type = produitTypeSelect.value;
  const fournisseur = produitFournisseurSelect.value;

  if (!nom) {
    showTemporaryNotification("❌ Veuillez entrer un nom", "error");
    return;
  }

  if (produitEnEdition) {
    const {
      fournisseur: oldFournisseur,
      type: oldType,
      nom: oldNom,
    } = produitEnEdition;
    delete produits[oldFournisseur][oldType][oldNom];

    if (type === "bouteille") {
      const prix = parseFloat(produitPrixInput.value);
      if (isNaN(prix) || prix <= 0) {
        showTemporaryNotification("❌ Prix invalide", "error");
        return;
      }
      produits[fournisseur].bouteille[nom] = {
        prix: prix,
        format: format,
        unite: "bouteille",
      };
    } else {
      const prixCassier = parseFloat(produitPrixCassierInput.value);
      if (isNaN(prixCassier) || prixCassier <= 0) {
        showTemporaryNotification("❌ Prix invalide", "error");
        return;
      }
      const prixUnitaire = Math.round(prixCassier / 24);
      produits[fournisseur].cassier[nom] = {
        prixCassier: prixCassier,
        prixUnitaire: prixUnitaire,
        format: format,
        quantite: 24,
      };
    }
  } else {
    if (type === "bouteille") {
      const prix = parseFloat(produitPrixInput.value);
      if (isNaN(prix) || prix <= 0) {
        showTemporaryNotification("❌ Prix invalide", "error");
        return;
      }
      if (produits[fournisseur].bouteille[nom]) {
        showTemporaryNotification(`❌ "${nom}" existe déjà`, "error");
        return;
      }
      produits[fournisseur].bouteille[nom] = {
        prix: prix,
        format: format,
        unite: "bouteille",
      };
    } else {
      const prixCassier = parseFloat(produitPrixCassierInput.value);
      if (isNaN(prixCassier) || prixCassier <= 0) {
        showTemporaryNotification("❌ Prix invalide", "error");
        return;
      }
      if (produits[fournisseur].cassier[nom]) {
        showTemporaryNotification(`❌ "${nom}" existe déjà`, "error");
        return;
      }
      const prixUnitaire = Math.round(prixCassier / 24);
      produits[fournisseur].cassier[nom] = {
        prixCassier: prixCassier,
        prixUnitaire: prixUnitaire,
        format: format,
        quantite: 24,
      };
    }
  }

  sauvegarderProduits();
  mettreAJourSelecteurProduits();
  afficherListeProduits();
  fermerModal();
  showTemporaryNotification(`✅ Produit "${nom}" sauvegardé !`);
}

function supprimerProduit(fournisseur, type, nom) {
  if (confirm(`⚠️ Supprimer "${nom}" ?`)) {
    delete produits[fournisseur][type][nom];
    sauvegarderProduits();
    mettreAJourSelecteurProduits();
    afficherListeProduits();
    panier = panier.filter((item) => item.nom !== nom);
    afficherPanier();
    showTemporaryNotification(`✅ "${nom}" supprimé`);
  }
}

function sauvegarderProduits() {
  localStorage.setItem(PRODUITS_STORAGE_KEY, JSON.stringify(produits));
}

function chargerProduits() {
  const saved = localStorage.getItem(PRODUITS_STORAGE_KEY);
  if (saved) {
    try {
      const savedProduits = JSON.parse(saved);
      if (savedProduits.BRACONGO && savedProduits.BRACONGO.bouteille)
        produits = savedProduits;
    } catch (e) {}
  }
}

function initGestionProduits() {
  chargerProduits();
  initFournisseurTabs();
  initTypeTabs();
  initTypeChangeListener();
  mettreAJourSelecteurProduits();
  afficherListeProduits();

  const addProductBtn = document.getElementById("ajouterProduitBtn");
  if (addProductBtn) addProductBtn.addEventListener("click", ouvrirModalAjout);
  if (modalSaveBtn) modalSaveBtn.addEventListener("click", sauvegarderProduit);
  if (modalCancelBtn) modalCancelBtn.addEventListener("click", fermerModal);
  if (produitModal) {
    produitModal.addEventListener("click", (e) => {
      if (e.target === produitModal) fermerModal();
    });
  }
  if (produitSelect) produitSelect.addEventListener("change", updatePrix);
}

// Initialisation
loadDashboardStats();
initGestionProduits();
showTemporaryNotification("Bienvenue sur VentesPro !");
