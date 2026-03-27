// trouver un client

// trouver un client

// trouver un client

const API_URL = "http://localhost:4000/clients";

const button = document.getElementById("searchBtn");
const clientIdInput = document.getElementById("clientId");
const resultDiv = document.getElementById("result");

button.addEventListener("click", searchClient);

// 🔍 Fonction principale
async function searchClient() {
  const clientId = clientIdInput.value.trim();

  // ✅ Validation simple (on accepte texte + nombre)
  if (!clientId) {
    showError("Veuillez entrer un ID client", resultDiv);
    return;
  }

  // 🔄 Chargement
  showLoading(resultDiv);

  try {
    const response = await fetch(`${API_URL}/${clientId}`);

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

// ✅ Affichage du client
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
          <td style="padding:10px 0;"><strong>🆔 ID :</strong></td>
          <td style="padding:10px 0;">${client.id}</td>
        </tr>

        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:10px 0;"><strong>👤 Nom :</strong></td>
          <td style="padding:10px 0;">${escapeHtml(client.nom)}</td>
        </tr>

        <tr>
          <td style="padding:10px 0;"><strong>📞 Téléphone :</strong></td>
          <td style="padding:10px 0;">${escapeHtml(client.telephone)}</td>
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

// 🔹 Remplir le formulaire de vente
function fillVenteForm(clientId) {
  const venteClientInput = document.getElementById("venteClientId");

  if (venteClientInput) {
    venteClientInput.value = clientId;

    // 🔄 Déclencher affichage automatique du client
    const event = new Event("input", { bubbles: true });
    venteClientInput.dispatchEvent(event);

    // 📍 Scroll vers la section vente
    document
      .querySelector("h2:last-of-type")
      ?.scrollIntoView({ behavior: "smooth" });

    showTemporaryMessage("✅ ID client pré-rempli !", "venteMessage");
  }
}

// ⏳ Chargement
function showLoading(container) {
  container.innerHTML = `
    <div style="border:1px solid #2196F3; padding:10px; margin-top:10px; border-radius:5px; background:#e3f2fd;">
      <span style="color:#2196F3;">⏳ Recherche en cours...</span>
    </div>
  `;
}

// ❌ Erreur
function showError(message, container) {
  container.innerHTML = `
    <div style="border:1px solid #ff4444; padding:10px; margin-top:10px; border-radius:5px; background:#ffebee;">
      <span style="color:#ff4444;">❌ ${message}</span>
    </div>
  `;

  setTimeout(() => {
    if (container.innerHTML.includes(message)) {
      container.innerHTML = "";
    }
  }, 5000);
}

// ✅ Message temporaire
function showTemporaryMessage(message, elementId) {
  const element = document.getElementById(elementId);

  if (element) {
    const originalContent = element.innerHTML;

    element.innerHTML = `<span style="color:green;">${message}</span>`;

    setTimeout(() => {
      if (
        element.innerHTML === `<span style="color:green;">${message}</span>`
      ) {
        element.innerHTML = originalContent;
      }
    }, 3000);
  }
}

// 🧹 Nettoyer
function clearResult() {
  resultDiv.innerHTML = "";
}

// 🔐 Protection XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ⌨️ Entrée clavier
clientIdInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    searchClient();
  }
});

// 🔘 Bouton effacer
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

// 📜 Historique
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
    historyDiv.innerHTML = `
      <div style="margin-top:10px; padding:10px; background:#f5f5f5; border-radius:5px;">
        <strong>📜 Recherches récentes :</strong><br>
        ${searchHistory
          .map(
            (id) => `
          <button onclick="document.getElementById('clientId').value='${id}'; searchClient();" 
                  style="margin:5px; padding:5px 10px; background:#2196F3; color:white; border:none; border-radius:3px; cursor:pointer;">
            ID ${id}
          </button>
        `,
          )
          .join("")}
      </div>
    `;
  }
}

// 🔄 Hook historique
const originalDisplayClient = displayClient;
displayClient = function (client) {
  originalDisplayClient(client);
  addToHistory(client.id);
};

