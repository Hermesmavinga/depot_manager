// ============================================
// MODULE 1: TROUVER UN CLIENT
// ============================================

const API_URL = "http://localhost:4000/clients";

const button = document.getElementById("searchBtn");
const clientIdInput = document.getElementById("clientId");
const resultDiv = document.getElementById("result");

button.addEventListener("click", searchClient);

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
  resultDiv.innerHTML = "";
}

clientIdInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    searchClient();
  }
});

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
  clientIdInput.value = "";
  resultDiv.innerHTML = "";
  clientIdInput.focus();
});
button.insertAdjacentElement("afterend", clearButton);

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
  if (!historyDiv) {
    historyDiv = document.createElement("div");
    historyDiv.id = "searchHistory";
    historyDiv.style.marginTop = "10px";
    resultDiv.insertAdjacentElement("afterend", historyDiv);
  }
  if (searchHistory.length > 0) {
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
const messageDiv = document.getElementById("message");

addBtn.addEventListener("click", addClient);
nomInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    addClient();
  }
});
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
              <tr style="border-bottom:1px solid #ddd;"><td style="padding:8px 0;"><strong>👤 Nom :</strong> <td style="padding:8px 0;">${escapeHtml(nom)}</tr>
              <tr style="border-bottom:1px solid #ddd;"><td style="padding:8px 0;"><strong>📞 Téléphone :</strong> <td style="padding:8px 0;">${escapeHtml(telephone)}</tr>
            </table>
            <div style="margin-top:15px; padding-top:10px; border-top:1px solid #ddd;">
              <button onclick="fillVenteFormWithId(${data.id})" style="background:#4CAF50; color:white; border:none; padding:8px 15px; cursor:pointer; border-radius:5px; margin-right:10px;">🛒 Faire une vente</button>
              <button onclick="copyToClipboard(${data.id})" style="background:#2196F3; color:white; border:none; padding:8px 15px; cursor:pointer; border-radius:5px;">📋 Copier l'ID</button>
            </div>
          </div>
          <button onclick="document.getElementById('${messageId}').remove()" style="background:#ff4444; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:5px; font-size:16px;">✕</button>
        </div>
      </div>
    `;

    nomInput.value = "";
    telephoneInput.value = "";
    nomInput.focus();
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

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text.toString());
    showTemporaryNotification("✅ ID copié dans le presse-papier !");
  } catch (err) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    showTemporaryNotification("✅ ID copié !");
  }
}

function showTemporaryNotification(message) {
  const notification = document.createElement("div");
  notification.style.position = "fixed";
  notification.style.bottom = "20px";
  notification.style.right = "20px";
  notification.style.backgroundColor = "#4CAF50";
  notification.style.color = "white";
  notification.style.padding = "12px 20px";
  notification.style.borderRadius = "5px";
  notification.style.zIndex = "9999";
  notification.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
  notification.innerHTML = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.opacity = "0";
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
  telephoneInput.value = randomPhone;
});
addBtn.insertAdjacentElement("afterend", testButton);

// ============================================
// MODULE 3: PANIER ET VENTE MULTI-PRODUITS
// ============================================

// Panier global
let panier = [];

const venteBtn = document.getElementById("addVenteBtn");
const clientInput = document.getElementById("venteClientId");
const clientInfo = document.getElementById("clientInfo");
const message = document.getElementById("venteMessage");
const produitSelect = document.getElementById("produit");
const quantiteInput = document.getElementById("quantite");
const prixInput = document.getElementById("prix");
const ajouterPanierBtn = document.getElementById("ajouterPanierBtn");

const produits = {
  "Casier bière": { prix: 25, unite: "casier" },
  "Caisse de vin": { prix: 45, unite: "caisse" },
  "Pack whisky": { prix: 60, unite: "pack" },
  "Carton de soda": { prix: 15, unite: "carton" },
  "Pack de bières artisanales": { prix: 35, unite: "pack" },
};

function updatePrix() {
  const produit = produitSelect.value;
  if (produits[produit]) prixInput.value = produits[produit].prix;
  else prixInput.value = "";
}
produitSelect.addEventListener("change", updatePrix);
updatePrix();

const totalDisplay = document.createElement("p");
totalDisplay.id = "totalDisplay";
totalDisplay.style.marginTop = "10px";
totalDisplay.style.fontWeight = "bold";
prixInput.insertAdjacentElement("afterend", totalDisplay);

function updateTotal() {
  const quantite = parseFloat(quantiteInput.value) || 0;
  const prix = parseFloat(prixInput.value) || 0;
  const total = quantite * prix;
  if (quantite > 0 && prix > 0)
    totalDisplay.innerHTML = `<span style="color: #4CAF50;">💰 Total : ${total.toFixed(2)}€</span>`;
  else totalDisplay.innerHTML = "";
}
quantiteInput.addEventListener("input", updateTotal);
prixInput.addEventListener("input", updateTotal);

let debounceTimeout;
clientInput.addEventListener("input", function () {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(afficherClient, 500);
});

async function afficherClient() {
  const clientId = clientInput.value.trim();
  if (!clientId) {
    clientInfo.innerHTML = "";
    return;
  }
  try {
    const response = await fetch(
      `http://localhost:4000/clients/${String(clientId)}`,
    );
    if (!response.ok) {
      clientInfo.innerHTML = `<span style="color:red; background:#ffebee; padding:5px 10px; border-radius:5px; display:inline-block;">❌ Client introuvable (ID: ${clientId})</span>`;
      return;
    }
    const data = await response.json();
    clientInfo.innerHTML = `<div style="color:green; background:#e8f5e9; padding:8px 12px; border-radius:5px; border-left:4px solid #4CAF50;">✅ <strong>Client trouvé !</strong><br>👤 Nom : <strong>${data.nom}</strong><br>📞 Téléphone : ${data.telephone || "Non renseigné"}<br>🆔 ID : ${data.id}</div>`;
  } catch (error) {
    clientInfo.innerHTML = `<span style="color:red; background:#ffebee; padding:5px 10px; border-radius:5px;">❌ Erreur de connexion au serveur</span>`;
    console.error("Erreur recherche client:", error);
  }
}

