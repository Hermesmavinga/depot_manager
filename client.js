// ============================================
// FONCTIONS UTILITAIRES
// ============================================

function showNotification(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = "toast-notification";
  toast.innerHTML = `
    <i class="fas ${type === "success" ? "fa-check-circle" : "fa-exclamation-circle"}" style="color: ${type === "success" ? "#4CAF50" : "#f44336"}"></i>
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

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const sectionId = item.dataset.section;

    navItems.forEach((nav) => nav.classList.remove("active"));
    item.classList.add("active");

    Object.values(sections).forEach((section) => {
      if (section) section.classList.remove("active-section");
    });

    if (sections[sectionId]) {
      sections[sectionId].classList.add("active-section");
    }

    document.getElementById("currentPageTitle").textContent =
      item.querySelector("span").textContent;
  });
});

document.getElementById("currentDate").textContent =
  new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const sidebar = document.getElementById("sidebar");

if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });
}

// ============================================
// DASHBOARD STATS
// ============================================

async function loadDashboardStats() {
  try {
    const ventesRes = await fetch("http://localhost:4000/ventes");
    const ventes = await ventesRes.json();

    const clientsRes = await fetch("http://localhost:4000/clients");
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

    // Top produits
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
          '<div class="empty-state"><i class="fas fa-chart-simple"></i><p>Aucune donnée</p></div>';
      } else {
        topProduitsDiv.innerHTML = topProduits
          .map(
            (p, i) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #eee;">
              <span><strong>${i + 1}.</strong> ${escapeHtml(p.nom)}</span>
              <span style="background: #4CAF50; color: white; padding: 4px 12px; border-radius: 20px; font-weight: bold;">${p.quantite} unités</span>
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

const API_URL = "http://localhost:4000/clients";

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
    const response = await fetch(`${API_URL}/${String(clientId)}`);

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
    <div style="border:2px solid #4CAF50; padding:15px; margin-top:10px; border-radius:8px; background:#f9f9f9;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <h3 style="margin:0; color:#4CAF50;">✅ Client trouvé</h3>
        <button onclick="clearResult()" 
                style="background:#ff4444; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:5px;">
          ✕
        </button>
      </div>
      <table style="width:100%; border-collapse:collapse;">
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:10px 0;"><strong>🆔 ID :</strong> <td style="padding:10px 0;">${client.id}
        </tr>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:10px 0;"><strong>👤 Nom :</strong> <td style="padding:10px 0;">${escapeHtml(client.nom)}
        </tr>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:10px 0;"><strong>📞 Téléphone :</strong> <td style="padding:10px 0;">${escapeHtml(client.telephone)}
        </tr>
      </table>
      <div style="margin-top:15px; padding-top:10px; border-top:1px solid #eee;">
        <button onclick="fillVenteForm('${client.id}')" 
                style="background:#4CAF50; color:white; border:none; padding:8px 15px; cursor:pointer; border-radius:5px;">
          🛒 Faire une vente
        </button>
        <button onclick="copyToClipboard('${client.id}')" 
                style="background:#2196F3; color:white; border:none; padding:8px 15px; cursor:pointer; border-radius:5px; margin-left:10px;">
          📋 Copier l'ID
        </button>
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
    document
      .querySelector("h2:last-of-type")
      ?.scrollIntoView({ behavior: "smooth" });
    showTemporaryMessage("✅ ID client pré-rempli !", "venteMessage");
  }
}

function showLoading(container) {
  container.innerHTML = `<div style="border:1px solid #2196F3; padding:10px; margin-top:10px; border-radius:5px; background:#e3f2fd;"><span style="color:#2196F3;">⏳ Recherche en cours...</span></div>`;
}

function showError(message, container) {
  container.innerHTML = `<div style="border:1px solid #ff4444; padding:10px; margin-top:10px; border-radius:5px; background:#ffebee;"><span style="color:#ff4444;">❌ ${message}</span></div>`;
  setTimeout(() => {
    if (container.innerHTML.includes(message)) container.innerHTML = "";
  }, 5000);
}

function showTemporaryMessage(message, elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    const originalContent = element.innerHTML;
    element.innerHTML = `<span style="color:green;">${message}</span>`;
    setTimeout(() => {
      if (element.innerHTML === `<span style="color:green;">${message}</span>`)
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
clearButton.style.marginLeft = "10px";
clearButton.style.background = "#666";
clearButton.style.color = "white";
clearButton.style.border = "none";
clearButton.style.padding = "5px 10px";
clearButton.style.cursor = "pointer";
clearButton.style.borderRadius = "5px";
clearButton.addEventListener("click", () => {
  if (clientIdInput) clientIdInput.value = "";
  if (resultDiv) resultDiv.innerHTML = "";
  if (clientIdInput) clientIdInput.focus();
});
if (button) button.insertAdjacentElement("afterend", clearButton);

let searchHistory = JSON.parse(
  localStorage.getItem("clientSearchHistory") || "[]",
);
function addToHistory(clientId) {
  if (!searchHistory.includes(clientId) && clientId) {
    searchHistory.unshift(clientId);
    searchHistory = searchHistory.slice(0, 5);
    localStorage.setItem("clientSearchHistory", JSON.stringify(searchHistory));
    updateHistoryDisplay();
  }
}
function updateHistoryDisplay() {
  let historyDiv = document.getElementById("searchHistory");
  if (!historyDiv && resultDiv) {
    historyDiv = document.createElement("div");
    historyDiv.id = "searchHistory";
    historyDiv.style.marginTop = "10px";
    resultDiv.insertAdjacentElement("afterend", historyDiv);
  }
  if (historyDiv && searchHistory.length > 0) {
    historyDiv.innerHTML = `<div style="margin-top:10px; padding:10px; background:#f5f5f5; border-radius:5px;"><strong>📜 Recherches récentes :</strong><br>${searchHistory.map((id) => `<button onclick="document.getElementById('clientId').value='${id}'; searchClient();" style="margin:5px; padding:5px 10px; background:#2196F3; color:white; border:none; border-radius:3px; cursor:pointer;">ID ${id}</button>`).join("")}</div>`;
  }
}
const originalDisplayClient = displayClient;
displayClient = function (client) {
  originalDisplayClient(client);
  addToHistory(client.id);
};
updateHistoryDisplay();

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
    const response = await fetch("http://localhost:4000/clients", {
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
    const messageId = "successClient_" + Date.now();

    messageDiv.innerHTML = `
      <div id="${messageId}" style="color:green; border:2px solid #4CAF50; padding:15px; background:#f0fff0; border-radius:8px; margin-top:10px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div style="flex:1;">
            <strong style="font-size:16px;">✅ Client ajouté avec succès !</strong><br><br>
            <div style="background:#e8f5e9; padding:10px; border-radius:5px; margin:10px 0;">
              <strong>🆔 ID du client :</strong> <span style="font-size:20px; font-weight:bold; color:#4CAF50;">${data.id}</span>
            </div>
            <table style="width:100%; border-collapse:collapse;">
              <tr style="border-bottom:1px solid #ddd;"><td style="padding:8px 0;"><strong>👤 Nom :</strong> <td style="padding:8px 0;">${escapeHtml(nom)}</td></tr>
              <tr style="border-bottom:1px solid #ddd;"><td style="padding:8px 0;"><strong>📞 Téléphone :</strong> <td style="padding:8px 0;">${escapeHtml(telephone)}</td></tr>
             </table>
            <div style="margin-top:15px; padding-top:10px; border-top:1px solid #ddd;">
              <button onclick="fillVenteFormWithId('${data.id}')" style="background:#4CAF50; color:white; border:none; padding:8px 15px; cursor:pointer; border-radius:5px; margin-right:10px;">🛒 Faire une vente</button>
              <button onclick="copyToClipboard('${data.id}')" style="background:#2196F3; color:white; border:none; padding:8px 15px; cursor:pointer; border-radius:5px;">📋 Copier l'ID</button>
            </div>
          </div>
          <button onclick="document.getElementById('${messageId}').remove()" style="background:#ff4444; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:5px; font-size:16px;">✕</button>
        </div>
      </div>
    `;

    nomInput.value = "";
    telephoneInput.value = "";
    nomInput.focus();

    showTemporaryNotification("✅ Client créé avec succès !");
    loadDashboardStats();

    setTimeout(() => {
      const clientsNavItem = document.querySelector(
        '.nav-item[data-section="clients"]',
      );
      if (clientsNavItem) {
        clientsNavItem.click();
      }
    }, 100);
  } catch (error) {
    console.error("Erreur création client:", error);
    showErrorMessage(`Erreur lors de l'ajout : ${error.message}`, messageDiv);
  }
}