// 🚀 Init
updateHistoryDisplay();

// trouver un client fin

// creation dun client

// créer un client

const addBtn = document.getElementById("addClientBtn");
const nomInput = document.getElementById("nom");
const telephoneInput = document.getElementById("telephone");
const messageDiv = document.getElementById("message");

addBtn.addEventListener("click", addClient);

// Ajouter la touche Entrée pour valider rapidement
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

  // Validation des champs
  if (!nom || !telephone) {
    showErrorMessage("Veuillez remplir tous les champs", messageDiv);
    return;
  }

  // Validation du nom (au moins 2 caractères)
  if (nom.length < 2) {
    showErrorMessage("Le nom doit contenir au moins 2 caractères", messageDiv);
    return;
  }

  // Validation du téléphone (format simple)
  const phoneRegex = /^[0-9+\-\s]{8,}$/;
  if (!phoneRegex.test(telephone)) {
    showErrorMessage(
      "Veuillez entrer un numéro de téléphone valide (au moins 8 chiffres)",
      messageDiv,
    );
    return;
  }

  // Afficher un message de chargement
  showLoadingMessage(messageDiv);

  try {
    const response = await fetch("http://localhost:4000/clients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ nom, telephone }),
    });

    if (!response.ok) {
      if (response.status === 400) {
        throw new Error("Données invalides");
      } else if (response.status === 409) {
        throw new Error("Ce client existe peut-être déjà");
      } else {
        throw new Error(`Erreur serveur (${response.status})`);
      }
    }

    const data = await response.json();
    const messageId = "successClient_" + Date.now();

    // Afficher le message de succès avec l'ID
    messageDiv.innerHTML = `
      <div id="${messageId}" style="color:green; border:2px solid #4CAF50; padding:15px; background:#f0fff0; border-radius:8px; margin-top:10px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div style="flex:1;">
            <strong style="font-size:16px;">✅ Client ajouté avec succès !</strong><br><br>
            <div style="background:#e8f5e9; padding:10px; border-radius:5px; margin:10px 0;">
              <strong>🆔 ID du client :</strong> 
              <span style="font-size:20px; font-weight:bold; color:#4CAF50;">${data.id}</span>
            </div>
            <table style="width:100%; border-collapse:collapse;">
              <tr style="border-bottom:1px solid #ddd;">
                <td style="padding:8px 0;"><strong>👤 Nom :</strong></td>
                <td style="padding:8px 0;">${escapeHtml(nom)}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;"><strong>📞 Téléphone :</strong></td>
                <td style="padding:8px 0;">${escapeHtml(telephone)}</td>
              </tr>
            </table>
            <div style="margin-top:15px; padding-top:10px; border-top:1px solid #ddd;">
              <button onclick="fillVenteFormWithId(${data.id})" 
                      style="background:#4CAF50; color:white; border:none; padding:8px 15px; cursor:pointer; border-radius:5px; margin-right:10px;">
                🛒 Faire une vente
              </button>
              <button onclick="copyToClipboard(${data.id})" 
                      style="background:#2196F3; color:white; border:none; padding:8px 15px; cursor:pointer; border-radius:5px;">
                📋 Copier l'ID
              </button>
            </div>
          </div>
          <button onclick="document.getElementById('${messageId}').remove()" 
                  style="background:#ff4444; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:5px; font-size:16px;">
            ✕
          </button>
        </div>
      </div>
    `;

    // Réinitialiser les champs
    nomInput.value = "";
    telephoneInput.value = "";

    // Focus sur le champ nom pour le prochain client
    nomInput.focus();
  } catch (error) {
    console.error("Erreur création client:", error);
    showErrorMessage(`Erreur lors de l'ajout : ${error.message}`, messageDiv);
  }
}

