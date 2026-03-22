// trouver un client

const API_URL = "http://localhost:4000/clients";

const button = document.getElementById("searchBtn");

button.addEventListener("click", searchClient);

async function searchClient() {
  const clientId = document.getElementById("clientId").value;
  const result = document.getElementById("result");

  if (!clientId) {
    result.innerHTML = "<p style='color:red;'>Veuillez entrer un ID</p>";
    return;
  }

  try {
    const response = await fetch(`${API_URL}/${clientId}`);

    if (!response.ok) {
      throw new Error("Client non trouvé");
    }

    const client = await response.json();

    displayClient(client);
  } catch (error) {
    result.innerHTML = `<p style="color:red;">${error.message}</p>`;
  }
}

function displayClient(client) {
  const result = document.getElementById("result");

  result.innerHTML = `
    <div style="border:1px solid #ccc; padding:10px; margin-top:10px;">
      <h3>Client trouvé</h3>
      <p><strong>ID :</strong> ${client.id}</p>
      <p><strong>Nom :</strong> ${client.nom}</p>
      <p><strong>Téléphone :</strong> ${client.telephone}</p>
    </div>
  `;
}

document.getElementById("clientId").addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    searchClient();
  }
});

// trouver un client fin

// creation dun client

const addBtn = document.getElementById("addClientBtn");

addBtn.addEventListener("click", addClient);

async function addClient() {
  const nom = document.getElementById("nom").value;
  const telephone = document.getElementById("telephone").value;
  const message = document.getElementById("message");

  if (!nom || !telephone) {
    message.innerHTML =
      "<span style='color:red;'>Remplis tous les champs</span>";
    return;
  }

  try {
    const response = await fetch("http://localhost:4000/clients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ nom, telephone }),
    });

    const data = await response.json();

    message.innerHTML = `
      <div id="successBox" style="color:green; border:1px solid green; padding:10px;">
        ✅ Client ajouté avec succès <br>
        🆔 ID du client : <strong>${data.id}</strong>
        <br><br>
        <button onclick="document.getElementById('successBox').remove()">Fermer</button>
      </div>
    `;
  } catch (error) {
    message.innerHTML =
      "<span style='color:red;'>Erreur lors de l'ajout</span>";
  }
}

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

// 🔹 bouton pour afficher l'historique
showHistoriqueBtn.addEventListener("click", afficherHistorique);

async function afficherHistorique() {
  const clientId = historiqueClientId.value.trim();
  tbody.innerHTML = "";
  totalQuantiteEl.textContent = "0";
  totalPrixEl.textContent = "0$";
  historiqueTable.style.display = "none";
  historiqueMessage.innerHTML = "";

  if (!clientId) {
    historiqueMessage.innerHTML =
      "<span style='color:red;'>Entrez l'ID du client</span>";
    return;
  }

  try {
    // 🔍 Vérifier le client
    const clientResponse = await fetch(
      `http://localhost:4000/clients/${clientId}`,
    );
    if (!clientResponse.ok) {
      historiqueMessage.innerHTML =
        "<span style='color:red;'>❌ Client introuvable</span>";
      return;
    }
    const clientData = await clientResponse.json();

    // 🔍 Récupérer les ventes du client
    const ventesResponse = await fetch(
      `http://localhost:4000/ventes?clientId=${clientId}`,
    );
    const ventes = await ventesResponse.json();

    if (ventes.length === 0) {
      historiqueMessage.innerHTML = `<span style='color:blue;'>Aucune vente pour ${clientData.nom}</span>`;
      return;
    }

    // 🔹 Remplir le tableau
    let totalQuantite = 0;
    let totalPrix = 0;

    ventes.forEach((v) => {
      const prix = Number(v.prix) || 0; // prix par défaut 0 si absent
      const quantite = Number(v.quantite) || 0; // quantite par défaut 0 si absent
      const total = Number(v.total) || prix * quantite; // calcul total si absent

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${v.id}</td>
        <td>${v.produit}</td>
        <td>${quantite}</td>
        <td>${prix}$</td>
        <td>${total}$</td>
        <td>${v.date}</td>
      `;
      tbody.appendChild(tr);

      totalQuantite += quantite;
      totalPrix += total;
    });

    totalQuantiteEl.textContent = totalQuantite;
    totalPrixEl.textContent = totalPrix + "$";
    historiqueTable.style.display = "table";
    historiqueMessage.innerHTML = `<span style='color:green;'>Historique des ventes pour <strong>${clientData.nom}</strong></span>`;
  } catch (error) {
    console.error(error);
    historiqueMessage.innerHTML =
      "<span style='color:red;'>Erreur lors de la récupération des ventes</span>";
  }
}