function showErrorMessage(message, container) {
  const errorId = "error_" + Date.now();
  container.innerHTML = `<div id="${errorId}" style="color:red; border:2px solid #ff4444; padding:10px; background:#ffebee; border-radius:5px; margin-top:10px;"><div style="display:flex; justify-content:space-between; align-items:center;"><span>❌ ${message}</span><button onclick="document.getElementById('${errorId}').remove()" style="background:#ff4444; color:white; border:none; padding:3px 8px; cursor:pointer; border-radius:3px;">✕</button></div></div>`;
  setTimeout(() => {
    const errorElement = document.getElementById(errorId);
    if (errorElement) errorElement.remove();
  }, 5000);
}

function showLoadingMessage(container) {
  container.innerHTML = `<div style="color:blue; border:1px solid #2196F3; padding:10px; background:#e3f2fd; border-radius:5px; margin-top:10px;">⏳ Création en cours...</div>`;
}

function fillVenteFormWithId(clientId) {
  const venteClientInput = document.getElementById("venteClientId");
  if (venteClientInput) {
    venteClientInput.value = clientId;
    const event = new Event("input", { bubbles: true });
    venteClientInput.dispatchEvent(event);
    const venteSection = document.querySelector("h2:last-of-type");
    if (venteSection) venteSection.scrollIntoView({ behavior: "smooth" });
    showTemporaryNotification("✅ ID client pré-rempli !");
  }
}

// ============================================
// FONCTION COPIER ID
// ============================================

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text.toString());
    showCopyNotification("✅ ID copié dans le presse-papier !");
  } catch (err) {
    console.error("Erreur de copie (méthode moderne):", err);

    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      showCopyNotification("✅ ID copié !");
    } catch (err2) {
      console.error("Erreur de copie (méthode secours):", err2);
      showCopyNotification("❌ Impossible de copier l'ID", "error");
    }
  }
}

function showCopyNotification(message, type = "success") {
  const notification = document.createElement("div");
  notification.style.position = "fixed";
  notification.style.bottom = "20px";
  notification.style.right = "20px";
  notification.style.backgroundColor =
    type === "success" ? "#4CAF50" : "#ff4444";
  notification.style.color = "white";
  notification.style.padding = "12px 20px";
  notification.style.borderRadius = "5px";
  notification.style.zIndex = "9999";
  notification.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
  notification.style.fontSize = "14px";
  notification.style.fontWeight = "bold";
  notification.innerHTML = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transform = "translateX(100px)";
    notification.style.transition = "all 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

const testButton = document.createElement("button");
testButton.textContent = "🔧 Téléphone test";
testButton.style.marginLeft = "10px";
testButton.style.background = "#FF9800";
testButton.style.color = "white";
testButton.style.border = "none";
testButton.style.padding = "5px 10px";
testButton.style.cursor = "pointer";
testButton.style.borderRadius = "5px";
testButton.addEventListener("click", () => {
  const randomPhone = `06${Math.floor(Math.random() * 100000000)
    .toString()
    .padStart(8, "0")}`;
  if (telephoneInput) telephoneInput.value = randomPhone;
});
if (addBtn) addBtn.insertAdjacentElement("afterend", testButton);

// ============================================
// MODULE 3: PANIER ET VENTE MULTI-PRODUITS
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

let updatePrixFunction = null;

const totalDisplay = document.createElement("p");
totalDisplay.id = "totalDisplay";
totalDisplay.style.marginTop = "10px";
totalDisplay.style.fontWeight = "bold";
if (prixInput) prixInput.insertAdjacentElement("afterend", totalDisplay);

function updateTotal() {
  const quantite = parseFloat(quantiteInput.value) || 0;
  const prix = parseFloat(prixInput.value) || 0;
  const total = quantite * prix;
  if (totalDisplay) {
    if (quantite > 0 && prix > 0)
      totalDisplay.innerHTML = `<span style="color: #4CAF50;">💰 Total : ${formatNumberFC(total)} FC</span>`;
    else totalDisplay.innerHTML = "";
  }
}

if (quantiteInput) quantiteInput.addEventListener("input", updateTotal);
if (prixInput) prixInput.addEventListener("input", updateTotal);

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
    const response = await fetch(
      `http://localhost:4000/clients/${String(clientId)}`,
    );
    if (!response.ok) {
      if (clientInfoDiv)
        clientInfoDiv.innerHTML = `<span style="color:red; background:#ffebee; padding:5px 10px; border-radius:5px; display:inline-block;">❌ Client introuvable (ID: ${clientId})</span>`;
      return;
    }
    const data = await response.json();
    if (clientInfoDiv) {
      clientInfoDiv.innerHTML = `<div style="color:green; background:#e8f5e9; padding:8px 12px; border-radius:5px; border-left:4px solid #4CAF50;">✅ <strong>Client trouvé !</strong><br>👤 Nom : <strong>${data.nom}</strong><br>📞 Téléphone : ${data.telephone || "Non renseigné"}<br>🆔 ID : ${data.id}</div>`;
    }
  } catch (error) {
    if (clientInfoDiv)
      clientInfoDiv.innerHTML = `<span style="color:red; background:#ffebee; padding:5px 10px; border-radius:5px;">❌ Erreur de connexion au serveur</span>`;
    console.error("Erreur recherche client:", error);
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

  panier.push({
    nom: produitNom,
    quantite: quantite,
    prix: prix,
    type: produitValue.split("|")[0] || "bouteille",
  });

  afficherPanier();

  quantiteInput.value = "1";
  updateTotal();

  showTemporaryNotification(`✅ ${produitNom} ajouté au panier !`);
}

