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

// 🔹 Écoute la saisie de l'ID client pour auto affichage
clientInput.addEventListener("input", afficherClient);

// 🔹 Fonction auto affichage client
async function afficherClient() {
  const clientId = clientInput.value;

  if (!clientId) {
    clientInfo.innerHTML = "";
    return;
  }

  try {
    const response = await fetch(`http://localhost:4000/clients/${clientId}`);

    if (!response.ok) {
      clientInfo.innerHTML =
        "<span style='color:red;'>❌ Client introuvable</span>";
      return;
    }

    const data = await response.json();
    clientInfo.innerHTML = `<span style="color:green;">👤 Client : <strong>${data.nom}</strong></span>`;
  } catch (error) {
    clientInfo.innerHTML =
      "<span style='color:red;'>Erreur de connexion</span>";
  }
}

// 🔹 Écoute du bouton pour enregistrer la vente
venteBtn.addEventListener("click", addVente);

// 🔹 Fonction pour ajouter une vente
async function addVente() {
  const clientId = clientInput.value;
  const produit = document.getElementById("produit").value;
  const quantite = document.getElementById("quantite").value;
  const prix = document.getElementById("prix").value;

  // ✅ Validation des champs
  if (!clientId || !produit || !quantite || !prix) {
    message.innerHTML =
      "<span style='color:red;'>Remplis tous les champs</span>";
    return;
  }

  try {
    // 🔍 Vérifier si le client existe
    const clientResponse = await fetch(
      `http://localhost:4000/clients/${clientId}`,
    );
    if (!clientResponse.ok) {
      message.innerHTML =
        "<span style='color:red;'>❌ Client introuvable</span>";
      return;
    }
    const clientData = await clientResponse.json();

    // 💰 Calcul du total
    const total = prix * quantite;

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

    // ✅ Affichage du succès
    message.innerHTML = `
      <div style="color:green; border:1px solid green; padding:10px;">
        ✅ Vente enregistrée avec succès <br><br>
        🧾 ID Vente : <strong>${data.id}</strong><br>
        👤 Client : <strong>${clientData.nom}</strong><br>
        📦 Produit : <strong>${produit}</strong><br>
        🔢 Quantité : <strong>${quantite}</strong><br>
        💰 Prix : <strong>${prix}$</strong><br>
        🧾 Total : <strong>${total}$</strong><br>
        🕒 Date : <strong>${data.date}</strong>
        <br><br>
        <button onclick="this.parentElement.remove()">Fermer</button>
      </div>
    `;

    // 🔄 Reset des champs
    clientInput.value = "";
    document.getElementById("quantite").value = "";
    document.getElementById("prix").value = "";
    clientInfo.innerHTML = "";
  } catch (error) {
    message.innerHTML =
      "<span style='color:red;'>Erreur lors de la vente</span>";
    console.error(error);
  }
}