// Afficher un message d'erreur
function showErrorMessage(message, container) {
  const errorId = "error_" + Date.now();
  container.innerHTML = `
    <div id="${errorId}" style="color:red; border:2px solid #ff4444; padding:10px; background:#ffebee; border-radius:5px; margin-top:10px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span>❌ ${message}</span>
        <button onclick="document.getElementById('${errorId}').remove()" 
                style="background:#ff4444; color:white; border:none; padding:3px 8px; cursor:pointer; border-radius:3px;">
          ✕
        </button>
      </div>
    </div>
  `;

  // Effacer automatiquement après 5 secondes
  setTimeout(() => {
    const errorElement = document.getElementById(errorId);
    if (errorElement) errorElement.remove();
  }, 5000);
}

// Afficher un message de chargement
function showLoadingMessage(container) {
  container.innerHTML = `
    <div style="color:blue; border:1px solid #2196F3; padding:10px; background:#e3f2fd; border-radius:5px; margin-top:10px;">
      ⏳ Création en cours...
    </div>
  `;
}

// Fonction pour remplir automatiquement le formulaire de vente
function fillVenteFormWithId(clientId) {
  const venteClientInput = document.getElementById("venteClientId");
  if (venteClientInput) {
    venteClientInput.value = clientId;
    // Déclencher la recherche auto du client
    const event = new Event("input", { bubbles: true });
    venteClientInput.dispatchEvent(event);

    // Faire défiler jusqu'au formulaire de vente
    const venteSection = document.querySelector("h2:last-of-type");
    if (venteSection) {
      venteSection.scrollIntoView({ behavior: "smooth" });
    }

    // Afficher une notification
    showTemporaryNotification("✅ ID client pré-rempli !");
  }
}

// Fonction pour copier l'ID dans le presse-papier
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text.toString());
    showTemporaryNotification("✅ ID copié dans le presse-papier !");
  } catch (err) {
    console.error("Erreur de copie:", err);
    // Fallback pour les navigateurs plus anciens
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    showTemporaryNotification("✅ ID copié !");
  }
}

// Afficher une notification temporaire
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

// Échapper les caractères HTML pour éviter les injections XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Ajouter un bouton pour générer un téléphone aléatoire (pour les tests)
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

// faire une vente

// 🔹 Récupération des éléments
const venteBtn = document.getElementById("addVenteBtn");
const clientInput = document.getElementById("venteClientId");
const clientInfo = document.getElementById("clientInfo");
const message = document.getElementById("venteMessage");
const produitSelect = document.getElementById("produit");
const quantiteInput = document.getElementById("quantite");
const prixInput = document.getElementById("prix");

// 📦 Base de données des produits avec leurs prix
const produits = {
  "Casier bière": { prix: 25, unite: "casier" },
  "Caisse de vin": { prix: 45, unite: "caisse" },
  "Pack whisky": { prix: 60, unite: "pack" },
  "Carton de soda": { prix: 15, unite: "carton" },
  "Pack de bières artisanales": { prix: 35, unite: "pack" },
};

// 🔹 Initialisation : définir le prix selon le produit sélectionné
function updatePrix() {
  const produit = produitSelect.value;
  if (produits[produit]) {
    prixInput.value = produits[produit].prix;
  } else {
    prixInput.value = "";
  }
}

// Écouter le changement de produit
produitSelect.addEventListener("change", updatePrix);

// Initialiser au chargement
updatePrix();

// 🔹 Ajouter un affichage du total en temps réel
const totalDisplay = document.createElement("p");
totalDisplay.id = "totalDisplay";
totalDisplay.style.marginTop = "10px";
totalDisplay.style.fontWeight = "bold";
prixInput.insertAdjacentElement("afterend", totalDisplay);

// Fonction pour calculer et afficher le total en temps réel
function updateTotal() {
  const quantite = parseFloat(quantiteInput.value) || 0;
  const prix = parseFloat(prixInput.value) || 0;
  const total = quantite * prix;

  if (quantite > 0 && prix > 0) {
    totalDisplay.innerHTML = `<span style="color: #4CAF50;">💰 Total : ${total.toFixed(2)}€</span>`;
  } else {
    totalDisplay.innerHTML = "";
  }
}