// 🛒 Fonction pour ajouter au panier
function ajouterAuPanier() {
  const produit = produitSelect.value;
  const quantite = Number(quantiteInput.value);
  const prix = Number(prixInput.value);

  if (!produit || quantite <= 0 || prix <= 0) {
    showTemporaryNotification("❌ Données invalides");
    return;
  }

  panier.push({
    nom: produit,
    quantite: quantite,
    prix: prix,
  });

  afficherPanier();

  // Réinitialiser la quantité
  quantiteInput.value = "1";
  updateTotal();

  showTemporaryNotification(`✅ ${produit} ajouté au panier !`);
}

// 📦 Fonction pour afficher le panier
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
    prixInput.insertAdjacentElement("afterend", panierDiv);
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

    html += `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:5px; border-bottom:1px solid #eee;">
        <span><strong>${item.nom}</strong> - ${item.quantite} x ${item.prix}€ = ${sousTotal.toFixed(2)}€</span>
        <button onclick="supprimerDuPanier(${index})" style="background:#ff4444; color:white; border:none; padding:3px 8px; cursor:pointer; border-radius:3px;">
          ❌
        </button>
      </div>
    `;
  });

  html += "</div>";
  html += `<div style="margin-top:10px; padding-top:10px; border-top:2px solid #ddd; text-align:right;">
            <strong>Total panier : ${total.toFixed(2)}€</strong>
           </div>`;

  panierDiv.innerHTML = html;
}

// ❌ Fonction pour supprimer un produit du panier
function supprimerDuPanier(index) {
  const produit = panier[index].nom;
  panier.splice(index, 1);
  afficherPanier();
  showTemporaryNotification(`❌ ${produit} retiré du panier`);
}