function afficherPanier() {
  let panierDiv = document.getElementById("panier");

  if (!panierDiv) {
    panierDiv = document.createElement("div");
    panierDiv.id = "panier";
    panierDiv.style.marginTop = "15px";
    panierDiv.style.padding = "10px";
    panierDiv.style.border = "1px solid #ddd";
    panierDiv.style.borderRadius = "5px";
    panierDiv.style.backgroundColor = "#f9f9f9";
    if (prixInput) prixInput.insertAdjacentElement("afterend", panierDiv);
  }

  if (panier.length === 0) {
    panierDiv.innerHTML = "";
    return;
  }

  let total = 0;
  let html = "<h4 style='margin:0 0 10px 0;'>🛒 Panier :</h4>";
  html += "<div style='max-height:200px; overflow-y:auto;'>";

  panier.forEach((item, index) => {
    const sousTotal = item.prix * item.quantite;
    total += sousTotal;
    const typeLabel = item.type === "cassier" ? "📦 Cassier" : "🍾 Bouteille";

    html += `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:5px; border-bottom:1px solid #eee;">
        <span><span class="type-badge ${item.type === "cassier" ? "cassier" : "bouteille"}">${typeLabel}</span> <strong>${escapeHtml(item.nom)}</strong> - ${item.quantite} x ${formatNumberFC(item.prix)} FC = ${formatNumberFC(sousTotal)} FC</span>
        <button onclick="supprimerDuPanier(${index})" style="background:#ff4444; color:white; border:none; padding:3px 8px; cursor:pointer; border-radius:3px;">
          ❌
        </button>
      </div>
    `;
  });

  html += "</div>";
  html += `<div style="margin-top:10px; padding-top:10px; border-top:2px solid #ddd; text-align:right;">
            <strong>Total panier : ${formatNumberFC(total)} FC</strong>
           </div>`;

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

  message.innerHTML = `<div style="color:blue; border:1px solid blue; padding:10px; background:#e3f2fd; border-radius:5px;">⏳ Enregistrement en cours...</div>`;

  try {
    const clientResponse = await fetch(
      `http://localhost:4000/clients/${String(clientId)}`,
    );
    if (!clientResponse.ok) {
      message.innerHTML = `<div style="color:red; border:1px solid red; padding:10px; background:#ffebee; border-radius:5px;">❌ Client introuvable (ID: ${clientId})</div>`;
      return;
    }
    const clientData = await clientResponse.json();

    const total = panier.reduce((sum, item) => {
      return sum + item.prix * item.quantite;
    }, 0);

    const response = await fetch("http://localhost:4000/ventes", {
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

    const messageId = "successVente_" + Date.now();
    const dateAffichage = new Date(data.date).toLocaleString();

    message.innerHTML = `<div id="${messageId}" style="color:green; border:2px solid green; padding:15px; background:#f0fff0; border-radius:8px; margin-top:10px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div style="flex:1;">
          <strong style="font-size:18px;">✅ Vente enregistrée avec succès !</strong><br><br>
          <strong>🧾 ID Vente :</strong> ${data.id}<br>
          <strong>👤 Client :</strong> ${clientData.nom} (ID: ${clientData.id})<br>
          <strong>📦 Produits :</strong><br>
          ${afficherProduitsHtml(data.produits)}
          <strong>💰 Total :</strong> <strong style="color:#4CAF50;">${formatNumberFC(total)} FC</strong><br>
          <strong>🕒 Date :</strong> ${dateAffichage}
        </div>
        <button onclick="document.getElementById('${messageId}').remove()" 
                style="background:#ff4444; color:white; border:none; padding:8px 12px; cursor:pointer; border-radius:5px; font-size:16px;">
          ✕
        </button>
      </div>
    </div>`;

    clientInput.focus();
    loadDashboardStats();
  } catch (error) {
    message.innerHTML = `<div style="color:red; border:1px solid red; padding:10px; background:#ffebee; border-radius:5px;">❌ Erreur lors de la vente : ${error.message}</div>`;
    console.error("Erreur vente:", error);
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

if (ajouterPanierBtn) {
  ajouterPanierBtn.addEventListener("click", ajouterAuPanier);
}
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
// MODULE 4: HISTORIQUE DES VENTES
// ============================================

const showHistoriqueBtn = document.getElementById("showHistoriqueBtn");
const historiqueClientId = document.getElementById("historiqueClientId");
const historiqueMessage = document.getElementById("historiqueMessage");
const historiqueTable = document.getElementById("historiqueTable");
let tbody = historiqueTable ? historiqueTable.querySelector("tbody") : null;

if (historiqueTable && !tbody) {
  tbody = document.createElement("tbody");
  historiqueTable.appendChild(tbody);
}

let currentClientId = null;
let ventesOriginales = [];

const filterContainer = document.createElement("div");
filterContainer.style.marginTop = "10px";
filterContainer.style.marginBottom = "10px";
filterContainer.style.padding = "10px";
filterContainer.style.backgroundColor = "#f5f5f5";
filterContainer.style.borderRadius = "5px";
filterContainer.style.display = "none";
filterContainer.id = "filterContainer";
filterContainer.innerHTML = `
  <strong>🔍 Filtrer les ventes :</strong><br>
  <label style="margin-right: 10px;"><input type="radio" name="filterType" value="all" checked> Toutes</label>
  <label style="margin-right: 10px;"><input type="radio" name="filterType" value="today"> Aujourd'hui</label>
  <label style="margin-right: 10px;"><input type="radio" name="filterType" value="week"> Cette semaine</label>
  <label style="margin-right: 10px;"><input type="radio" name="filterType" value="month"> Ce mois</label>
  <button id="applyFilterBtn" style="margin-left: 10px; padding: 5px 10px; background: #2196F3; color: white; border: none; border-radius: 3px; cursor: pointer;">Appliquer</button>
`;
if (historiqueTable)
  historiqueTable.insertAdjacentElement("afterend", filterContainer);

const exportBtn = document.createElement("button");
exportBtn.textContent = "📥 Exporter en CSV";
exportBtn.style.marginLeft = "10px";
exportBtn.style.background = "#FF9800";
exportBtn.style.color = "white";
exportBtn.style.border = "none";
exportBtn.style.padding = "8px 15px";
exportBtn.style.cursor = "pointer";
exportBtn.style.borderRadius = "5px";
if (showHistoriqueBtn)
  showHistoriqueBtn.insertAdjacentElement("afterend", exportBtn);

const factureMensuelleBtn = document.createElement("button");
factureMensuelleBtn.textContent = "🧾 Facture mensuelle";
factureMensuelleBtn.style.marginLeft = "10px";
factureMensuelleBtn.style.background = "#9C27B0";
factureMensuelleBtn.style.color = "white";
factureMensuelleBtn.style.border = "none";
factureMensuelleBtn.style.padding = "8px 15px";
factureMensuelleBtn.style.cursor = "pointer";
factureMensuelleBtn.style.borderRadius = "5px";
factureMensuelleBtn.addEventListener("click", () => {
  if (ventesOriginales && ventesOriginales.length > 0 && currentClientId) {
    fetch(`http://localhost:4000/clients/${currentClientId}`)
      .then((res) => res.json())
      .then((client) => {
        genererFactureMensuelleMulti(ventesOriginales, client);
      });
  } else {
    showTemporaryNotification("❌ Aucune vente trouvée pour ce client");
  }
});
if (showHistoriqueBtn)
  showHistoriqueBtn.insertAdjacentElement("afterend", factureMensuelleBtn);

if (showHistoriqueBtn)
  showHistoriqueBtn.addEventListener("click", afficherHistorique);
if (exportBtn) exportBtn.addEventListener("click", exportToCSV);
if (historiqueClientId) {
  historiqueClientId.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      afficherHistorique();
    }
  });
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
      .filter((p) => {
        return (
          p &&
          p.nom &&
          typeof p.quantite === "number" &&
          typeof p.prix === "number" &&
          !isNaN(p.prix) &&
          p.prix > 0
        );
      })
      .map((p) => ({
        nom: p.nom,
        quantite: p.quantite,
        prix: p.prix,
      }));

    if (produitsListe.length > 0) {
      total = produitsListe.reduce((sum, p) => sum + p.prix * p.quantite, 0);
    }
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
      {
        nom: "Produit (données manquantes)",
        quantite: 1,
        prix: total,
      },
    ];
  }

  return { produits: produitsListe, total: total };
}

