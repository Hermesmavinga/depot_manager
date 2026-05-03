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
let weeklyChart = null;

// ============================================
// REDIRECTION VERS LA SECTION VENTES
// ============================================
function redirectToVente(clientId = null) {
  const navItems = document.querySelectorAll(".nav-item");
  let ventesNavItem = null;
  navItems.forEach((item) => {
    if (item.dataset.section === "ventes") {
      ventesNavItem = item;
    }
  });
  const sections = {
    dashboard: document.getElementById("dashboardSection"),
    clients: document.getElementById("clientsSection"),
    produits: document.getElementById("produitsSection"),
    ventes: document.getElementById("ventesSection"),
    historique: document.getElementById("historiqueSection"),
    rapports: document.getElementById("rapportsSection"),
  };
  if (ventesNavItem) {
    navItems.forEach((nav) => {
      nav.classList.remove("bg-emerald-600", "text-white");
      nav.classList.add("text-gray-300");
    });
    ventesNavItem.classList.add("bg-emerald-600", "text-white");
    ventesNavItem.classList.remove("text-gray-300");
    const pageTitle = document.getElementById("currentPageTitle");
    if (pageTitle) {
      pageTitle.textContent = ventesNavItem.querySelector("span").textContent;
    }
  }
  Object.values(sections).forEach((section) => {
    if (section) section.classList.add("hidden");
  });
  if (sections.ventes) sections.ventes.classList.remove("hidden");
  if (clientId) {
    const venteClientInput = document.getElementById("venteClientId");
    if (venteClientInput) {
      venteClientInput.value = clientId;
      const event = new Event("input", { bubbles: true });
      venteClientInput.dispatchEvent(event);
      showTemporaryNotification(`✅ Client sélectionné - ID: ${clientId}`);
    }
  }
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  if (window.innerWidth < 768 && sidebar) {
    sidebar.classList.add("-translate-x-full");
    if (overlay) overlay.classList.remove("active");
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function fillVenteForm(clientId) {
  redirectToVente(clientId);
}
function fillVenteFormWithId(clientId) {
  redirectToVente(clientId);
}

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
        (p) => p && p.nom && typeof p.quantite === "number" && p.quantite > 0,
      )
      .map((p) => ({
        nom: p.nom || "Produit inconnu",
        quantite: Number(p.quantite) || 0,
        prix: Number(p.prix) || 0,
      }));
    if (produitsListe.length > 0)
      total = produitsListe.reduce((sum, p) => sum + p.prix * p.quantite, 0);
  } else if (vente.produit && vente.quantite && vente.prix) {
    produitsListe = [
      {
        nom: vente.produit,
        quantite: Number(vente.quantite) || 0,
        prix: Number(vente.prix) || 0,
      },
    ];
    total = (Number(vente.prix) || 0) * (Number(vente.quantite) || 0);
  } else if (
    vente.panier &&
    Array.isArray(vente.panier) &&
    vente.panier.length > 0
  ) {
    produitsListe = vente.panier
      .filter((p) => p && p.nom)
      .map((p) => ({
        nom: p.nom,
        quantite: Number(p.quantite) || 0,
        prix: Number(p.prix) || 0,
      }));
    if (produitsListe.length > 0)
      total = produitsListe.reduce((sum, p) => sum + p.prix * p.quantite, 0);
  } else if (total > 0 && produitsListe.length === 0) {
    produitsListe = [
      { nom: "Produit (données manquantes)", quantite: 1, prix: total },
    ];
  }
  produitsListe = produitsListe.filter((p) => p.quantite > 0 && p.prix >= 0);
  if (produitsListe.length > 0 && total === 0)
    total = produitsListe.reduce((sum, p) => sum + p.prix * p.quantite, 0);
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
  rapports: document.getElementById("rapportsSection"),
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
    let quantiteTotale = 0;
    let caTotal = 0;
    ventes.forEach((v) => {
      const venteNettoyee = nettoyerVente(v);
      caTotal += venteNettoyee.total;
      quantiteTotale += venteNettoyee.produits.reduce(
        (s, p) => s + p.quantite,
        0,
      );
    });
    document.getElementById("statVentes").textContent = ventes.length;
    document.getElementById("statQuantite").textContent = quantiteTotale;
    document.getElementById("statClients").textContent = clients.length;
    document.getElementById("statCA").textContent =
      formatNumberFC(caTotal) + " FC";
    const produitsMap = new Map();
    ventes.forEach((v) => {
      const venteNettoyee = nettoyerVente(v);
      venteNettoyee.produits.forEach((p) => {
        if (!produitsMap.has(p.nom))
          produitsMap.set(p.nom, { nom: p.nom, quantite: 0 });
        produitsMap.get(p.nom).quantite += p.quantite;
      });
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
// STATISTIQUES JOURNALIÈRES
// ============================================
async function getDailyStats(date = null) {
  try {
    const response = await fetch(VENTES_URL);
    const allVentes = await response.json();
    const targetDate = date ? new Date(date) : new Date();
    const dateStr = targetDate.toISOString().split("T")[0];
    const ventesDuJour = allVentes.filter((vente) => {
      const venteDate = parseDate(vente.date);
      return venteDate.toDateString() === targetDate.toDateString();
    });
    let totalVentes = ventesDuJour.length;
    let totalMontant = 0,
      totalBouteilles = 0,
      totalCassiers = 0,
      totalEquivalentBouteilles = 0;
    const ventesDetail = [];
    for (const vente of ventesDuJour) {
      const venteNettoyee = nettoyerVente(vente);
      totalMontant += venteNettoyee.total;
      let bouteillesCount = 0,
        cassiersCount = 0,
        equivalentCount = 0;
      for (const produit of venteNettoyee.produits) {
        const isCassier = produit.prix > 50000 || produit.quantite > 10;
        if (isCassier) {
          cassiersCount += produit.quantite;
          equivalentCount += produit.quantite * 24;
        } else {
          bouteillesCount += produit.quantite;
          equivalentCount += produit.quantite;
        }
      }
      totalBouteilles += bouteillesCount;
      totalCassiers += cassiersCount;
      totalEquivalentBouteilles += equivalentCount;
      let clientInfo = { nom: "Client inconnu", id: vente.clientId };
      try {
        const clientRes = await fetch(
          `${CLIENTS_URL}/${String(vente.clientId)}`,
        );
        if (clientRes.ok) clientInfo = await clientRes.json();
      } catch (e) {}
      ventesDetail.push({
        id: vente.id,
        heure: formatDate(vente.date).split(" à ")[1] || formatDate(vente.date),
        clientNom: clientInfo.nom,
        clientId: vente.clientId,
        produits: venteNettoyee.produits,
        bouteilles: bouteillesCount,
        cassiers: cassiersCount,
        total: venteNettoyee.total,
        date: vente.date,
      });
    }
    document.getElementById("dailyTotalVentes").textContent = totalVentes;
    document.getElementById("dailyTotalMontant").textContent =
      formatNumberFC(totalMontant) + " FC";
    document.getElementById("dailyBouteilles").textContent = totalBouteilles;
    document.getElementById("dailyCassiers").textContent = totalCassiers;
    document.getElementById("dailyEquivalentBouteilles").textContent =
      totalEquivalentBouteilles;
    displayDailySalesDetail(ventesDetail, dateStr);
    await checkInconsistencies(ventesDuJour, allVentes);
    return {
      totalVentes,
      totalMontant,
      totalBouteilles,
      totalCassiers,
      totalEquivalentBouteilles,
      ventesDetail,
    };
  } catch (error) {
    console.error("Erreur chargement stats journalières:", error);
    return null;
  }
}
function displayDailySalesDetail(ventesDetail, dateStr) {
  const tbody = document.getElementById("dailySalesDetailBody");
  const footer = document.getElementById("dailySalesFooter");
  const dateDisplay = document.getElementById("selectedDateDisplay");
  if (dateDisplay) dateDisplay.textContent = ` - ${dateStr}`;
  if (!tbody) return;
  if (ventesDetail.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-400">📭 Aucune vente enregistrée ce jour</td></tr>';
    if (footer) footer.classList.add("hidden");
    return;
  }
  let totalBouteillesGlobal = 0,
    totalCassiersGlobal = 0,
    totalMontantGlobal = 0;
  tbody.innerHTML = ventesDetail
    .map((vente, index) => {
      totalBouteillesGlobal += vente.bouteilles;
      totalCassiersGlobal += vente.cassiers;
      totalMontantGlobal += vente.total;
      const produitsHtml = vente.produits
        .map(
          (p) =>
            `<div class="text-xs">${escapeHtml(p.nom)} (${p.quantite})</div>`,
        )
        .join("");
      const rowClass = index % 2 === 0 ? "bg-white" : "bg-gray-50";
      return `<tr class="${rowClass} hover:bg-gray-100 transition"><td class="px-4 py-3 text-sm font-mono">${vente.heure}</td><td class="px-4 py-3"><div class="font-medium text-gray-800">${escapeHtml(vente.clientNom)}</div><div class="text-xs text-gray-400">ID: ${vente.clientId}</div></div></td><td class="px-4 py-3 text-sm">${produitsHtml}</td><td class="px-4 py-3 text-center text-sm font-medium text-orange-600">${vente.bouteilles}</td><td class="px-4 py-3 text-center text-sm font-medium text-purple-600">${vente.cassiers}</td><td class="px-4 py-3 text-right text-sm font-bold text-emerald-600">${formatNumberFC(vente.total)} FC</td><td class="px-4 py-3 text-center"><button onclick="genererFactureVenteSpecifique('${vente.id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition"><i class="fas fa-receipt"></i> Facture</button></td></tr>`;
    })
    .join("");
  if (footer) {
    footer.classList.remove("hidden");
    document.getElementById("footerTotalBouteilles").textContent =
      totalBouteillesGlobal;
    document.getElementById("footerTotalCassiers").textContent =
      totalCassiersGlobal;
    document.getElementById("footerTotalMontant").textContent =
      formatNumberFC(totalMontantGlobal) + " FC";
  }
}
window.genererFactureVenteSpecifique = async function (venteId) {
  try {
    const response = await fetch(`${VENTES_URL}/${venteId}`);
    if (!response.ok) throw new Error("Vente non trouvée");
    const vente = await response.json();
    const clientRes = await fetch(`${CLIENTS_URL}/${String(vente.clientId)}`);
    const client = clientRes.ok
      ? await clientRes.json()
      : { nom: "Client inconnu", telephone: "N/A", id: vente.clientId };
    genererFacturePanier(vente, client);
  } catch (error) {
    showTemporaryNotification("❌ Erreur génération facture", "error");
  }
};
async function checkInconsistencies(ventesDuJour, allVentes) {
  const alerts = [];
  for (const vente of ventesDuJour) {
    const venteNettoyee = nettoyerVente(vente);
    for (const produit of venteNettoyee.produits) {
      if (produit.prix < 1000 && produit.prix > 0) {
        alerts.push({
          level: "warning",
          message: `⚠️ Prix suspect (${formatNumberFC(produit.prix)} FC) pour "${produit.nom}" - Vente #${vente.id}`,
          venteId: vente.id,
        });
      }
    }
  }
  for (const vente of ventesDuJour) {
    const venteNettoyee = nettoyerVente(vente);
    let totalQuantite = venteNettoyee.produits.reduce(
      (sum, p) => sum + p.quantite,
      0,
    );
    if (totalQuantite > 100) {
      alerts.push({
        level: "warning",
        message: `⚠️ Quantité anormalement élevée (${totalQuantite} unités) - Vente #${vente.id}`,
        venteId: vente.id,
      });
    }
  }
  const ventesParClient = {};
  for (const vente of allVentes) {
    const clientId = String(vente.clientId);
    if (!ventesParClient[clientId]) ventesParClient[clientId] = [];
    ventesParClient[clientId].push(vente);
  }
  for (const [clientId, ventes] of Object.entries(ventesParClient)) {
    for (let i = 0; i < ventes.length - 1; i++) {
      const v1 = ventes[i],
        v2 = ventes[i + 1];
      const date1 = parseDate(v1.date),
        date2 = parseDate(v2.date);
      const diffMinutes = Math.abs(date2 - date1) / 1000 / 60;
      if (diffMinutes < 2 && Math.abs(v1.total - v2.total) < 100) {
        alerts.push({
          level: "critical",
          message: `🚨 Série de ventes rapides (${Math.round(diffMinutes)} min) pour client #${clientId}`,
          venteId: v1.id,
        });
        break;
      }
    }
  }
  displayAlerts(alerts);
  return alerts;
}
function displayAlerts(alerts) {
  const container = document.getElementById("alertsContainer");
  if (!container) return;
  if (alerts.length === 0) {
    container.innerHTML = `<div class="text-center text-gray-400 py-4"><i class="fas fa-check-circle text-2xl mb-2 block text-emerald-500"></i><p>✅ Aucune anomalie détectée - Tout est conforme</p><p class="text-xs mt-1">Dernière vérification: ${new Date().toLocaleTimeString()}</p></div>`;
    return;
  }
  container.innerHTML = `<div class="space-y-2">${alerts.map((alert) => `<div class="flex items-start gap-3 p-3 rounded-lg ${alert.level === "critical" ? "bg-red-50 border-l-4 border-red-500" : "bg-yellow-50 border-l-4 border-yellow-500"}"><i class="fas ${alert.level === "critical" ? "fa-skull-crosswalk text-red-500" : "fa-exclamation-triangle text-yellow-500"} mt-0.5"></i><div class="flex-1"><p class="text-sm ${alert.level === "critical" ? "text-red-700" : "text-yellow-700"}">${alert.message}</p>${alert.venteId ? `<p class="text-xs text-gray-500 mt-1">ID Vente: ${alert.venteId}</p>` : ""}</div>${alert.venteId ? `<button onclick="genererFactureVenteSpecifique('${alert.venteId}')" class="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded">🔍 Voir</button>` : ""}</div>`).join("")}</div>`;
}
async function getWeeklyTrend() {
  try {
    const response = await fetch(VENTES_URL);
    const allVentes = await response.json();
    const stats = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const ventesDuJour = allVentes.filter((vente) => {
        const venteDate = parseDate(vente.date);
        return venteDate.toDateString() === date.toDateString();
      });
      let total = 0,
        bouteilles = 0,
        cassiers = 0;
      for (const vente of ventesDuJour) {
        const venteNettoyee = nettoyerVente(vente);
        total += venteNettoyee.total;
        for (const produit of venteNettoyee.produits) {
          if (produit.prix > 50000) cassiers += produit.quantite;
          else bouteilles += produit.quantite;
        }
      }
      stats.push({
        date: date,
        dateStr: date.toLocaleDateString("fr-FR", {
          weekday: "short",
          day: "numeric",
        }),
        total: total,
        bouteilles: bouteilles,
        cassiers: cassiers,
        ventes: ventesDuJour.length,
      });
    }
    updateWeeklyChart(stats);
    return stats;
  } catch (error) {
    console.error("Erreur tendances hebdomadaires:", error);
    return null;
  }
}
function updateWeeklyChart(stats) {
  const canvas = document.getElementById("weeklyTrendChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (weeklyChart) weeklyChart.destroy();
  weeklyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: stats.map((s) => s.dateStr),
      datasets: [
        {
          label: "Chiffre d'affaires (FC)",
          data: stats.map((s) => s.total),
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          tension: 0.3,
          fill: true,
          yAxisID: "y",
        },
        {
          label: "Bouteilles vendues",
          data: stats.map((s) => s.bouteilles),
          borderColor: "#f97316",
          backgroundColor: "rgba(249, 115, 22, 0.1)",
          tension: 0.3,
          fill: true,
          yAxisID: "y1",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "top" },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              `${ctx.dataset.label}: ${formatNumberFC(ctx.raw)} ${ctx.dataset.label.includes("FC") ? "FC" : ""}`,
          },
        },
      },
      scales: {
        y: {
          title: { display: true, text: "Montant (FC)", color: "#10b981" },
          ticks: { callback: (val) => formatNumberFC(val) },
        },
        y1: {
          position: "right",
          title: { display: true, text: "Quantité", color: "#f97316" },
          grid: { drawOnChartArea: false },
        },
      },
    },
  });
}
async function initDailyStats() {
  const dateInput = document.getElementById("dailyStatsDate");
  if (dateInput) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.value = today;
    dateInput.addEventListener("change", () => {
      getDailyStats(dateInput.value);
    });
  }
  const refreshBtn = document.getElementById("refreshDailyStats");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      const date = dateInput ? dateInput.value : null;
      getDailyStats(date);
      getWeeklyTrend();
      showTemporaryNotification("📊 Statistiques actualisées");
    });
  }
  await getDailyStats();
  await getWeeklyTrend();
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
      if (p.type === "bouteille")
        produits[p.fournisseur].bouteille[p.nom] = {
          id: p.id,
          prix: p.prix,
          format: p.format,
        };
      else if (p.type === "cassier")
        produits[p.fournisseur].cassier[p.nom] = {
          id: p.id,
          prixCassier: p.prixCassier,
          format: p.format,
          nbBouteilles: p.nbBouteilles || 24,
        };
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
// CLIENTS
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
function showLoading(container) {
  container.innerHTML = `<div class="border border-blue-500 p-3 mt-3 rounded bg-blue-50 text-blue-600">⏳ Recherche en cours...</div>`;
}
function showError(message, container) {
  container.innerHTML = `<div class="border border-red-500 p-3 mt-3 rounded bg-red-50 text-red-600">❌ ${message}</div>`;
  setTimeout(() => {
    if (container.innerHTML.includes(message)) container.innerHTML = "";
  }, 5000);
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
      tr.innerHTML = `<td class="px-4 py-3 text-sm font-mono">${client.id}<\/td><td class="px-4 py-3 text-sm">${escapeHtml(client.nom)}<\/td><td class="px-4 py-3 text-sm">${escapeHtml(client.telephone)}<\/td><td class="px-4 py-3 text-sm text-center"><button onclick="fillVenteForm('${client.id}')" class="bg-emerald-600 text-white px-3 py-1 rounded text-xs hover:bg-emerald-700 mr-2 transition">🛒 Vendre</button><button class="edit-client-btn text-blue-600 hover:text-blue-800 mr-3 transition" data-id="${client.id}" data-nom="${escapeHtml(client.nom)}" data-telephone="${escapeHtml(client.telephone)}"><i class="fas fa-edit"></i> Modifier</button><button class="delete-client-btn text-red-600 hover:text-red-800 transition" data-id="${client.id}" data-nom="${escapeHtml(client.nom)}"><i class="fas fa-trash"></i> Supprimer</button><\/td>`;
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
const messageVente = document.getElementById("venteMessage");
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
  panier.splice(index, 1);
  afficherPanier();
  showTemporaryNotification(`❌ Produit retiré du panier`);
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
  messageVente.innerHTML =
    '<div class="bg-blue-50 text-blue-600 p-3 rounded-lg">⏳ Enregistrement en cours...</div>';
  try {
    const clientResponse = await fetch(`${CLIENTS_URL}/${String(clientId)}`);
    if (!clientResponse.ok) {
      messageVente.innerHTML =
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
    messageVente.innerHTML = `<div class="bg-emerald-50 text-emerald-700 p-4 rounded-lg">✅ Vente enregistrée ! ID: ${data.id}<br>💰 Total: ${formatNumberFC(total)} FC</div>`;
    clientInput.focus();
    loadDashboardStats();
    getDailyStats();
    getWeeklyTrend();
    setTimeout(() => {
      if (messageVente.innerHTML.includes("Vente enregistrée"))
        messageVente.innerHTML = "";
    }, 5000);
  } catch (error) {
    messageVente.innerHTML = `<div class="bg-red-50 text-red-600 p-3 rounded-lg">❌ Erreur: ${error.message}</div>`;
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
if (showHistoriqueBtn)
  showHistoriqueBtn.addEventListener("click", afficherHistorique);
window.showVenteDetail = async function (venteId) {
  try {
    const response = await fetch(`${VENTES_URL}/${venteId}`);
    if (!response.ok) throw new Error("Vente non trouvée");
    const vente = await response.json();
    let clientNom = "Client inconnu";
    try {
      const clientRes = await fetch(`${CLIENTS_URL}/${String(vente.clientId)}`);
      if (clientRes.ok) {
        const client = await clientRes.json();
        clientNom = client.nom;
      }
    } catch (e) {}
    const venteNettoyee = nettoyerVente(vente);
    const produits = venteNettoyee.produits;
    const total = venteNettoyee.total;
    let produitsHtml = produits
      .map(
        (p) =>
          `<li class="flex justify-between items-center py-2 border-b border-gray-100"><span class="font-medium">${escapeHtml(p.nom)}</span><span class="text-gray-600">${p.quantite} x ${formatNumberFC(p.prix)} FC</span><span class="font-bold text-emerald-600">${formatNumberFC(p.prix * p.quantite)} FC</span></li>`,
      )
      .join("");
    let totalArticles = produits.reduce((sum, p) => sum + p.quantite, 0);
    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 bg-black/50 z-50 flex items-center justify-center";
    modal.innerHTML = `<div class="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 animate-fadeIn"><div class="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-white"><h3 class="text-lg font-semibold text-blue-800"><i class="fas fa-receipt text-blue-600 mr-2"></i> Détails de la vente</h3></div><div class="p-6 space-y-3"><div class="grid grid-cols-2 gap-2 text-sm"><p class="text-gray-500">🆔 ID Vente :</p><p class="font-mono font-medium">${vente.id}</p><p class="text-gray-500">👤 Client :</p><p class="font-medium">${escapeHtml(clientNom)}</p><p class="text-gray-500">🆔 ID Client :</p><p class="font-mono">${vente.clientId}</p></div><div class="border-t border-gray-100 pt-3"><p class="text-gray-500 text-sm mb-2">📦 Produits :</p><ul class="space-y-1 max-h-48 overflow-y-auto">${produitsHtml || '<li class="text-gray-400 text-center py-2">Aucun produit</li>'}</ul></div><div class="border-t border-gray-100 pt-3"><div class="flex justify-between items-center"><span class="text-gray-500">📊 Total articles :</span><span class="font-semibold">${totalArticles}</span></div><div class="flex justify-between items-center mt-2"><span class="text-gray-500">💰 Montant total :</span><span class="text-xl font-bold text-emerald-600">${formatNumberFC(total)} FC</span></div><div class="flex justify-between items-center mt-2"><span class="text-gray-500">📅 Date :</span><span class="text-sm">${formatDate(vente.date)}</span></div></div></div><div class="px-6 py-4 border-t flex justify-end gap-3"><button onclick="genererFactureVente('${vente.id}', '${vente.clientId}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition text-sm"><i class="fas fa-print mr-1"></i> Imprimer facture</button><button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition text-sm">Fermer</button></div></div>`;
    document.body.appendChild(modal);
  } catch (error) {
    showTemporaryNotification("❌ Erreur chargement détails", "error");
  }
};
window.genererFactureVente = async function (venteId, clientId) {
  try {
    const [venteRes, clientRes] = await Promise.all([
      fetch(`${VENTES_URL}/${venteId}`),
      fetch(`${CLIENTS_URL}/${String(clientId)}`),
    ]);
    if (!venteRes.ok) throw new Error("Vente non trouvée");
    const vente = await venteRes.json();
    const client = clientRes.ok
      ? await clientRes.json()
      : { nom: "Client inconnu", telephone: "N/A", id: clientId };
    genererFacturePanier(vente, client);
  } catch (error) {
    showTemporaryNotification("❌ Erreur génération facture", "error");
  }
};
async function afficherHistorique() {
  const clientId = historiqueClientIdElem.value.trim();
  if (!clientId) {
    historiqueMessageDiv.innerHTML =
      '<span class="text-red-600">⚠️ Veuillez entrer un ID client</span>';
    return;
  }
  try {
    const clientResponse = await fetch(`${CLIENTS_URL}/${String(clientId)}`);
    if (!clientResponse.ok) {
      historiqueMessageDiv.innerHTML = `<span class="text-red-600">❌ Client avec l'ID "${clientId}" non trouvé</span>`;
      return;
    }
    const clientData = await clientResponse.json();
    const ventesRes = await fetch(VENTES_URL);
    const allVentes = await ventesRes.json();
    const ventes = allVentes.filter(
      (v) => String(v.clientId) === String(clientId),
    );
    if (ventes.length === 0) {
      historiqueMessageDiv.innerHTML = `<span class="text-blue-600">📭 Aucune vente trouvée pour ${clientData.nom}</span>`;
      historiqueTableElem.classList.add("hidden");
      return;
    }
    historiqueMessageDiv.innerHTML = `<span class="text-emerald-600">✅ ${ventes.length} vente(s) trouvée(s) pour ${escapeHtml(clientData.nom)} (ID: ${clientData.id})</span>`;
    displayVentesMulti(ventes, clientData);
  } catch (error) {
    historiqueMessageDiv.innerHTML = `<span class="text-red-600">❌ Erreur: ${error.message}</span>`;
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
      row.innerHTML = `<td class="px-4 py-3 text-sm font-mono">${v.id.substring(0, 8)}<\/td><td class="px-4 py-3 text-sm">${afficherProduitsListe(produitsListe)}<\/td><td class="px-4 py-3 text-sm text-center font-medium">${quantiteTotale}<\/td><td class="px-4 py-3 text-sm text-right">${formatNumberFC(prixMoyen)} FC<\/td><td class="px-4 py-3 text-sm text-right font-bold text-emerald-600">${formatNumberFC(total)} FC<\/td><td class="px-4 py-3 text-sm">${formatDate(v.date)}<\/td><td class="px-4 py-3 text-sm text-center"><button onclick="showVenteDetail('${v.id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition mr-1">📄 Détails</button><button onclick="genererFactureVente('${v.id}', '${clientData.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-xs transition">🧾 Facture</button><\/td>`;
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
    filterContainer.innerHTML = `<div class="flex flex-wrap items-center justify-between gap-4"><div><strong class="text-gray-700"><i class="fas fa-filter mr-1"></i> 🔍 Filtrer les ventes :</strong></div><div class="flex flex-wrap gap-3"><label class="inline-flex items-center gap-2 cursor-pointer"><input type="radio" name="filterType" value="all" checked class="text-emerald-600 w-4 h-4"> <span class="text-sm">📅 Toutes</span></label><label class="inline-flex items-center gap-2 cursor-pointer"><input type="radio" name="filterType" value="today" class="text-emerald-600 w-4 h-4"> <span class="text-sm">📆 Aujourd'hui</span></label><label class="inline-flex items-center gap-2 cursor-pointer"><input type="radio" name="filterType" value="week" class="text-emerald-600 w-4 h-4"> <span class="text-sm">📊 Cette semaine</span></label><label class="inline-flex items-center gap-2 cursor-pointer"><input type="radio" name="filterType" value="month" class="text-emerald-600 w-4 h-4"> <span class="text-sm">📈 Ce mois</span></label><button id="applyFilterBtn" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg transition text-sm"><i class="fas fa-check mr-1"></i> Appliquer</button><button id="resetFilterBtn" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-1.5 rounded-lg transition text-sm"><i class="fas fa-undo-alt mr-1"></i> Réinitialiser</button></div></div>`;
    const historiqueContainer =
      document.getElementById("historiqueTable").parentElement;
    historiqueContainer.appendChild(filterContainer);
  }
  const applyFilterBtn = document.getElementById("applyFilterBtn");
  const resetFilterBtn = document.getElementById("resetFilterBtn");
  if (applyFilterBtn) {
    const newBtn = applyFilterBtn.cloneNode(true);
    applyFilterBtn.parentNode.replaceChild(newBtn, applyFilterBtn);
    newBtn.addEventListener("click", () => appliquerFiltre(ventes, clientData));
  }
  if (resetFilterBtn) {
    const newResetBtn = resetFilterBtn.cloneNode(true);
    resetFilterBtn.parentNode.replaceChild(newResetBtn, resetFilterBtn);
    newResetBtn.addEventListener("click", () => {
      const allRadio = document.querySelector(
        'input[name="filterType"][value="all"]',
      );
      if (allRadio) allRadio.checked = true;
      displayVentesMulti(ventes, clientData);
      showTemporaryNotification("📋 Filtre réinitialisé");
    });
  }
  const existingButtons = document.querySelector(".action-buttons-container");
  if (existingButtons) existingButtons.remove();
  const actionButtons = document.createElement("div");
  actionButtons.className =
    "action-buttons-container flex gap-3 mt-4 justify-end";
  actionButtons.innerHTML = `<button id="exportCsvActionBtn" class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"><i class="fas fa-file-excel"></i> Exporter CSV</button><button id="factureMensuelleActionBtn" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"><i class="fas fa-file-invoice"></i> Facture mensuelle</button>`;
  const historiqueContainerActions =
    document.getElementById("historiqueTable").parentElement;
  historiqueContainerActions.appendChild(actionButtons);
  document
    .getElementById("exportCsvActionBtn")
    ?.addEventListener("click", () => exportToCSV(ventes, clientData));
  document
    .getElementById("factureMensuelleActionBtn")
    ?.addEventListener("click", () =>
      genererFactureMensuelleMulti(ventes, clientData),
    );
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
    historiqueMessageDiv.innerHTML = `<span class="text-blue-600">📭 Aucune vente trouvée pour cette période</span>`;
    if (historiqueTableBody) historiqueTableBody.innerHTML = "";
    document.getElementById("totalQuantite").textContent = "0";
    document.getElementById("totalPrix").textContent = "0 FC";
  } else {
    displayVentesMulti(ventesFiltrees, clientData);
    historiqueMessageDiv.innerHTML = `<span class="text-emerald-600">✅ ${ventesFiltrees.length} vente(s) trouvée(s) pour cette période</span>`;
  }
}

// ============================================
// RAPPORTS MENSUELS
// ============================================
async function chargerClientsPourRapport() {
  try {
    const response = await fetch(CLIENTS_URL);
    const clients = await response.json();
    const select = document.getElementById("rapportClientSelect");
    if (select) {
      select.innerHTML = '<option value="">-- Tous les clients --</option>';
      clients.forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = `${escapeHtml(c.nom)} (${c.id})`;
        select.appendChild(opt);
      });
    }
  } catch (e) {
    console.error("Erreur chargement clients rapport", e);
  }
}
async function genererRapportMensuel() {
  const clientId = document.getElementById("rapportClientSelect")?.value;
  const mois = parseInt(document.getElementById("rapportMoisSelect")?.value);
  const annee = parseInt(document.getElementById("rapportAnneeSelect")?.value);
  showTemporaryNotification("⏳ Génération du rapport...");
  try {
    const ventesRes = await fetch(VENTES_URL);
    const clientsRes = await fetch(CLIENTS_URL);
    const toutesVentes = await ventesRes.json();
    const tousClients = await clientsRes.json();
    let ventesFiltrees = toutesVentes.filter((v) => {
      const d = parseDate(v.date);
      return (
        !isNaN(d.getTime()) &&
        d.getMonth() + 1 === mois &&
        d.getFullYear() === annee
      );
    });
    if (clientId && clientId !== "")
      ventesFiltrees = ventesFiltrees.filter(
        (v) => String(v.clientId) === String(clientId),
      );
    if (ventesFiltrees.length === 0) {
      showTemporaryNotification("📭 Aucune donnée pour cette période", "error");
      document.getElementById("rapportTable")?.classList.add("hidden");
      document.getElementById("rapportResume")?.classList.add("hidden");
      document.getElementById("rapportEmpty")?.classList.remove("hidden");
      return;
    }
    document.getElementById("rapportEmpty")?.classList.add("hidden");
    const totaux = new Map();
    ventesFiltrees.forEach((v) => {
      const id = String(v.clientId);
      const venteNettoyee = nettoyerVente(v);
      const total = venteNettoyee.total;
      if (!totaux.has(id)) totaux.set(id, { nb: 0, total: 0 });
      const t = totaux.get(id);
      t.nb++;
      t.total += total;
    });
    const tbody = document.getElementById("rapportTableBody");
    const table = document.getElementById("rapportTable");
    if (tbody) {
      tbody.innerHTML = "";
      let totalGlobal = 0,
        nbGlobal = 0;
      for (let [id, data] of totaux) {
        const client = tousClients.find((c) => String(c.id) === String(id));
        const remise = data.total * 0.05;
        totalGlobal += data.total;
        nbGlobal += data.nb;
        const tr = document.createElement("tr");
        tr.className = "border-b border-gray-100 hover:bg-gray-50";
        tr.innerHTML = `<td class="px-4 py-3"><div class="font-medium">${client ? escapeHtml(client.nom) : "Client " + id}</div><div class="text-xs text-gray-400">ID: ${id}</div></div></td><td class="px-4 py-3 text-center">${data.nb}</td><td class="px-4 py-3 text-right">${formatNumberFC(data.total)} FC</td><td class="px-4 py-3 text-right text-orange-600">${formatNumberFC(remise)} FC</td><td class="px-4 py-3 text-right font-bold text-emerald-600">${formatNumberFC(data.total - remise)} FC</td><td class="px-4 py-3 text-center"><button onclick="showTemporaryNotification('Facture mensuelle en cours...')" class="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs transition">🧾 Facture</button></td>`;
        tbody.appendChild(tr);
      }
      document.getElementById("rapportFootNbVentes").textContent = nbGlobal;
      document.getElementById("rapportFootTotal").textContent =
        formatNumberFC(totalGlobal) + " FC";
      document.getElementById("rapportFootRemise").textContent =
        formatNumberFC(totalGlobal * 0.05) + " FC";
      document.getElementById("rapportFootNet").textContent =
        formatNumberFC(totalGlobal * 0.95) + " FC";
      if (table) table.classList.remove("hidden");
      const resume = document.getElementById("rapportResume");
      if (resume) {
        resume.classList.remove("hidden");
        document.getElementById("rapportTotalVentes").textContent = nbGlobal;
        document.getElementById("rapportMontantTotal").textContent =
          formatNumberFC(totalGlobal) + " FC";
        document.getElementById("rapportRemise").textContent =
          formatNumberFC(totalGlobal * 0.05) + " FC";
      }
    }
    showTemporaryNotification("✅ Rapport généré avec succès !");
  } catch (e) {
    console.error(e);
    showTemporaryNotification(
      "❌ Erreur lors de la génération du rapport",
      "error",
    );
  }
}
function initRapports() {
  const genererBtn = document.getElementById("genererRapportBtn");
  if (genererBtn) genererBtn.addEventListener("click", genererRapportMensuel);
  const exporterBtn = document.getElementById("exporterRapportBtn");
  if (exporterBtn) {
    exporterBtn.addEventListener("click", () => {
      showTemporaryNotification("📥 Export CSV - Fonctionnalité à compléter");
    });
  }
  const anneeSelect = document.getElementById("rapportAnneeSelect");
  if (anneeSelect) anneeSelect.value = new Date().getFullYear();
  const moisSelect = document.getElementById("rapportMoisSelect");
  if (moisSelect) moisSelect.value = new Date().getMonth() + 1;
  chargerClientsPourRapport();
}