// 💾 Fonction pour enregistrer la vente (multi-produits)
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

    // Générer la facture unique
    genererFacturePanier(data, clientData);

    // Vider le panier
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
          ${data.produits.map((p) => `&nbsp;&nbsp;- ${p.nom}: ${p.quantite} x ${p.prix}€ = ${(p.prix * p.quantite).toFixed(2)}€<br>`).join("")}
          <strong>💰 Total :</strong> <strong style="color:#4CAF50;">${total.toFixed(2)}€</strong><br>
          <strong>🕒 Date :</strong> ${dateAffichage}
        </div>
        <button onclick="document.getElementById('${messageId}').remove()" 
                style="background:#ff4444; color:white; border:none; padding:8px 12px; cursor:pointer; border-radius:5px; font-size:16px;">
          ✕
        </button>
      </div>
    </div>`;

    clientInput.focus();
  } catch (error) {
    message.innerHTML = `<div style="color:red; border:1px solid red; padding:10px; background:#ffebee; border-radius:5px;">❌ Erreur lors de la vente : ${error.message}</div>`;
    console.error("Erreur vente:", error);
  }
}

// Écouteurs d'événements
if (ajouterPanierBtn) {
  ajouterPanierBtn.addEventListener("click", ajouterAuPanier);
}
venteBtn.addEventListener("click", addVente);

clientInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    afficherClient();
  }
});

// ============================================
// MODULE 4: HISTORIQUE DES VENTES (MULTI-PRODUITS)
// ============================================

const showHistoriqueBtn = document.getElementById("showHistoriqueBtn");
const historiqueClientId = document.getElementById("historiqueClientId");
const historiqueMessage = document.getElementById("historiqueMessage");
const historiqueTable = document.getElementById("historiqueTable");
let tbody = historiqueTable.querySelector("tbody");

if (!tbody) {
  tbody = document.createElement("tbody");
  historiqueTable.appendChild(tbody);
}

let totalQuantiteEl = document.getElementById("totalQuantite");
let totalPrixEl = document.getElementById("totalPrix");

if (!totalQuantiteEl) {
  totalQuantiteEl = document.createElement("span");
  totalQuantiteEl.id = "totalQuantite";
  totalQuantiteEl.textContent = "0";
  const totalGeneralDiv = document.createElement("div");
  totalGeneralDiv.innerHTML = "<strong>Total général : </strong>";
  totalGeneralDiv.appendChild(totalQuantiteEl);
  historiqueTable.insertAdjacentElement("afterend", totalGeneralDiv);
}

if (!totalPrixEl) {
  totalPrixEl = document.createElement("span");
  totalPrixEl.id = "totalPrix";
  totalPrixEl.textContent = "0€";
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
showHistoriqueBtn.insertAdjacentElement("afterend", factureMensuelleBtn);

showHistoriqueBtn.addEventListener("click", afficherHistorique);
exportBtn.addEventListener("click", exportToCSV);
historiqueClientId.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    afficherHistorique();
  }
});

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

      console.log(
        `🔍 Ventes trouvées pour le client ${clientIdStr}: ${ventes.length}`,
      );
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
  if (!tbody) {
    tbody = historiqueTable.querySelector("tbody");
    if (!tbody) {
      tbody = document.createElement("tbody");
      historiqueTable.appendChild(tbody);
    }
  }

  tbody.innerHTML = "";
  let totalQuantite = 0;
  let totalPrix = 0;

  const ventesTriees = [...ventes].sort(
    (a, b) => parseDate(b.date) - parseDate(a.date),
  );

  ventesTriees.forEach((v, index) => {
    // Calculer la quantité totale et le prix total de la vente
    let quantiteTotale = 0;
    let produitsListe = "";

    if (v.produits && Array.isArray(v.produits)) {
      v.produits.forEach((p) => {
        quantiteTotale += p.quantite;
        produitsListe += `${p.nom} (${p.quantite}) `;
      });
    } else {
      // Compatibilité avec l'ancien format
      quantiteTotale = v.quantite || 0;
      produitsListe = v.produit || "Produit inconnu";
    }

    const total = Number(v.total) || 0;

    const tr = document.createElement("tr");
    tr.style.borderBottom = "1px solid #ddd";

    if (index % 2 === 0) tr.style.backgroundColor = "#f9f9f9";

    const btnDetailsId = `details_btn_${v.id}_${Date.now()}_${index}`;
    const btnFactureId = `facture_btn_${v.id}_${Date.now()}_${index}`;

    tr.innerHTML = `
      <td style="padding: 8px; text-align: center;">${v.id}</td>
      <td style="padding: 8px;">${escapeHtml(produitsListe.substring(0, 30))}${produitsListe.length > 30 ? "..." : ""}</td>
      <td style="padding: 8px; text-align: right;">${quantiteTotale}</td>
      <td style="padding: 8px; text-align: right;">${(total / quantiteTotale || 0).toFixed(2)}€ (moyen)</td>
      <td style="padding: 8px; text-align: right; font-weight: bold; color: #4CAF50;">
        ${total.toFixed(2)}€
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

    tbody.appendChild(tr);

    const detailsBtn = document.getElementById(btnDetailsId);
    if (detailsBtn) {
      detailsBtn.addEventListener("click", () => {
        showVenteDetailsMulti(v.id);
      });
    }

    const factureBtn = document.getElementById(btnFactureId);
    if (factureBtn) {
      factureBtn.addEventListener("click", () => {
        genererFacturePanier(v, clientData);
      });
    }

    totalQuantite += quantiteTotale;
    totalPrix += total;
  });

  const totalQuantiteSpan = document.getElementById("totalQuantite");
  const totalPrixSpan = document.getElementById("totalPrix");

  if (totalQuantiteSpan) totalQuantiteSpan.textContent = totalQuantite;
  if (totalPrixSpan) totalPrixSpan.textContent = totalPrix.toFixed(2) + "€";

  historiqueTable.style.display = "table";

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
    tbody.innerHTML = "";
    const totalQuantiteSpan = document.getElementById("totalQuantite");
    const totalPrixSpan = document.getElementById("totalPrix");
    if (totalQuantiteSpan) totalQuantiteSpan.textContent = "0";
    if (totalPrixSpan) totalPrixSpan.textContent = "0€";
    historiqueTable.style.display = "table";
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

    let produitsHtml = "<p><strong>📦 Produits :</strong></p><ul>";
    if (vente.produits && Array.isArray(vente.produits)) {
      vente.produits.forEach((p) => {
        produitsHtml += `<li>${p.nom} : ${p.quantite} x ${p.prix}€ = ${(p.prix * p.quantite).toFixed(2)}€</li>`;
      });
    } else {
      produitsHtml += `<li>${vente.produit || "Produit inconnu"} : ${vente.quantite || 0} x ${vente.prix || 0}€ = ${vente.total || 0}€</li>`;
    }
    produitsHtml += "</ul>";

    const detailsHtml = `
      <div id="venteDetails" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 25px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 1000; max-width: 500px; width: 90%;">
        <h3 style="margin-top: 0; color: #4CAF50;">📋 Détails de la vente</h3>
        <hr>
        <p><strong>🆔 ID Vente :</strong> ${vente.id}</p>
        ${clientInfo}
        ${produitsHtml}
        <p><strong>💰 Total :</strong> <strong style="color: #4CAF50;">${vente.total}€</strong></p>
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

    if (historiqueMessage.innerHTML.includes("Chargement des détails"))
      historiqueMessage.innerHTML = "";
  } catch (error) {
    console.error("Erreur chargement détails:", error);
    showMessage("❌ Erreur lors du chargement des détails de la vente", "red");
  }
}

function formatDate(dateString) {
  if (!dateString) return "Date non disponible";
  if (dateString.includes("Invalid")) return "Date invalide";
  let date = parseDate(dateString);
  if (isNaN(date.getTime())) return dateString;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString())
    return `Aujourd'hui à ${date.toLocaleTimeString()}`;
  else if (date.toDateString() === yesterday.toDateString())
    return `Hier à ${date.toLocaleTimeString()}`;
  else return `${date.toLocaleDateString()} à ${date.toLocaleTimeString()}`;
}