// Écouter les changements de quantité et de prix
quantiteInput.addEventListener("input", updateTotal);
prixInput.addEventListener("input", updateTotal);

// 🔹 Écoute la saisie de l'ID client pour auto affichage
let debounceTimeout;
clientInput.addEventListener("input", function () {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(afficherClient, 500);
});

// 🔹 Fonction auto affichage client
async function afficherClient() {
  const clientId = clientInput.value.trim();

  if (!clientId) {
    clientInfo.innerHTML = "";
    return;
  }

  try {
    const response = await fetch(`http://localhost:4000/clients/${clientId}`);

    if (!response.ok) {
      clientInfo.innerHTML = `
        <span style="color:red; background:#ffebee; padding:5px 10px; border-radius:5px; display:inline-block;">
          ❌ Client introuvable (ID: ${clientId})
        </span>
      `;
      return;
    }

    const data = await response.json();
    clientInfo.innerHTML = `
      <div style="color:green; background:#e8f5e9; padding:8px 12px; border-radius:5px; border-left:4px solid #4CAF50;">
        ✅ <strong>Client trouvé !</strong><br>
        👤 Nom : <strong>${data.nom}</strong><br>
        📞 Téléphone : ${data.telephone || "Non renseigné"}<br>
        🆔 ID : ${data.id}
      </div>
    `;
  } catch (error) {
    clientInfo.innerHTML = `
      <span style="color:red; background:#ffebee; padding:5px 10px; border-radius:5px;">
        ❌ Erreur de connexion au serveur
      </span>
    `;
    console.error("Erreur recherche client:", error);
  }
}

// 🔹 Écoute du bouton pour enregistrer la vente
venteBtn.addEventListener("click", addVente);

