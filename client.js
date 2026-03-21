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