// ============================================
// FACTURES
// ============================================
function genererFacturePanier(vente, client) {
  if (typeof window.jspdf === "undefined") {
    showTemporaryNotification(
      "❌ Erreur: Bibliothèque PDF non chargée",
      "error",
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
  doc.text("VentesPro SARL", marginX, 35);
  doc.text("Kinshasa, RDC", marginX, 45);
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
  doc.text(`Téléphone: ${client.telephone || "N/A"}`, marginX, 75);
  doc.text(`ID Client: ${client.id}`, marginX, 82);
  doc.line(marginX, 90, rightX, 90);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Détails des produits", marginX, 102);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Produit", marginX, 112);
  doc.text("Qté", 100, 112);
  doc.text("Prix unit.", 130, 112);
  doc.text("Total", 165, 112);
  doc.line(marginX, 114, rightX, 114);
  let yPosition = 122;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  produits.forEach((item) => {
    const sousTotal = item.prix * item.quantite;
    doc.text(item.nom.substring(0, 30), marginX, yPosition);
    doc.text(item.quantite.toString(), 100, yPosition);
    doc.text(`${formatNumberFC(item.prix)} FC`, 130, yPosition);
    doc.text(`${formatNumberFC(sousTotal)} FC`, 165, yPosition);
    yPosition += 7;
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
    showTemporaryNotification(
      "❌ Erreur: Bibliothèque PDF non chargée",
      "error",
    );
    return;
  }
  const maintenant = new Date();
  const moisActuel = maintenant.getMonth();
  const anneeActuelle = maintenant.getFullYear();
  const ventesDuMois = ventes.filter((v) => {
    const dateVente = parseDate(v.date);
    if (isNaN(dateVente.getTime())) return false;
    return (
      dateVente.getMonth() === moisActuel &&
      dateVente.getFullYear() === anneeActuelle
    );
  });
  if (ventesDuMois.length === 0) {
    showTemporaryNotification(
      "📭 Aucune vente ce mois-ci pour ce client",
      "error",
    );
    return;
  }
  let total = 0;
  ventesDuMois.forEach((v) => {
    const venteNettoyee = nettoyerVente(v);
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
  doc.text("Kinshasa, RDC", marginX, 45);
  doc.text(`Période: ${moisTexte}`, rightX - 40, 35, { align: "right" });
  doc.text(`Date: ${dateFacture}`, rightX - 40, 40, { align: "right" });
  doc.line(marginX, 55, rightX, 55);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Client :", marginX, 68);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(client.nom, marginX + 30, 68);
  doc.text(`Téléphone: ${client.telephone || "N/A"}`, marginX, 75);
  doc.text(`ID Client: ${client.id}`, marginX, 82);
  doc.line(marginX, 90, rightX, 90);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Récapitulatif des achats - ${moisTexte}`, marginX, 102);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Date", marginX, 112);
  doc.text("Produits", 55, 112);
  doc.text("Total", 160, 112);
  doc.line(marginX, 114, rightX, 114);
  let yPosition = 122;
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
    yPosition += 6;
    if (yPosition > 250 && index < ventesDuMois.length - 1) {
      doc.addPage();
      yPosition = 20;
    }
  });
  yPosition += 8;
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
    showTemporaryNotification("📭 Aucune donnée à exporter", "error");
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
    ) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
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
initRapports();
initDailyStats();
showTemporaryNotification("Bienvenue sur VentesPro !");