// 🔹 Fonction pour ajouter une vente
async function addVente() {
  const clientId = clientInput.value.trim();
  const produit = produitSelect.value;
  const quantite = quantiteInput.value.trim();
  const prix = prixInput.value.trim();

  // ✅ Validation des champs
  if (!clientId || !produit || !quantite || !prix) {
    message.innerHTML = `
      <div style="color:red; border:1px solid red; padding:10px; background:#ffebee; border-radius:5px;">
        ⚠️ Veuillez remplir tous les champs
      </div>
    `;
    // Effacer le message après 3 secondes
    setTimeout(() => {
      if (message.innerHTML.includes("remplir tous les champs")) {
        message.innerHTML = "";
      }
    }, 3000);
    return;
  }

  // Vérifier que la quantité est positive
  if (parseFloat(quantite) <= 0) {
    message.innerHTML = `
      <div style="color:red; border:1px solid red; padding:10px; background:#ffebee; border-radius:5px;">
        ⚠️ La quantité doit être supérieure à 0
      </div>
    `;
    setTimeout(() => {
      if (message.innerHTML.includes("supérieure à 0")) {
        message.innerHTML = "";
      }
    }, 3000);
    return;
  }

  // Afficher un message de chargement
  message.innerHTML = `
    <div style="color:blue; border:1px solid blue; padding:10px; background:#e3f2fd; border-radius:5px;">
      ⏳ Enregistrement en cours...
    </div>
  `;

  try {
    // 🔍 Vérifier si le client existe
    const clientResponse = await fetch(
      `http://localhost:4000/clients/${clientId}`,
    );
    if (!clientResponse.ok) {
      message.innerHTML = `
        <div style="color:red; border:1px solid red; padding:10px; background:#ffebee; border-radius:5px;">
          ❌ Client introuvable (ID: ${clientId})
        </div>
      `;
      return;
    }
    const clientData = await clientResponse.json();

    // 💰 Calcul du total
    const total = parseFloat(prix) * parseFloat(quantite);

    // 📤 Enregistrer la vente
    const response = await fetch("http://localhost:4000/ventes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: Number(clientId),
        produit,
        quantite: Number(quantite),
        prix: Number(prix),
        total: Number(total),
        date: new Date().toLocaleString(),
      }),
    });

    const data = await response.json();
    const messageId = "successVente_" + Date.now();

    // ✅ Affichage du succès
    message.innerHTML = `
      <div id="${messageId}" style="color:green; border:2px solid green; padding:15px; background:#f0fff0; border-radius:8px; margin-top:10px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div style="flex:1;">
            <strong style="font-size:18px;">✅ Vente enregistrée avec succès !</strong><br><br>
            <table style="width:100%; border-collapse:collapse;">
              <tr><td style="padding:5px 0;"><strong>🧾 ID Vente :</strong></td><td>${data.id}</td></tr>
              <tr><td style="padding:5px 0;"><strong>👤 Client :</strong></td><td>${clientData.nom} (ID: ${clientData.id})</td></tr>
              <tr><td style="padding:5px 0;"><strong>📦 Produit :</strong></td><td>${produit}</td></tr>
              <tr><td style="padding:5px 0;"><strong>🔢 Quantité :</strong></td><td>${quantite}</td></tr>
              <tr><td style="padding:5px 0;"><strong>💰 Prix unitaire :</strong></td><td>${prix}€</td></tr>
              <tr><td style="padding:5px 0;"><strong>🧾 Total :</strong></td><td><strong style="color:#4CAF50; font-size:16px;">${total.toFixed(2)}€</strong></td></tr>
              <tr><td style="padding:5px 0;"><strong>🕒 Date :</strong></td><td>${data.date}</td></tr>
            </table>
          </div>
          <button onclick="document.getElementById('${messageId}').remove()" 
                  style="background:#ff4444; color:white; border:none; padding:8px 12px; cursor:pointer; border-radius:5px; font-size:16px; margin-left:10px;">
            ✕
          </button>
        </div>
      </div>
    `;

    // 🔄 Reset des champs
    clientInput.value = "";
    quantiteInput.value = "1";
    clientInfo.innerHTML = "";
    totalDisplay.innerHTML = "";

    // Optionnel : Focus sur l'ID client pour la prochaine vente
    clientInput.focus();
  } catch (error) {
    message.innerHTML = `
      <div style="color:red; border:1px solid red; padding:10px; background:#ffebee; border-radius:5px;">
        ❌ Erreur lors de la vente : ${error.message}<br>
        Vérifiez que le serveur est démarré sur http://localhost:4000
      </div>
    `;
    console.error("Erreur vente:", error);
  }
}

// 🔹 Ajouter la touche Entrée pour valider rapidement
clientInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    afficherClient();
  }
});

quantiteInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    venteBtn.click();
  }
});

prixInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    venteBtn.click();
  }
});

// historique des ventes

// 🔹 éléments
const showHistoriqueBtn = document.getElementById("showHistoriqueBtn");
const historiqueClientId = document.getElementById("historiqueClientId");
const historiqueMessage = document.getElementById("historiqueMessage");
const historiqueTable = document.getElementById("historiqueTable");
const tbody = historiqueTable.querySelector("tbody");
const totalQuantiteEl = document.getElementById("totalQuantite");
const totalPrixEl = document.getElementById("totalPrix");

// 🔹 Variables globales
let currentClientId = null;
let ventesOriginales = [];

// 🔹 Créer les filtres
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
  <label style="margin-right: 10px;">
    <input type="radio" name="filterType" value="all" checked> Toutes
  </label>
  <label style="margin-right: 10px;">
    <input type="radio" name="filterType" value="today"> Aujourd'hui
  </label>
  <label style="margin-right: 10px;">
    <input type="radio" name="filterType" value="week"> Cette semaine
  </label>
  <label style="margin-right: 10px;">
    <input type="radio" name="filterType" value="month"> Ce mois
  </label>
  <button id="applyFilterBtn" style="margin-left: 10px; padding: 5px 10px; background: #2196F3; color: white; border: none; border-radius: 3px; cursor: pointer;">
    Appliquer
  </button>