function afficherProduitsListe(produits) {
  if (!produits || produits.length === 0) return "Aucun produit";
  return `
    <ul style="margin: 0; padding-left: 20px; text-align: left;">
      ${produits
        .map(
          (p) => `
        <li style="margin: 2px 0;">${escapeHtml(p.nom)} - ${p.quantite} x ${formatNumberFC(p.prix)} FC</li>
      `,
        )
        .join("")}
    </ul>
  `;
}

async function afficherHistorique() {
  const clientId = historiqueClientId.value.trim();

  resetDisplay();

  if (!clientId) {
    showMessage("Entrez l'ID du client", "red");
    return;
  }

  showMessage("⏳ Chargement de l'historique...", "blue");

  try {
    const clientIdStr = String(clientId);

    const clientResponse = await fetch(
      `http://localhost:4000/clients/${clientIdStr}`,
    );

    if (!clientResponse.ok) {
      if (clientResponse.status === 404) {
        showMessage(`❌ Client avec l'ID ${clientId} non trouvé`, "red");
      } else {
        showMessage(`❌ Erreur serveur (${clientResponse.status})`, "red");
      }
      return;
    }

    const clientData = await clientResponse.json();
    currentClientId = clientId;

    showClientInfo(clientData);

    let ventes = [];

    try {
      const allVentesResponse = await fetch(`http://localhost:4000/ventes`);
      const allVentes = await allVentesResponse.json();

      ventes = allVentes.filter((v) => String(v.clientId) === clientIdStr);
    } catch (error) {
      console.error("Erreur lors de la récupération des ventes:", error);
      ventes = [];
    }

    if (ventes.length === 0) {
      showMessage(
        `📭 Aucune vente trouvée pour ${clientData.nom} (ID: ${clientId})`,
        "blue",
      );
      filterContainer.style.display = "none";
      calculerTotalMensuelMulti(ventes);
      return;
    }

    ventesOriginales = ventes;

    displayVentesMulti(ventes, clientData);
    filterContainer.style.display = "block";

    const applyFilterBtn = document.getElementById("applyFilterBtn");
    if (applyFilterBtn) {
      const newBtn = applyFilterBtn.cloneNode(true);
      applyFilterBtn.parentNode.replaceChild(newBtn, applyFilterBtn);
      newBtn.addEventListener("click", () =>
        appliquerFiltreMulti(ventes, clientData),
      );
    }
  } catch (error) {
    console.error("Erreur historique:", error);
    showMessage(
      "❌ Erreur lors de la récupération des ventes. Vérifiez votre connexion.",
      "red",
    );
    filterContainer.style.display = "none";
  }
}

function displayVentesMulti(ventes, clientData) {
  if (!tbody && historiqueTable) {
    tbody = historiqueTable.querySelector("tbody");
    if (!tbody) {
      tbody = document.createElement("tbody");
      historiqueTable.appendChild(tbody);
    }
  }

  if (tbody) tbody.innerHTML = "";
  let totalQuantite = 0;
  let totalPrix = 0;

  const ventesTriees = [...ventes].sort(
    (a, b) => parseDate(b.date) - parseDate(a.date),
  );

  ventesTriees.forEach((v, index) => {
    const venteNettoyee = nettoyerVente(v);
    const produitsListe = venteNettoyee.produits;
    const total = venteNettoyee.total;

    let quantiteTotale = produitsListe.reduce((sum, p) => sum + p.quantite, 0);
    const prixMoyen = quantiteTotale > 0 ? total / quantiteTotale : 0;

    if (isNaN(total) || !isFinite(total)) {
      console.warn(`Vente ${v.id} a un total invalide, ignorée`);
      return;
    }

    const tr = document.createElement("tr");
    tr.style.borderBottom = "1px solid #ddd";

    if (index % 2 === 0) tr.style.backgroundColor = "#f9f9f9";

    const btnDetailsId = `details_btn_${v.id}_${Date.now()}_${index}`;
    const btnFactureId = `facture_btn_${v.id}_${Date.now()}_${index}`;

    tr.innerHTML = `
      <td style="padding: 8px; text-align: center;">${v.id}</td>
      <td style="padding: 8px; text-align: left;">${afficherProduitsListe(produitsListe)}</td>
      <td style="padding: 8px; text-align: center;">${quantiteTotale}</td>
      <td style="padding: 8px; text-align: right;">${formatNumberFC(prixMoyen)} FC</td>
      <td style="padding: 8px; text-align: right; font-weight: bold; color: #4CAF50;">
        ${formatNumberFC(total)} FC
       </td>
      <td style="padding: 8px;">${formatDate(v.date)}</td>
      <td style="padding: 8px; text-align: center;">
        <button id="${btnDetailsId}" style="background: #2196F3; color: white; border: none; padding: 5px 8px; cursor: pointer; border-radius: 3px; font-size: 11px;">
          📄 Détails
        </button>
        <button id="${btnFactureId}" style="background: #4CAF50; color: white; border: none; padding: 5px 8px; cursor: pointer; border-radius: 3px; font-size: 11px; margin-left: 3px;">
          🧾 Facture
        </button>
        </td>
    `;

    if (tbody) tbody.appendChild(tr);

    const detailsBtn = document.getElementById(btnDetailsId);
    if (detailsBtn) {
      detailsBtn.addEventListener("click", () => {
        showVenteDetailsMulti(v.id);
      });
    }

    const factureBtn = document.getElementById(btnFactureId);
    if (factureBtn) {
      factureBtn.addEventListener("click", () => {
        genererFacturePanier(venteNettoyee, clientData);
      });
    }

    totalQuantite += quantiteTotale;
    totalPrix += total;
  });

  const totalQuantiteSpan = document.getElementById("totalQuantite");
  const totalPrixSpan = document.getElementById("totalPrix");

  if (totalQuantiteSpan) totalQuantiteSpan.textContent = totalQuantite;
  if (totalPrixSpan)
    totalPrixSpan.textContent = formatNumberFC(totalPrix) + " FC";

  if (historiqueTable) historiqueTable.style.display = "table";

  calculerTotalMensuelMulti(ventes);

  showMessage(
    `✅ ${ventes.length} vente(s) trouvée(s) pour <strong>${escapeHtml(clientData.nom)}</strong>`,
    "green",
  );
}