function exportToCSV() {
  if (!ventesOriginales || ventesOriginales.length === 0) {
    showMessage("Aucune donnée à exporter", "red");
    return;
  }

  const clientId = historiqueClientId.value;
  const headers = ["ID Vente", "Produits", "Quantité totale", "Total", "Date"];
  const rows = ventesOriginales.map((v) => {
    let produitsListe = "";
    let quantiteTotale = 0;
    if (v.produits && Array.isArray(v.produits)) {
      produitsListe = v.produits
        .map((p) => `${p.nom}(${p.quantite})`)
        .join(", ");
      quantiteTotale = v.produits.reduce((sum, p) => sum + p.quantite, 0);
    } else {
      produitsListe = v.produit || "";
      quantiteTotale = v.quantite || 0;
    }
    return [v.id, produitsListe, quantiteTotale, v.total, v.date];
  });

  const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
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

function showMessage(msg, color) {
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

function resetDisplay() {
  if (tbody) tbody.innerHTML = "";

  const totalQuantiteSpan = document.getElementById("totalQuantite");
  const totalPrixSpan = document.getElementById("totalPrix");

  if (totalQuantiteSpan) totalQuantiteSpan.textContent = "0";
  if (totalPrixSpan) totalPrixSpan.textContent = "0€";

  if (historiqueTable) historiqueTable.style.display = "none";
  if (historiqueMessage) historiqueMessage.innerHTML = "";

  const existingInfo = document.getElementById("clientInfoHistorique");
  if (existingInfo) existingInfo.remove();

  const existingModal = document.getElementById("venteDetails");
  const existingOverlay = document.getElementById("overlay");
  if (existingModal) existingModal.remove();
  if (existingOverlay) existingOverlay.remove();
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// MODULE 5: TOTAL MENSUEL MULTI-PRODUITS
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
    return sum + (Number(vente.total) || 0);
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
        <span style="color: #666; font-size: 18px;">${totalMensuel.toFixed(2)}€</span>
      </div>
      <div style="flex: 1;">
        <strong>🎁 Remise (5%) :</strong> 
        <span style="color: #FF9800; font-size: 18px;">-${remise.toFixed(2)}€</span>
      </div>
      <div style="flex: 1;">
        <strong>💵 Total à payer :</strong> 
        <span style="color: #4CAF50; font-size: 20px; font-weight: bold;">${totalFinal.toFixed(2)}€</span>
      </div>
    </div>
    ${totalMensuel === 0 ? '<p style="color: #999; margin-top: 10px;">⚠️ Aucun achat ce mois-ci</p>' : ""}
  `;
}

// ============================================
// MODULE 6.1: FACTURE PANIER (PLUSIEURS PRODUITS)
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

  const total = Number(vente.total) || 0;
  const dateFacture = new Date().toLocaleString("fr-FR");

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURE", 105, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Votre Entreprise SARL", 20, 35);
  doc.text("123 Avenue du Commerce", 20, 40);
  doc.text("75001 Paris, France", 20, 45);
  doc.text("Tél: 01 23 45 67 89", 20, 50);

  doc.setFontSize(10);
  doc.text(`Facture N°: ${vente.id}`, 150, 35);
  doc.text(`Date: ${dateFacture}`, 150, 40);

  doc.line(20, 55, 190, 55);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Client :", 20, 65);
  doc.setFont("helvetica", "normal");
  doc.text(`${client.nom}`, 20, 72);
  doc.text(`Téléphone: ${client.telephone}`, 20, 78);
  doc.text(`ID Client: ${client.id}`, 20, 84);

  doc.line(20, 90, 190, 90);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Détails des produits", 20, 98);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Produit", 20, 108);
  doc.text("Quantité", 100, 108);
  doc.text("Prix unitaire", 130, 108);
  doc.text("Total", 165, 108);

  doc.line(20, 110, 190, 110);

  let yPosition = 118;
  doc.setFont("helvetica", "normal");

  if (vente.produits && Array.isArray(vente.produits)) {
    vente.produits.forEach((item) => {
      const sousTotal = item.prix * item.quantite;

      doc.text(item.nom.substring(0, 25), 20, yPosition);
      doc.text(item.quantite.toString(), 100, yPosition);
      doc.text(`${Number(item.prix).toFixed(2)} €`, 130, yPosition);
      doc.text(`${sousTotal.toFixed(2)} €`, 165, yPosition);

      yPosition += 8;

      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
    });
  }

  doc.line(20, yPosition + 2, 190, yPosition + 2);
  yPosition += 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL À PAYER:", 140, yPosition);
  doc.setFontSize(14);
  doc.setTextColor(76, 175, 80);
  doc.text(`${total.toFixed(2)} €`, 175, yPosition, { align: "right" });

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Merci de votre confiance !", 105, 280, { align: "center" });
  doc.text("Paiement à réception de facture", 105, 285, { align: "center" });

  const nomFichier = `facture_${client.nom.replace(/\s/g, "_")}_${vente.id}.pdf`;
  doc.save(nomFichier);

  showTemporaryNotification(`✅ Facture générée avec succès !`);
}

// ============================================
// MODULE 6.2: FACTURE MENSUELLE MULTI-PRODUITS
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

  const total = ventesDuMois.reduce((sum, v) => {
    return sum + (Number(v.total) || 0);
  }, 0);

  const remise = total * 0.05;
  const totalFinal = total - remise;
  const dateFacture = new Date().toLocaleString("fr-FR");
  const moisTexte = maintenant.toLocaleString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURE MENSUELLE", 105, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Votre Entreprise SARL", 20, 35);
  doc.text("123 Avenue du Commerce", 20, 40);
  doc.text("75001 Paris, France", 20, 45);
  doc.text("Tél: 01 23 45 67 89", 20, 50);

  doc.setFontSize(10);
  doc.text(`Période: ${moisTexte}`, 150, 35);
  doc.text(`Date d'édition: ${dateFacture}`, 150, 40);

  doc.line(20, 55, 190, 55);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Client :", 20, 65);
  doc.setFont("helvetica", "normal");
  doc.text(`${client.nom}`, 20, 72);
  doc.text(`Téléphone: ${client.telephone}`, 20, 78);
  doc.text(`ID Client: ${client.id}`, 20, 84);

  doc.line(20, 90, 190, 90);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Récapitulatif des achats - ${moisTexte}`, 20, 98);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Date", 20, 108);
  doc.text("Produits", 60, 108);
  doc.text("Total", 160, 108);

  doc.line(20, 110, 190, 110);

  let yPosition = 118;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  ventesDuMois.forEach((vente, index) => {
    let produitsListe = "";
    if (vente.produits && Array.isArray(vente.produits)) {
      produitsListe = vente.produits
        .map((p) => `${p.nom}(${p.quantite})`)
        .join(", ");
    } else {
      produitsListe = vente.produit || "Produit inconnu";
    }

    const dateStr = formatDate(vente.date);

    doc.text(dateStr.substring(0, 10), 20, yPosition);
    doc.text(produitsListe.substring(0, 35), 60, yPosition);
    doc.text(`${Number(vente.total).toFixed(2)} €`, 160, yPosition);

    yPosition += 8;

    if (yPosition > 250 && index < ventesDuMois.length - 1) {
      doc.addPage();
      yPosition = 20;
    }
  });

  yPosition += 10;
  doc.line(20, yPosition - 5, 190, yPosition - 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Sous-total:", 140, yPosition);
  doc.text(`${total.toFixed(2)} €`, 175, yPosition, { align: "right" });

  yPosition += 8;
  doc.text("Remise (5%):", 140, yPosition);
  doc.text(`-${remise.toFixed(2)} €`, 175, yPosition, { align: "right" });

  yPosition += 10;
  doc.setFontSize(12);
  doc.setTextColor(76, 175, 80);
  doc.text("TOTAL À PAYER:", 140, yPosition);
  doc.setFontSize(14);
  doc.text(`${totalFinal.toFixed(2)} €`, 175, yPosition, { align: "right" });

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Merci de votre confiance !", 105, 280, { align: "center" });
  doc.text("Paiement à réception de facture", 105, 285, { align: "center" });

  const nomFichier = `facture_mensuelle_${client.nom.replace(/\s/g, "_")}_${moisTexte.replace(/\s/g, "_")}.pdf`;
  doc.save(nomFichier);

  showTemporaryNotification(`✅ Facture mensuelle générée avec succès !`);
}