`;

historiqueTable.insertAdjacentElement("afterend", filterContainer);

// 🔹 Créer le bouton d'export CSV
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

// 🔹 Événements
showHistoriqueBtn.addEventListener("click", afficherHistorique);
exportBtn.addEventListener("click", exportToCSV);

// 🔹 Touche Entrée
historiqueClientId.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    afficherHistorique();
  }
});

// 🔹 Fonction principale pour afficher l'historique
async function afficherHistorique() {
  const clientId = historiqueClientId.value.trim();

  resetDisplay();

  if (!clientId) {
    showMessage("Entrez l'ID du client", "red");
    return;
  }

  showMessage("⏳ Chargement de l'historique...", "blue");

  try {
    // Vérifier le client
    const clientResponse = await fetch(
      `http://localhost:4000/clients/${clientId}`,
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

    // Récupérer les ventes
    const ventesResponse = await fetch(
      `http://localhost:4000/ventes?clientId=${clientId}`,
    );
    let ventes = await ventesResponse.json();

    if (ventes.length === 0) {
      showMessage(`📭 Aucune vente trouvée pour ${clientData.nom}`, "blue");
      filterContainer.style.display = "none";
      return;
    }

    // Stocker les ventes originales
    ventesOriginales = ventes;

    // Afficher les ventes
    displayVentes(ventes, clientData);
    filterContainer.style.display = "block";

    // Gérer le filtrage
    const applyFilterBtn = document.getElementById("applyFilterBtn");
    if (applyFilterBtn) {
      const newBtn = applyFilterBtn.cloneNode(true);
      applyFilterBtn.parentNode.replaceChild(newBtn, applyFilterBtn);
      newBtn.addEventListener("click", () =>
        appliquerFiltre(ventes, clientData),
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

// 🔹 Fonction pour afficher les ventes
function displayVentes(ventes, clientData) {
  tbody.innerHTML = "";
  let totalQuantite = 0;
  let totalPrix = 0;

  // Trier par date décroissante
  const ventesTriees = [...ventes].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB - dateA;
  });

  ventesTriees.forEach((v, index) => {
    const prix = Number(v.prix) || 0;
    const quantite = Number(v.quantite) || 0;
    const total = Number(v.total) || prix * quantite;

    const tr = document.createElement("tr");
    tr.style.borderBottom = "1px solid #ddd";
    if (index % 2 === 0) {
      tr.style.backgroundColor = "#f9f9f9";
    }

    // Créer un ID unique pour le bouton
    const btnId = `details_btn_${v.id}_${Date.now()}_${index}`;

    tr.innerHTML = `
      <td style="padding: 8px; text-align: center;">${v.id}</td>
      <td style="padding: 8px;">${escapeHtml(v.produit)}</td>
      <td style="padding: 8px; text-align: right;">${quantite}</td>
      <td style="padding: 8px; text-align: right;">${prix.toFixed(2)}€</td>
      <td style="padding: 8px; text-align: right; font-weight: bold; color: #4CAF50;">${total.toFixed(2)}€</td>
      <td style="padding: 8px;">${formatDate(v.date)}</td>
      <td style="padding: 8px; text-align: center;">
        <button id="${btnId}" 
                style="background: #2196F3; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 3px; font-size: 12px;">
          📄 Détails
        </button>
      </td>
    `;
    tbody.appendChild(tr);

    // Ajouter l'événement au bouton
    const detailsBtn = document.getElementById(btnId);
    if (detailsBtn) {
      detailsBtn.addEventListener(
        "click",
        (function (venteId) {
          return function () {
            showVenteDetails(venteId);
          };
        })(v.id),
      );
    }

    totalQuantite += quantite;
    totalPrix += total;
  });

  totalQuantiteEl.textContent = totalQuantite;
  totalPrixEl.textContent = totalPrix.toFixed(2) + "€";
  historiqueTable.style.display = "table";

  showMessage(
    `✅ ${ventes.length} vente(s) trouvée(s) pour <strong>${escapeHtml(clientData.nom)}</strong>`,
    "green",
  );
}