function appliquerFiltreMulti(ventesOriginales, clientData) {
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
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      ventesFiltrees = ventesOriginales.filter((v) => {
        const vDate = parseDate(v.date);
        if (isNaN(vDate.getTime())) return false;
        return (
          vDate.getMonth() === currentMonth &&
          vDate.getFullYear() === currentYear
        );
      });
      break;
    default:
      break;
  }

  if (ventesFiltrees.length === 0) {
    showMessage(`📭 Aucune vente trouvée pour cette période`, "blue");
    if (tbody) tbody.innerHTML = "";
    const totalQuantiteSpan = document.getElementById("totalQuantite");
    const totalPrixSpan = document.getElementById("totalPrix");
    if (totalQuantiteSpan) totalQuantiteSpan.textContent = "0";
    if (totalPrixSpan) totalPrixSpan.textContent = "0 FC";
    if (historiqueTable) historiqueTable.style.display = "table";
    calculerTotalMensuelMulti([]);
  } else {
    displayVentesMulti(ventesFiltrees, clientData);
    showMessage(
      `✅ ${ventesFiltrees.length} vente(s) trouvée(s) pour cette période`,
      "green",
    );
  }
}

function showClientInfo(clientData) {
  let infoDiv = document.getElementById("clientInfoHistorique");

  if (!infoDiv) {
    infoDiv = document.createElement("div");
    infoDiv.id = "clientInfoHistorique";
    infoDiv.style.marginTop = "10px";
    infoDiv.style.marginBottom = "10px";
    infoDiv.style.padding = "10px";
    infoDiv.style.backgroundColor = "#e8f5e9";
    infoDiv.style.borderRadius = "5px";
    infoDiv.style.borderLeft = "4px solid #4CAF50";
    if (historiqueMessage)
      historiqueMessage.insertAdjacentElement("afterend", infoDiv);
  }

  infoDiv.innerHTML = `
    <strong>👤 Client sélectionné :</strong><br>
    🆔 ID: ${clientData.id}<br>
    📛 Nom: ${escapeHtml(clientData.nom)}<br>
    📞 Téléphone: ${escapeHtml(clientData.telephone)}
  `;
}

async function showVenteDetailsMulti(venteId) {
  try {
    showMessage("⏳ Chargement des détails...", "blue");
    const response = await fetch(`http://localhost:4000/ventes/${venteId}`);
    if (!response.ok) throw new Error("Vente non trouvée");
    const vente = await response.json();

    const existingModal = document.getElementById("venteDetails");
    const existingOverlay = document.getElementById("overlay");
    if (existingModal) existingModal.remove();
    if (existingOverlay) existingOverlay.remove();

    let clientInfo = "";
    try {
      const clientResponse = await fetch(
        `http://localhost:4000/clients/${String(vente.clientId)}`,
      );
      if (clientResponse.ok) {
        const client = await clientResponse.json();
        clientInfo = `<p><strong>👤 Client :</strong> ${escapeHtml(client.nom)} (ID: ${client.id})</p>`;
      }
    } catch (e) {
      console.error("Erreur récupération client:", e);
    }

    const venteNettoyee = nettoyerVente(vente);
    const produits = venteNettoyee.produits;
    const total = venteNettoyee.total;

    let produitsHtml =
      "<p><strong>📦 Produits :</strong></p><ul style='margin-top: 0;'>";
    let totalArticles = 0;

    produits.forEach((p) => {
      produitsHtml += `<li>${escapeHtml(p.nom)} : ${p.quantite} x ${formatNumberFC(p.prix)} FC = ${formatNumberFC(p.prix * p.quantite)} FC</li>`;
      totalArticles += p.quantite;
    });
    produitsHtml += "</ul>";

    const detailsHtml = `
      <div id="venteDetails" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 25px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 1000; max-width: 500px; width: 90%;">
        <h3 style="margin-top: 0; color: #4CAF50;">📋 Détails de la vente</h3>
        <hr>
        <p><strong>🆔 ID Vente :</strong> ${vente.id}</p>
        ${clientInfo}
        ${produitsHtml}
        <p><strong>📊 Nombre total d'articles :</strong> ${totalArticles}</p>
        <p><strong>💰 Total :</strong> <strong style="color: #4CAF50;">${formatNumberFC(total)} FC</strong></p>
        <p><strong>📅 Date :</strong> ${formatDate(vente.date)}</p>
        <hr>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button id="closeDetailsBtn" style="background: #4CAF50; color: white; border: none; padding: 8px 20px; cursor: pointer; border-radius: 5px;">Fermer</button>
        </div>
      </div>
      <div id="overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 999;"></div>
    `;
    document.body.insertAdjacentHTML("beforeend", detailsHtml);

    const overlay = document.getElementById("overlay");
    if (overlay) {
      overlay.addEventListener("click", function () {
        const modal = document.getElementById("venteDetails");
        if (modal) modal.remove();
        overlay.remove();
      });
    }

    const closeBtn = document.getElementById("closeDetailsBtn");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        const modal = document.getElementById("venteDetails");
        const overlayElem = document.getElementById("overlay");
        if (modal) modal.remove();
        if (overlayElem) overlayElem.remove();
      });
    }

    const escapeHandler = function (e) {
      if (e.key === "Escape") {
        const modal = document.getElementById("venteDetails");
        const overlayElem = document.getElementById("overlay");
        if (modal) modal.remove();
        if (overlayElem) overlayElem.remove();
        document.removeEventListener("keydown", escapeHandler);
      }
    };
    document.addEventListener("keydown", escapeHandler);

    if (
      historiqueMessage &&
      historiqueMessage.innerHTML.includes("Chargement des détails")
    )
      historiqueMessage.innerHTML = "";
  } catch (error) {
    console.error("Erreur chargement détails:", error);
    showMessage("❌ Erreur lors du chargement des détails de la vente", "red");
  }
}