// 🔹 Fonction pour appliquer les filtres
function appliquerFiltre(ventesOriginales, clientData) {
  const filterType = document.querySelector(
    'input[name="filterType"]:checked',
  ).value;
  const now = new Date();
  let ventesFiltrees = [...ventesOriginales];

  switch (filterType) {
    case "today":
      ventesFiltrees = ventesOriginales.filter((v) => {
        const vDate = new Date(v.date);
        return vDate.toDateString() === now.toDateString();
      });
      break;
    case "week":
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      ventesFiltrees = ventesOriginales.filter(
        (v) => new Date(v.date) >= weekAgo,
      );
      break;
    case "month":
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      ventesFiltrees = ventesOriginales.filter(
        (v) => new Date(v.date) >= monthAgo,
      );
      break;
    default:
      break;
  }

  if (ventesFiltrees.length === 0) {
    showMessage(`📭 Aucune vente trouvée pour cette période`, "blue");
    tbody.innerHTML = "";
    totalQuantiteEl.textContent = "0";
    totalPrixEl.textContent = "0€";
    historiqueTable.style.display = "table";
  } else {
    displayVentes(ventesFiltrees, clientData);
    showMessage(
      `✅ ${ventesFiltrees.length} vente(s) trouvée(s) pour cette période`,
      "green",
    );
  }
}

// 🔹 Afficher les informations du client
function showClientInfo(clientData) {
  const infoDiv = document.createElement("div");
  infoDiv.id = "clientInfoHistorique";
  infoDiv.style.marginTop = "10px";
  infoDiv.style.marginBottom = "10px";
  infoDiv.style.padding = "10px";
  infoDiv.style.backgroundColor = "#e8f5e9";
  infoDiv.style.borderRadius = "5px";
  infoDiv.style.borderLeft = "4px solid #4CAF50";
  infoDiv.innerHTML = `
    <strong>👤 Client sélectionné :</strong><br>
    🆔 ID: ${clientData.id}<br>
    📛 Nom: ${escapeHtml(clientData.nom)}<br>
    📞 Téléphone: ${escapeHtml(clientData.telephone)}
  `;

  const existingInfo = document.getElementById("clientInfoHistorique");
  if (existingInfo) {
    existingInfo.replaceWith(infoDiv);
  } else {
    historiqueMessage.insertAdjacentElement("afterend", infoDiv);
  }
}

// 🔹 Afficher les détails d'une vente
async function showVenteDetails(venteId) {
  try {
    // Afficher un message de chargement
    showMessage("⏳ Chargement des détails...", "blue");

    const response = await fetch(`http://localhost:4000/ventes/${venteId}`);
    if (!response.ok) {
      throw new Error("Vente non trouvée");
    }

    const vente = await response.json();

    // Fermer les modals existants
    const existingModal = document.getElementById("venteDetails");
    const existingOverlay = document.getElementById("overlay");
    if (existingModal) existingModal.remove();
    if (existingOverlay) existingOverlay.remove();

    // Récupérer les infos du client
    let clientInfo = "";
    try {
      const clientResponse = await fetch(
        `http://localhost:4000/clients/${vente.clientId}`,
      );
      if (clientResponse.ok) {
        const client = await clientResponse.json();
        clientInfo = `
          <p><strong>👤 Client :</strong> ${escapeHtml(client.nom)} (ID: ${client.id})</p>
        `;
      }
    } catch (e) {
      console.error("Erreur récupération client:", e);
    }

    const detailsHtml = `
      <div id="venteDetails" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
        background: white; padding: 25px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); 
        z-index: 1000; max-width: 450px; width: 90%;">
        <h3 style="margin-top: 0; color: #4CAF50;">📋 Détails de la vente</h3>
        <hr>
        <p><strong>🆔 ID Vente :</strong> ${vente.id}</p>
        ${clientInfo}
        <p><strong>📦 Produit :</strong> ${escapeHtml(vente.produit)}</p>
        <p><strong>🔢 Quantité :</strong> ${vente.quantite}</p>
        <p><strong>💰 Prix unitaire :</strong> ${vente.prix}€</p>
        <p><strong>💵 Total :</strong> <strong style="color: #4CAF50;">${vente.total}€</strong></p>
        <p><strong>📅 Date :</strong> ${formatDate(vente.date)}</p>
        <hr>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button id="closeDetailsBtn" 
                  style="background: #4CAF50; color: white; border: none; padding: 8px 20px; cursor: pointer; border-radius: 5px;">
            Fermer
          </button>
        </div>
      </div>
      <div id="overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 999;"></div>
    `;
    document.body.insertAdjacentHTML("beforeend", detailsHtml);

    // Fermer en cliquant sur l'overlay
    const overlay = document.getElementById("overlay");
    if (overlay) {
      overlay.addEventListener("click", function () {
        const modal = document.getElementById("venteDetails");
        if (modal) modal.remove();
        overlay.remove();
      });
    }

    // Fermer avec le bouton
    const closeBtn = document.getElementById("closeDetailsBtn");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        const modal = document.getElementById("venteDetails");
        const overlayElem = document.getElementById("overlay");
        if (modal) modal.remove();
        if (overlayElem) overlayElem.remove();
      });
    }

    // Fermer avec la touche Echap
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

    // Effacer le message de chargement
    if (historiqueMessage.innerHTML.includes("Chargement des détails")) {
      historiqueMessage.innerHTML = "";
    }
  } catch (error) {
    console.error("Erreur chargement détails:", error);
    showMessage("❌ Erreur lors du chargement des détails de la vente", "red");
  }
}

// 🔹 Formater la date (version robuste)
function formatDate(dateString) {
  if (!dateString) return "Date non disponible";

  if (dateString.includes("Invalid")) {
    return "Date invalide";
  }

  let date = new Date(dateString);

  if (isNaN(date.getTime())) {
    const parts = dateString.match(
      /(\d{1,2})\/(\d{1,2})\/(\d{4})\s(\d{1,2}):(\d{2}):(\d{2})/,
    );
    if (parts) {
      const [_, day, month, year, hour, minute, second] = parts;
      date = new Date(year, month - 1, day, hour, minute, second);
    } else {
      return dateString;
    }
  }

  if (isNaN(date.getTime())) {
    return dateString;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return `Aujourd'hui à ${date.toLocaleTimeString()}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Hier à ${date.toLocaleTimeString()}`;
  } else {
    return `${date.toLocaleDateString()} à ${date.toLocaleTimeString()}`;
  }
}

// 🔹 Exporter en CSV
function exportToCSV() {
  if (!ventesOriginales || ventesOriginales.length === 0) {
    showMessage("Aucune donnée à exporter", "red");
    return;
  }

  const clientId = historiqueClientId.value;
  const headers = [
    "ID Vente",
    "Produit",
    "Quantité",
    "Prix unitaire",
    "Total",
    "Date",
  ];
  const rows = ventesOriginales.map((v) => [
    v.id,
    v.produit,
    v.quantite,
    v.prix,
    v.total,
    v.date,
  ]);

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

// 🔹 Afficher un message
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
      ) {
        historiqueMessage.innerHTML = "";
      }
    }, 5000);
  }
}

// 🔹 Reset de l'affichage
function resetDisplay() {
  tbody.innerHTML = "";
  totalQuantiteEl.textContent = "0";
  totalPrixEl.textContent = "0€";
  historiqueTable.style.display = "none";
  historiqueMessage.innerHTML = "";

  const existingInfo = document.getElementById("clientInfoHistorique");
  if (existingInfo) existingInfo.remove();

  const existingModal = document.getElementById("venteDetails");
  const existingOverlay = document.getElementById("overlay");
  if (existingModal) existingModal.remove();
  if (existingOverlay) existingOverlay.remove();
}

// 🔹 Échapper les caractères HTML
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