function showMessage(msg, color) {
  if (historiqueMessage) {
    historiqueMessage.innerHTML = `<span style='color:${color};'>${msg}</span>`;
    if (
      !msg.includes("✅") &&
      !msg.includes("❌") &&
      !msg.includes("📭") &&
      !msg.includes("Chargement")
    ) {
      setTimeout(() => {
        if (
          historiqueMessage.innerHTML ===
          `<span style='color:${color};'>${msg}</span>`
        )
          historiqueMessage.innerHTML = "";
      }, 5000);
    }
  }
}

function resetDisplay() {
  if (tbody) tbody.innerHTML = "";

  const totalQuantiteSpan = document.getElementById("totalQuantite");
  const totalPrixSpan = document.getElementById("totalPrix");

  if (totalQuantiteSpan) totalQuantiteSpan.textContent = "0";
  if (totalPrixSpan) totalPrixSpan.textContent = "0 FC";

  if (historiqueTable) historiqueTable.style.display = "none";
  if (historiqueMessage) historiqueMessage.innerHTML = "";

  const existingInfo = document.getElementById("clientInfoHistorique");
  if (existingInfo) existingInfo.remove();

  const existingModal = document.getElementById("venteDetails");
  const existingOverlay = document.getElementById("overlay");
  if (existingModal) existingModal.remove();
  if (existingOverlay) existingOverlay.remove();
}

// ============================================
// MODULE 5: TOTAL MENSUEL
// ============================================

function calculerTotalMensuelMulti(ventes) {
  console.log("Calcul du total mensuel avec", ventes.length, "ventes");

  if (!ventes || ventes.length === 0) {
    updateOrCreateMonthlyTotalDisplay(0, 0, 0, new Date());
    return { totalMensuel: 0, remise: 0, totalFinal: 0 };
  }

  const datesVentes = ventes
    .map((v) => parseDate(v.date))
    .filter((d) => !isNaN(d.getTime()));

  if (datesVentes.length === 0) {
    updateOrCreateMonthlyTotalDisplay(0, 0, 0, new Date());
    return { totalMensuel: 0, remise: 0, totalFinal: 0 };
  }

  datesVentes.sort((a, b) => b - a);
  const moisReference = datesVentes[0];

  const ventesDuMois = ventes.filter((vente) => {
    if (!vente.date) return false;
    const dateVente = parseDate(vente.date);
    if (isNaN(dateVente.getTime())) return false;
    return (
      dateVente.getMonth() === moisReference.getMonth() &&
      dateVente.getFullYear() === moisReference.getFullYear()
    );
  });

  const totalMensuel = ventesDuMois.reduce((sum, vente) => {
    const venteNettoyee = nettoyerVente(vente);
    return sum + venteNettoyee.total;
  }, 0);

  const remise = totalMensuel * 0.05;
  const totalFinal = totalMensuel - remise;

  updateOrCreateMonthlyTotalDisplay(
    totalMensuel,
    remise,
    totalFinal,
    moisReference,
  );

  return { totalMensuel, remise, totalFinal };
}

function updateOrCreateMonthlyTotalDisplay(
  totalMensuel,
  remise,
  totalFinal,
  dateReference,
) {
  let monthlyTotalContainer = document.getElementById("monthlyTotalContainer");

  let moisTexte = "";
  if (dateReference && !isNaN(dateReference.getTime())) {
    moisTexte = dateReference.toLocaleString("fr-FR", {
      month: "long",
      year: "numeric",
    });
  } else {
    moisTexte = new Date().toLocaleString("fr-FR", {
      month: "long",
      year: "numeric",
    });
  }

  if (!monthlyTotalContainer) {
    monthlyTotalContainer = document.createElement("div");
    monthlyTotalContainer.id = "monthlyTotalContainer";
    monthlyTotalContainer.style.marginTop = "20px";
    monthlyTotalContainer.style.padding = "15px";
    monthlyTotalContainer.style.backgroundColor = "#f0f8ff";
    monthlyTotalContainer.style.borderRadius = "8px";
    monthlyTotalContainer.style.border = "1px solid #ddd";
    monthlyTotalContainer.style.borderLeft = "4px solid #4CAF50";

    const historiqueTable = document.getElementById("historiqueTable");
    if (historiqueTable) {
      historiqueTable.insertAdjacentElement("afterend", monthlyTotalContainer);
    }
  }

  monthlyTotalContainer.innerHTML = `
    <h4 style="margin: 0 0 10px 0; color: #333;">📊 Total mensuel (${moisTexte})</h4>
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <div style="flex: 1;">
        <strong>💰 Total mensuel :</strong> 
        <span style="color: #666; font-size: 18px;">${formatNumberFC(totalMensuel)} FC</span>
      </div>
      <div style="flex: 1;">
        <strong>🎁 Remise (5%) :</strong> 
        <span style="color: #FF9800; font-size: 18px;">-${formatNumberFC(remise)} FC</span>
      </div>
      <div style="flex: 1;">
        <strong>💵 Total à payer :</strong> 
        <span style="color: #4CAF50; font-size: 20px; font-weight: bold;">${formatNumberFC(totalFinal)} FC</span>
      </div>
    </div>
    ${totalMensuel === 0 ? '<p style="color: #999; margin-top: 10px;">⚠️ Aucun achat ce mois-ci</p>' : ""}
  `;
}

// ============================================
// MODULE 6.1: FACTURE PANIER
// ============================================

function genererFacturePanier(vente, client) {
  if (typeof window.jspdf === "undefined") {
    console.error("jsPDF n'est pas chargé !");
    showTemporaryNotification(
      "❌ Erreur: La bibliothèque PDF n'est pas chargée",
    );
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
  doc.text("Votre Entreprise SARL", marginX, 35);
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
  doc.text(`${client.nom}`, marginX + 30, 68);
  doc.text(`Téléphone: ${client.telephone}`, marginX, 75);
  doc.text(`ID Client: ${client.id}`, marginX, 82);

  doc.line(marginX, 88, rightX, 88);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Détails des produits", marginX, 98);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Produit", marginX, 108);
  doc.text("Quantité", 100, 108);
  doc.text("Prix unitaire", 130, 108);
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
  doc.text("Paiement à réception de facture", pageWidth / 2, 285, {
    align: "center",
  });

  const nomFichier = `facture_${client.nom.replace(/\s/g, "_")}_${vente.id}.pdf`;
  doc.save(nomFichier);

  showTemporaryNotification(`✅ Facture générée avec succès !`);
}

// ============================================
// MODULE 6.2: FACTURE MENSUELLE
// ============================================

function genererFactureMensuelleMulti(ventes, client) {
  if (typeof window.jspdf === "undefined") {
    console.error("jsPDF n'est pas chargé !");
    showTemporaryNotification(
      "❌ Erreur: La bibliothèque PDF n'est pas chargée",
    );
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
  doc.text("Votre Entreprise SARL", marginX, 35);
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
  doc.text(`${client.nom}`, marginX + 30, 68);
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
  doc.text("Paiement à réception de facture", pageWidth / 2, 285, {
    align: "center",
  });

  const nomFichier = `facture_mensuelle_${client.nom.replace(/\s/g, "_")}_${moisTexte.replace(/\s/g, "_")}.pdf`;
  doc.save(nomFichier);

  showTemporaryNotification(`✅ Facture mensuelle générée avec succès !`);
}

// ============================================
// MODULE 7: GESTION DES PRODUITS AVEC CATÉGORIES ET TYPES
// ============================================

const PRODUITS_STORAGE_KEY = "ventes_pro_produits_v2";

// Structure des produits avec catégories et types
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

// Éléments du DOM
const tabBracongo = document.getElementById("tabBracongo");
const tabBralima = document.getElementById("tabBralima");
const bracongoContainer = document.getElementById("bracongoContainer");
const bralimaContainer = document.getElementById("bralimaContainer");

// Éléments des sous-onglets BRACONGO
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

// Éléments des sous-onglets BRALIMA
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

// Éléments du modal
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

// Initialiser les onglets fournisseurs
function initFournisseurTabs() {
  if (tabBracongo) {
    tabBracongo.addEventListener("click", () =>
      setActiveFournisseur("BRACONGO"),
    );
  }
  if (tabBralima) {
    tabBralima.addEventListener("click", () => setActiveFournisseur("BRALIMA"));
  }
}

function setActiveFournisseur(fournisseur) {
  currentFournisseur = fournisseur;

  const tabs = document.querySelectorAll(".categorie-tab");
  tabs.forEach((tab) => {
    if (tab.getAttribute("data-categorie") === fournisseur) {
      tab.classList.add("active");
      tab.style.borderBottom = "3px solid #4caf50";
      tab.style.color = "#4caf50";
    } else {
      tab.classList.remove("active");
      tab.style.borderBottom = "3px solid transparent";
      tab.style.color = "#1a1a2e";
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
  if (bracongoBouteilleTab) {
    bracongoBouteilleTab.addEventListener("click", () =>
      setActiveType("bouteille", "BRACONGO"),
    );
  }
  if (bracongoCassierTab) {
    bracongoCassierTab.addEventListener("click", () =>
      setActiveType("cassier", "BRACONGO"),
    );
  }
  if (bralimaBouteilleTab) {
    bralimaBouteilleTab.addEventListener("click", () =>
      setActiveType("bouteille", "BRALIMA"),
    );
  }
  if (bralimaCassierTab) {
    bralimaCassierTab.addEventListener("click", () =>
      setActiveType("cassier", "BRALIMA"),
    );
  }
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
      bracongoBouteilleTab.style.borderBottom = "2px solid #4caf50";
      bracongoCassierTab.classList.remove("active");
      bracongoCassierTab.style.borderBottom = "2px solid transparent";
      if (bracongoBouteilleContainer)
        bracongoBouteilleContainer.style.display = "block";
      if (bracongoCassierContainer)
        bracongoCassierContainer.style.display = "none";
    } else {
      bracongoCassierTab.classList.add("active");
      bracongoCassierTab.style.borderBottom = "2px solid #4caf50";
      bracongoBouteilleTab.classList.remove("active");
      bracongoBouteilleTab.style.borderBottom = "2px solid transparent";
      if (bracongoBouteilleContainer)
        bracongoBouteilleContainer.style.display = "none";
      if (bracongoCassierContainer)
        bracongoCassierContainer.style.display = "block";
    }
  }

  if (fournisseur === "BRALIMA" && bralimaBouteilleTab && bralimaCassierTab) {
    if (type === "bouteille") {
      bralimaBouteilleTab.classList.add("active");
      bralimaBouteilleTab.style.borderBottom = "2px solid #4caf50";
      bralimaCassierTab.classList.remove("active");
      bralimaCassierTab.style.borderBottom = "2px solid transparent";
      if (bralimaBouteilleContainer)
        bralimaBouteilleContainer.style.display = "block";
      if (bralimaCassierContainer)
        bralimaCassierContainer.style.display = "none";
    } else {
      bralimaCassierTab.classList.add("active");
      bralimaCassierTab.style.borderBottom = "2px solid #4caf50";
      bralimaBouteilleTab.classList.remove("active");
      bralimaBouteilleTab.style.borderBottom = "2px solid transparent";
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
  selectProduit.innerHTML = "";

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
  const [type, nom] = value.split("|");

  if (type === "bouteille") {
    if (produits.BRACONGO.bouteille[nom]) {
      prixInput.value = produits.BRACONGO.bouteille[nom].prix;
    } else if (produits.BRALIMA.bouteille[nom]) {
      prixInput.value = produits.BRALIMA.bouteille[nom].prix;
    } else {
      prixInput.value = "";
    }
  } else if (type === "cassier") {
    if (produits.BRACONGO.cassier[nom]) {
      prixInput.value = produits.BRACONGO.cassier[nom].prixCassier;
    } else if (produits.BRALIMA.cassier[nom]) {
      prixInput.value = produits.BRALIMA.cassier[nom].prixCassier;
    } else {
      prixInput.value = "";
    }
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
      tr.innerHTML = `
        <td style="padding: 10px;">${escapeHtml(nom)}</td>
        <td style="padding: 10px;">${data.format}</td>
        <td style="padding: 10px; text-align: right;">${formatNumberFC(data.prix)} FC</td>
        <td style="padding: 10px; text-align: right;">-</td>
        <td style="padding: 10px; text-align: center;">
          <button class="btn-edit-bracongo-bouteille" data-nom="${escapeHtml(nom)}" style="background:#2196F3; color:white; border:none; padding:6px 12px; border-radius:8px; cursor:pointer; margin-right:5px;">✏️ Modifier</button>
          <button class="btn-delete-bracongo-bouteille" data-nom="${escapeHtml(nom)}" style="background:#f44336; color:white; border:none; padding:6px 12px; border-radius:8px; cursor:pointer;">🗑️ Supprimer</button>
        </td>
      `;
      bracongoBouteilleBody.appendChild(tr);
    });
  }

  if (bracongoCassierBody) {
    bracongoCassierBody.innerHTML = "";
    Object.entries(produits.BRACONGO.cassier).forEach(([nom, data]) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="padding: 10px;">${escapeHtml(nom)}</td>
        <td style="padding: 10px;">${data.format}</td>
        <td style="padding: 10px; text-align: right;">${formatNumberFC(data.prixCassier)} FC</td>
        <td style="padding: 10px; text-align: right;">${formatNumberFC(data.prixUnitaire)} FC</td>
        <td style="padding: 10px; text-align: center;">
          <button class="btn-edit-bracongo-cassier" data-nom="${escapeHtml(nom)}" style="background:#2196F3; color:white; border:none; padding:6px 12px; border-radius:8px; cursor:pointer; margin-right:5px;">✏️ Modifier</button>
          <button class="btn-delete-bracongo-cassier" data-nom="${escapeHtml(nom)}" style="background:#f44336; color:white; border:none; padding:6px 12px; border-radius:8px; cursor:pointer;">🗑️ Supprimer</button>
        </td>
      `;
      bracongoCassierBody.appendChild(tr);
    });
  }

  if (bralimaBouteilleBody) {
    bralimaBouteilleBody.innerHTML = "";
    Object.entries(produits.BRALIMA.bouteille).forEach(([nom, data]) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="padding: 10px;">${escapeHtml(nom)}</td>
        <td style="padding: 10px;">${data.format}</td>
        <td style="padding: 10px; text-align: right;">${formatNumberFC(data.prix)} FC</td>
        <td style="padding: 10px; text-align: right;">-</td>
        <td style="padding: 10px; text-align: center;">
          <button class="btn-edit-bralima-bouteille" data-nom="${escapeHtml(nom)}" style="background:#2196F3; color:white; border:none; padding:6px 12px; border-radius:8px; cursor:pointer; margin-right:5px;">✏️ Modifier</button>
          <button class="btn-delete-bralima-bouteille" data-nom="${escapeHtml(nom)}" style="background:#f44336; color:white; border:none; padding:6px 12px; border-radius:8px; cursor:pointer;">🗑️ Supprimer</button>
        </td>
      `;
      bralimaBouteilleBody.appendChild(tr);
    });
  }

  if (bralimaCassierBody) {
    bralimaCassierBody.innerHTML = "";
    Object.entries(produits.BRALIMA.cassier).forEach(([nom, data]) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="padding: 10px;">${escapeHtml(nom)}</td>
        <td style="padding: 10px;">${data.format}</td>
        <td style="padding: 10px; text-align: right;">${formatNumberFC(data.prixCassier)} FC</td>
        <td style="padding: 10px; text-align: right;">${formatNumberFC(data.prixUnitaire)} FC</td>
        <td style="padding: 10px; text-align: center;">
          <button class="btn-edit-bralima-cassier" data-nom="${escapeHtml(nom)}" style="background:#2196F3; color:white; border:none; padding:6px 12px; border-radius:8px; cursor:pointer; margin-right:5px;">✏️ Modifier</button>
          <button class="btn-delete-bralima-cassier" data-nom="${escapeHtml(nom)}" style="background:#f44336; color:white; border:none; padding:6px 12px; border-radius:8px; cursor:pointer;">🗑️ Supprimer</button>
        </td>
      `;
      bralimaCassierBody.appendChild(tr);
    });
  }

  document.querySelectorAll(".btn-edit-bracongo-bouteille").forEach((btn) => {
    btn.removeEventListener("click", () =>
      ouvrirModalEdition("BRACONGO", "bouteille", btn.dataset.nom),
    );
    btn.addEventListener("click", () =>
      ouvrirModalEdition("BRACONGO", "bouteille", btn.dataset.nom),
    );
  });
  document.querySelectorAll(".btn-delete-bracongo-bouteille").forEach((btn) => {
    btn.removeEventListener("click", () =>
      supprimerProduit("BRACONGO", "bouteille", btn.dataset.nom),
    );
    btn.addEventListener("click", () =>
      supprimerProduit("BRACONGO", "bouteille", btn.dataset.nom),
    );
  });
  document.querySelectorAll(".btn-edit-bracongo-cassier").forEach((btn) => {
    btn.removeEventListener("click", () =>
      ouvrirModalEdition("BRACONGO", "cassier", btn.dataset.nom),
    );
    btn.addEventListener("click", () =>
      ouvrirModalEdition("BRACONGO", "cassier", btn.dataset.nom),
    );
  });
  document.querySelectorAll(".btn-delete-bracongo-cassier").forEach((btn) => {
    btn.removeEventListener("click", () =>
      supprimerProduit("BRACONGO", "cassier", btn.dataset.nom),
    );
    btn.addEventListener("click", () =>
      supprimerProduit("BRACONGO", "cassier", btn.dataset.nom),
    );
  });
  document.querySelectorAll(".btn-edit-bralima-bouteille").forEach((btn) => {
    btn.removeEventListener("click", () =>
      ouvrirModalEdition("BRALIMA", "bouteille", btn.dataset.nom),
    );
    btn.addEventListener("click", () =>
      ouvrirModalEdition("BRALIMA", "bouteille", btn.dataset.nom),
    );
  });
  document.querySelectorAll(".btn-delete-bralima-bouteille").forEach((btn) => {
    btn.removeEventListener("click", () =>
      supprimerProduit("BRALIMA", "bouteille", btn.dataset.nom),
    );
    btn.addEventListener("click", () =>
      supprimerProduit("BRALIMA", "bouteille", btn.dataset.nom),
    );
  });
  document.querySelectorAll(".btn-edit-bralima-cassier").forEach((btn) => {
    btn.removeEventListener("click", () =>
      ouvrirModalEdition("BRALIMA", "cassier", btn.dataset.nom),
    );
    btn.addEventListener("click", () =>
      ouvrirModalEdition("BRALIMA", "cassier", btn.dataset.nom),
    );
  });
  document.querySelectorAll(".btn-delete-bralima-cassier").forEach((btn) => {
    btn.removeEventListener("click", () =>
      supprimerProduit("BRALIMA", "cassier", btn.dataset.nom),
    );
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

  produitModal.style.display = "flex";
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

  produitModal.style.display = "flex";
}

function fermerModal() {
  produitModal.style.display = "none";
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
      if (savedProduits.BRACONGO && savedProduits.BRACONGO.bouteille) {
        produits = savedProduits;
      }
    } catch (e) {}
  }
}

function getProduitPrix(produitKey) {
  const [type, nom] = produitKey.split("|");
  if (type === "bouteille") {
    if (produits.BRACONGO.bouteille[nom])
      return produits.BRACONGO.bouteille[nom].prix;
    if (produits.BRALIMA.bouteille[nom])
      return produits.BRALIMA.bouteille[nom].prix;
  } else if (type === "cassier") {
    if (produits.BRACONGO.cassier[nom])
      return produits.BRACONGO.cassier[nom].prixCassier;
    if (produits.BRALIMA.cassier[nom])
      return produits.BRALIMA.cassier[nom].prixCassier;
  }
  return 0;
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
}

// ============================================
// MODULE EXPORT CSV
// ============================================

function exportToCSV() {
  if (!ventesOriginales || ventesOriginales.length === 0) {
    showMessage("Aucune donnée à exporter", "red");
    return;
  }

  const clientId = historiqueClientId.value;

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

  const rows = ventesOriginales.map((v) => {
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
    `ventes_client_${clientId}_${new Date().toISOString().slice(0, 10)}.csv`,
  );
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showMessage("📥 Export CSV effectué !", "green");
}

// Initialisation globale
loadDashboardStats();
initGestionProduits();

showTemporaryNotification("Bienvenue sur VentesPro !");
