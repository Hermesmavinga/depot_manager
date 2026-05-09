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
const ACHATS_URL = `${API_BASE_URL}/achats`;

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
let lastDailyVentesDetail = [];
let currentClientData = null;
let currentClientVentes = [];
let currentFilterYear = "all";
let achatsList = [];
let currentEditAchatId = null;

// ============================================
// REDIRECTION VERS LA SECTION VENTES
// ============================================
function redirectToVente(clientId = null) {
  const navItems = document.querySelectorAll(".nav-item");
  let ventesNavItem = null;
  navItems.forEach((item) => {
    if (item.dataset.section === "ventes") ventesNavItem = item;
  });
  const sections = {
    dashboard: document.getElementById("dashboardSection"),
    clients: document.getElementById("clientsSection"),
    produits: document.getElementById("produitsSection"),
    ventes: document.getElementById("ventesSection"),
    historique: document.getElementById("historiqueSection"),
    rapports: document.getElementById("rapportsSection"),
    achats: document.getElementById("achatsSection"),
  };
  if (ventesNavItem) {
    navItems.forEach((nav) => {
      nav.classList.remove("bg-emerald-600", "text-white");
      nav.classList.add("text-gray-300");
    });
    ventesNavItem.classList.add("bg-emerald-600", "text-white");
    ventesNavItem.classList.remove("text-gray-300");
    const pageTitle = document.getElementById("currentPageTitle");
    if (pageTitle)
      pageTitle.textContent = ventesNavItem.querySelector("span").textContent;
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
function afficherProduitsListe(prods) {
  if (!prods || prods.length === 0) return "Aucun produit";
  return prods
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
  achats: document.getElementById("achatsSection"),
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
    let quantiteTotale = 0,
      caTotal = 0;
    ventes.forEach((v) => {
      const vn = nettoyerVente(v);
      caTotal += vn.total;
      quantiteTotale += vn.produits.reduce((s, p) => s + p.quantite, 0);
    });
    document.getElementById("statVentes").textContent = ventes.length;
    document.getElementById("statQuantite").textContent = quantiteTotale;
    document.getElementById("statClients").textContent = clients.length;
    document.getElementById("statCA").textContent =
      formatNumberFC(caTotal) + " FC";
    const produitsMap = new Map();
    ventes.forEach((v) => {
      const vn = nettoyerVente(v);
      vn.produits.forEach((p) => {
        if (!produitsMap.has(p.nom))
          produitsMap.set(p.nom, { nom: p.nom, quantite: 0 });
        produitsMap.get(p.nom).quantite += p.quantite;
      });
    });
    const topProduits = Array.from(produitsMap.values())
      .sort((a, b) => b.quantite - a.quantite)
      .slice(0, 5);
    const topDiv = document.getElementById("topProduitsList");
    if (topDiv) {
      if (topProduits.length === 0) {
        topDiv.innerHTML =
          '<div class="px-6 py-8 text-center text-gray-400"><i class="fas fa-chart-simple text-3xl mb-2 block"></i><p>Aucune donnée</p></div>';
      } else {
        topDiv.innerHTML = topProduits
          .map(
            (p, i) =>
              `<div class="flex justify-between items-center px-6 py-3 hover:bg-gray-50"><span class="font-medium text-gray-700"><span class="text-emerald-600 font-bold mr-2">${i + 1}.</span> ${escapeHtml(p.nom)}</span><span class="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-semibold">${p.quantite} unités</span></div>`,
          )
          .join("");
      }
    }
  } catch (error) {
    console.error(error);
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
      const vd = parseDate(vente.date);
      return vd.toDateString() === targetDate.toDateString();
    });
    let totalVentes = ventesDuJour.length,
      totalMontant = 0,
      totalBouteilles = 0,
      totalCassiers = 0,
      totalEquivalent = 0;
    const ventesDetail = [];
    for (const vente of ventesDuJour) {
      const vn = nettoyerVente(vente);
      totalMontant += vn.total;
      let bc = 0,
        cc = 0,
        eq = 0;
      const produitsAvecType = [];
      for (const p of vn.produits) {
        const isCassier = p.prix > 50000 || p.quantite > 10;
        if (isCassier) {
          cc += p.quantite;
          eq += p.quantite * 24;
          produitsAvecType.push({
            ...p,
            type: "cassier",
            nbBouteillesParCassier: 24,
          });
        } else {
          bc += p.quantite;
          eq += p.quantite;
          produitsAvecType.push({ ...p, type: "bouteille" });
        }
      }
      totalBouteilles += bc;
      totalCassiers += cc;
      totalEquivalent += eq;
      let clientInfo = { nom: "Client inconnu", id: vente.clientId };
      try {
        const cr = await fetch(`${CLIENTS_URL}/${String(vente.clientId)}`);
        if (cr.ok) clientInfo = await cr.json();
      } catch (e) {}
      ventesDetail.push({
        id: vente.id,
        heure: formatDate(vente.date).split(" à ")[1] || formatDate(vente.date),
        clientNom: clientInfo.nom,
        clientId: vente.clientId,
        produits: produitsAvecType,
        bouteilles: bc,
        cassiers: cc,
        total: vn.total,
        date: vente.date,
      });
    }
    lastDailyVentesDetail = ventesDetail;
    document.getElementById("dailyTotalVentes").textContent = totalVentes;
    document.getElementById("dailyTotalMontant").textContent =
      formatNumberFC(totalMontant) + " FC";
    document.getElementById("dailyBouteilles").textContent = totalBouteilles;
    document.getElementById("dailyCassiers").textContent = totalCassiers;
    document.getElementById("dailyEquivalentBouteilles").textContent =
      totalEquivalent;
    displayDailySalesDetail(ventesDetail, dateStr);
    await checkInconsistencies(ventesDuJour, allVentes);
    return {
      totalVentes,
      totalMontant,
      totalBouteilles,
      totalCassiers,
      totalEquivalent,
      ventesDetail,
    };
  } catch (error) {
    console.error(error);
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
  let tb = 0,
    tc = 0,
    tm = 0;
  tbody.innerHTML = ventesDetail
    .map((v, i) => {
      tb += v.bouteilles;
      tc += v.cassiers;
      tm += v.total;
      return `<tr class="${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100 transition"><td class="px-4 py-3 text-sm font-mono">${v.heure}</td><td class="px-4 py-3"><div class="font-medium">${escapeHtml(v.clientNom)}</div><div class="text-xs text-gray-400">ID: ${v.clientId}</div></td><td class="px-4 py-3 text-sm">${v.produits.map((p) => `<div class="text-xs">${escapeHtml(p.nom)} (${p.quantite})</div>`).join("")}</td><td class="px-4 py-3 text-center text-orange-600">${v.bouteilles}</td><td class="px-4 py-3 text-center text-purple-600">${v.cassiers}</td><td class="px-4 py-3 text-right font-bold text-emerald-600">${formatNumberFC(v.total)} FC</td><td class="px-4 py-3 text-center"><button onclick="genererFactureVenteSpecifique('${v.id}')" class="bg-blue-600 text-white px-2 py-1 rounded text-xs">🧾 Facture</button></td></tr>`;
    })
    .join("");
  if (footer) {
    footer.classList.remove("hidden");
    document.getElementById("footerTotalBouteilles").textContent = tb;
    document.getElementById("footerTotalCassiers").textContent = tc;
    document.getElementById("footerTotalMontant").textContent =
      formatNumberFC(tm) + " FC";
  }
}
window.genererFactureVenteSpecifique = async function (venteId) {
  try {
    const v = await (await fetch(`${VENTES_URL}/${venteId}`)).json();
    const c = await (
      await fetch(`${CLIENTS_URL}/${String(v.clientId)}`)
    ).json();
    genererFacturePanier(v, c);
  } catch (e) {
    showTemporaryNotification("❌ Erreur", "error");
  }
};
async function checkInconsistencies(ventesDuJour, allVentes) {
  const alerts = [];
  for (const v of ventesDuJour) {
    const vn = nettoyerVente(v);
    for (const p of vn.produits) {
      if (p.prix < 1000 && p.prix > 0)
        alerts.push({
          level: "warning",
          message: `⚠️ Prix suspect (${formatNumberFC(p.prix)} FC) - Vente #${v.id}`,
          venteId: v.id,
        });
    }
  }
  for (const v of ventesDuJour) {
    const vn = nettoyerVente(v);
    const qt = vn.produits.reduce((s, p) => s + p.quantite, 0);
    if (qt > 100)
      alerts.push({
        level: "warning",
        message: `⚠️ Quantité anormale (${qt} unités) - Vente #${v.id}`,
        venteId: v.id,
      });
  }
  const ventesParClient = {};
  for (const v of allVentes) {
    const cid = String(v.clientId);
    if (!ventesParClient[cid]) ventesParClient[cid] = [];
    ventesParClient[cid].push(v);
  }
  for (const [cid, ventes] of Object.entries(ventesParClient)) {
    for (let i = 0; i < ventes.length - 1; i++) {
      const v1 = ventes[i],
        v2 = ventes[i + 1];
      const diff =
        Math.abs(parseDate(v2.date) - parseDate(v1.date)) / 1000 / 60;
      if (diff < 2 && Math.abs(v1.total - v2.total) < 100) {
        alerts.push({
          level: "critical",
          message: `🚨 Ventes rapides (${Math.round(diff)} min) - Client #${cid}`,
          venteId: v1.id,
        });
        break;
      }
    }
  }
  const container = document.getElementById("alertsContainer");
  if (!container) return;
  if (alerts.length === 0) {
    container.innerHTML = `<div class="text-center text-gray-400 py-4"><i class="fas fa-check-circle text-2xl mb-2 block text-emerald-500"></i><p>✅ Aucune anomalie détectée</p><p class="text-xs">${new Date().toLocaleTimeString()}</p></div>`;
    return;
  }
  container.innerHTML = `<div class="space-y-2">${alerts.map((a) => `<div class="flex items-start gap-3 p-3 rounded-lg ${a.level === "critical" ? "bg-red-50 border-l-4 border-red-500" : "bg-yellow-50 border-l-4 border-yellow-500"}"><i class="fas ${a.level === "critical" ? "fa-skull-crosswalk text-red-500" : "fa-exclamation-triangle text-yellow-500"} mt-0.5"></i><div class="flex-1"><p class="text-sm ${a.level === "critical" ? "text-red-700" : "text-yellow-700"}">${a.message}</p>${a.venteId ? `<p class="text-xs text-gray-500">ID: ${a.venteId}</p>` : ""}</div>${a.venteId ? `<button onclick="genererFactureVenteSpecifique('${a.venteId}')" class="text-xs bg-gray-200 px-2 py-1 rounded">🔍</button>` : ""}</div>`).join("")}</div>`;
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
      const ventesDuJour = allVentes.filter(
        (v) => parseDate(v.date).toDateString() === date.toDateString(),
      );
      let total = 0,
        b = 0,
        c = 0;
      for (const v of ventesDuJour) {
        const vn = nettoyerVente(v);
        total += vn.total;
        for (const p of vn.produits) {
          if (p.prix > 50000) c += p.quantite;
          else b += p.quantite;
        }
      }
      stats.push({
        date,
        dateStr: date.toLocaleDateString("fr-FR", {
          weekday: "short",
          day: "numeric",
        }),
        total,
        bouteilles: b,
        cassiers: c,
      });
    }
    updateWeeklyChart(stats);
    return stats;
  } catch (e) {
    console.error(e);
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
          label: "CA (FC)",
          data: stats.map((s) => s.total),
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,0.1)",
          tension: 0.3,
          fill: true,
          yAxisID: "y",
        },
        {
          label: "Bouteilles",
          data: stats.map((s) => s.bouteilles),
          borderColor: "#f97316",
          backgroundColor: "rgba(249,115,22,0.1)",
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
            label: (ctx) => `${ctx.dataset.label}: ${formatNumberFC(ctx.raw)}`,
          },
        },
      },
      scales: {
        y: {
          title: { display: true, text: "Montant (FC)" },
          ticks: { callback: (val) => formatNumberFC(val) },
        },
        y1: {
          position: "right",
          title: { display: true, text: "Quantité" },
          grid: { drawOnChartArea: false },
        },
      },
    },
  });
}

// ============================================
// POPUPS DE DÉTAIL POUR BOUTEILLES ET CASSIERS
// ============================================
function showBouteillesDetail() {
  if (!lastDailyVentesDetail || lastDailyVentesDetail.length === 0) {
    showTemporaryNotification("📭 Aucune vente enregistrée ce jour", "info");
    return;
  }
  const bouteillesVentes = [];
  let totalBouteilles = 0,
    totalMontant = 0;
  for (const vente of lastDailyVentesDetail) {
    for (const produit of vente.produits) {
      if (produit.type === "bouteille") {
        const sousTotal = produit.quantite * produit.prix;
        bouteillesVentes.push({
          produit: produit.nom,
          quantite: produit.quantite,
          prix: produit.prix,
          sousTotal: sousTotal,
          client: vente.clientNom,
          heure: vente.heure,
          venteId: vente.id,
        });
        totalBouteilles += produit.quantite;
        totalMontant += sousTotal;
      }
    }
  }
  if (bouteillesVentes.length === 0) {
    showTemporaryNotification("🍾 Aucune bouteille vendue aujourd'hui", "info");
    return;
  }
  bouteillesVentes.sort((a, b) => a.client.localeCompare(b.client));
  const modal = document.createElement("div");
  modal.className = "detail-modal";
  modal.innerHTML = `<div class="detail-modal-content" style="max-width: 600px; width: 90%; max-height: 85vh; display: flex; flex-direction: column;"><div class="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center"><div><i class="fas fa-wine-bottle text-xl mr-2"></i><span class="font-bold text-lg">Détail des bouteilles vendues</span><p class="text-xs opacity-90 mt-1">${new Date().toLocaleDateString("fr-FR")}</p></div><button onclick="this.closest('.detail-modal').remove()" class="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center"><i class="fas fa-times"></i></button></div><div class="p-4 flex-1 overflow-y-auto" style="max-height: calc(85vh - 140px);"><div class="grid grid-cols-2 gap-3 mb-4"><div class="bg-orange-50 rounded-xl p-3 text-center"><p class="text-gray-500 text-xs">Total bouteilles</p><p class="text-2xl font-bold text-orange-600">${totalBouteilles}</p></div><div class="bg-emerald-50 rounded-xl p-3 text-center"><p class="text-gray-500 text-xs">Montant total</p><p class="text-2xl font-bold text-emerald-600">${formatNumberFC(totalMontant)} FC</p></div></div><div class="space-y-2">${bouteillesVentes.map((item, idx) => `<div class="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition"><div class="flex justify-between items-start"><div class="flex-1"><div class="font-medium text-gray-800">${escapeHtml(item.produit)}</div><div class="text-xs text-gray-500 mt-1"><i class="fas fa-user mr-1"></i>${escapeHtml(item.client)} | <i class="fas fa-clock mr-1"></i>${item.heure}</div></div><div class="text-right"><div class="font-bold text-orange-600">${item.quantite} x ${formatNumberFC(item.prix)} FC</div><div class="text-sm font-semibold text-emerald-600">= ${formatNumberFC(item.sousTotal)} FC</div></div></div></div>`).join("")}</div></div><div class="sticky bottom-0 bg-white border-t border-gray-100 pt-3 pb-2 px-4 flex justify-end gap-2"><button onclick="genererRapportBouteilles()" class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm transition"><i class="fas fa-download mr-1"></i> Exporter CSV</button><button onclick="this.closest('.detail-modal').remove()" class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm transition">Fermer</button></div></div>`;
  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
}
function showCassiersDetail() {
  if (!lastDailyVentesDetail || lastDailyVentesDetail.length === 0) {
    showTemporaryNotification("📭 Aucune vente enregistrée ce jour", "info");
    return;
  }
  const cassiersVentes = [];
  let totalCassiers = 0,
    totalBouteillesEquivalent = 0,
    totalMontant = 0;
  for (const vente of lastDailyVentesDetail) {
    for (const produit of vente.produits) {
      if (produit.type === "cassier") {
        const nbBouteilles = produit.nbBouteillesParCassier || 24;
        const sousTotal = produit.quantite * produit.prix;
        cassiersVentes.push({
          produit: produit.nom,
          quantite: produit.quantite,
          prix: produit.prix,
          nbBouteillesParCassier: nbBouteilles,
          totalBouteilles: produit.quantite * nbBouteilles,
          sousTotal: sousTotal,
          client: vente.clientNom,
          heure: vente.heure,
          venteId: vente.id,
        });
        totalCassiers += produit.quantite;
        totalBouteillesEquivalent += produit.quantite * nbBouteilles;
        totalMontant += sousTotal;
      }
    }
  }
  if (cassiersVentes.length === 0) {
    showTemporaryNotification("📦 Aucun cassier vendu aujourd'hui", "info");
    return;
  }
  cassiersVentes.sort((a, b) => a.client.localeCompare(b.client));
  const modal = document.createElement("div");
  modal.className = "detail-modal";
  modal.innerHTML = `<div class="detail-modal-content" style="max-width: 650px; width: 90%; max-height: 85vh; display: flex; flex-direction: column;"><div class="sticky top-0 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center"><div><i class="fas fa-boxes text-xl mr-2"></i><span class="font-bold text-lg">Détail des cassiers vendus</span><p class="text-xs opacity-90 mt-1">${new Date().toLocaleDateString("fr-FR")}</p></div><button onclick="this.closest('.detail-modal').remove()" class="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center"><i class="fas fa-times"></i></button></div><div class="p-4 flex-1 overflow-y-auto" style="max-height: calc(85vh - 140px);"><div class="grid grid-cols-3 gap-3 mb-4"><div class="bg-purple-50 rounded-xl p-3 text-center"><p class="text-gray-500 text-xs">Cassiers vendus</p><p class="text-2xl font-bold text-purple-600">${totalCassiers}</p></div><div class="bg-rose-50 rounded-xl p-3 text-center"><p class="text-gray-500 text-xs">Bouteilles équiv.</p><p class="text-2xl font-bold text-rose-600">${totalBouteillesEquivalent}</p></div><div class="bg-emerald-50 rounded-xl p-3 text-center"><p class="text-gray-500 text-xs">Montant total</p><p class="text-2xl font-bold text-emerald-600">${formatNumberFC(totalMontant)} FC</p></div></div><div class="space-y-3">${cassiersVentes.map((item, idx) => `<div class="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition"><div class="flex justify-between items-start"><div class="flex-1"><div class="font-medium text-gray-800">${escapeHtml(item.produit)}</div><div class="text-xs text-gray-500 mt-1"><i class="fas fa-user mr-1"></i>${escapeHtml(item.client)} | <i class="fas fa-clock mr-1"></i>${item.heure}</div></div><div class="text-right"><div class="font-bold text-purple-600">${item.quantite} cassier(s)</div><div class="text-xs text-gray-400">${item.nbBouteillesParCassier} bouteilles/cassier</div></div></div><div class="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-200"><div class="flex justify-between items-center"><span class="text-xs text-gray-500">Total bouteilles</span><span class="text-sm font-semibold">${item.totalBouteilles} bouteilles</span></div><div class="flex justify-between items-center"><span class="text-xs text-gray-500">Montant total</span><span class="text-sm font-bold text-emerald-600">${formatNumberFC(item.sousTotal)} FC</span></div></div></div>`).join("")}</div></div><div class="sticky bottom-0 bg-white border-t border-gray-100 pt-3 pb-2 px-4 flex justify-end gap-2"><button onclick="genererRapportCassiers()" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition"><i class="fas fa-download mr-1"></i> Exporter CSV</button><button onclick="this.closest('.detail-modal').remove()" class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm transition">Fermer</button></div></div>`;
  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
}
function genererRapportBouteilles() {
  if (!lastDailyVentesDetail) return;
  const bouteillesVentes = [];
  for (const vente of lastDailyVentesDetail) {
    for (const produit of vente.produits) {
      if (produit.type === "bouteille") {
        bouteillesVentes.push({
          produit: produit.nom,
          quantite: produit.quantite,
          prix: produit.prix,
          sousTotal: produit.quantite * produit.prix,
          client: vente.clientNom,
          heure: vente.heure,
        });
      }
    }
  }
  const separator = ";";
  const headers = [
    "Produit",
    "Quantité",
    "Prix unitaire (FC)",
    "Sous-total (FC)",
    "Client",
    "Heure",
  ];
  const rows = bouteillesVentes.map((item) => [
    item.produit,
    item.quantite,
    item.prix,
    item.sousTotal,
    item.client,
    item.heure,
  ]);
  const csvContent = [headers, ...rows]
    .map((row) => row.join(separator))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `bouteilles_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showTemporaryNotification("📥 Rapport bouteilles exporté");
}
function genererRapportCassiers() {
  if (!lastDailyVentesDetail) return;
  const cassiersVentes = [];
  for (const vente of lastDailyVentesDetail) {
    for (const produit of vente.produits) {
      if (produit.type === "cassier") {
        const nbBouteilles = produit.nbBouteillesParCassier || 24;
        cassiersVentes.push({
          produit: produit.nom,
          quantite: produit.quantite,
          prix: produit.prix,
          nbBouteillesParCassier: nbBouteilles,
          totalBouteilles: produit.quantite * nbBouteilles,
          sousTotal: produit.quantite * produit.prix,
          client: vente.clientNom,
          heure: vente.heure,
        });
      }
    }
  }
  const separator = ";";
  const headers = [
    "Produit",
    "Nb cassiers",
    "Prix cassier (FC)",
    "Bouteilles/cassier",
    "Total bouteilles",
    "Sous-total (FC)",
    "Client",
    "Heure",
  ];
  const rows = cassiersVentes.map((item) => [
    item.produit,
    item.quantite,
    item.prix,
    item.nbBouteillesParCassier,
    item.totalBouteilles,
    item.sousTotal,
    item.client,
    item.heure,
  ]);
  const csvContent = [headers, ...rows]
    .map((row) => row.join(separator))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `cassiers_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showTemporaryNotification("📥 Rapport cassiers exporté");
}
window.showBouteillesDetail = showBouteillesDetail;
window.showCassiersDetail = showCassiersDetail;
window.genererRapportBouteilles = genererRapportBouteilles;
window.genererRapportCassiers = genererRapportCassiers;
function initDetailCards() {
  const bouteillesCard = document.getElementById("bouteillesCard");
  const cassiersCard = document.getElementById("cassiersCard");
  if (bouteillesCard) {
    bouteillesCard.classList.add("stat-card-clickable");
    bouteillesCard.title = "Cliquer pour voir le détail des bouteilles vendues";
    bouteillesCard.addEventListener("click", showBouteillesDetail);
  }
  if (cassiersCard) {
    cassiersCard.classList.add("stat-card-clickable");
    cassiersCard.title = "Cliquer pour voir le détail des cassiers vendus";
    cassiersCard.addEventListener("click", showCassiersDetail);
  }
}
async function initDailyStats() {
  const dateInput = document.getElementById("dailyStatsDate");
  if (dateInput) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.value = today;
    dateInput.addEventListener("change", () => {
      getDailyStats(dateInput.value);
      setTimeout(() => initDetailCards(), 500);
    });
  }
  const refreshBtn = document.getElementById("refreshDailyStats");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      getDailyStats(dateInput?.value);
      getWeeklyTrend();
      setTimeout(() => initDetailCards(), 500);
      showTemporaryNotification("📊 Statistiques actualisées");
    });
  }
  await getDailyStats();
  await getWeeklyTrend();
  initDetailCards();
}

// ============================================
// POPUP DÉTAILS CLIENT AVEC HISTORIQUE ET FILTRE ANNÉE
// ============================================
async function showClientDetails(clientId) {
  try {
    const clientRes = await fetch(`${CLIENTS_URL}/${String(clientId)}`);
    if (!clientRes.ok) throw new Error("Client non trouvé");
    const client = await clientRes.json();
    const ventesRes = await fetch(VENTES_URL);
    const allVentes = await ventesRes.json();
    const ventesClient = allVentes.filter(
      (v) => String(v.clientId) === String(clientId),
    );
    if (ventesClient.length === 0) {
      showTemporaryNotification(`📭 Aucune vente pour ${client.nom}`, "info");
      return;
    }
    currentClientData = client;
    currentClientVentes = ventesClient;
    const anneesDisponibles = [
      ...new Set(ventesClient.map((v) => parseDate(v.date).getFullYear())),
    ].sort((a, b) => b - a);
    const modal = document.createElement("div");
    modal.className = "client-detail-modal";
    modal.innerHTML = `<div class="client-detail-content"><div class="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center"><div><i class="fas fa-user-circle text-2xl mr-2"></i><span class="font-bold text-lg">${escapeHtml(client.nom)}</span><p class="text-xs opacity-90 mt-1">ID: ${client.id} | 📞 ${client.telephone}</p></div><button onclick="this.closest('.client-detail-modal').remove()" class="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center"><i class="fas fa-times"></i></button></div><div class="p-5 flex-1 overflow-y-auto" style="max-height: calc(85vh - 180px);"><div class="bg-gray-50 rounded-xl p-3 mb-4 flex flex-wrap items-center justify-between gap-3"><div class="flex items-center gap-2"><i class="fas fa-calendar-alt text-emerald-600"></i><span class="text-sm font-medium text-gray-700">Filtrer par année :</span></div><div class="flex flex-wrap gap-2"><button onclick="filterClientYear('all')" class="year-filter-btn px-3 py-1.5 rounded-lg text-sm transition ${currentFilterYear === "all" ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}">📅 Toutes</button>${anneesDisponibles.map((annee) => `<button onclick="filterClientYear('${annee}')" class="year-filter-btn px-3 py-1.5 rounded-lg text-sm transition ${currentFilterYear === String(annee) ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}">${annee}</button>`).join("")}</div></div><div id="clientStatsContent">${renderClientStats(ventesClient, currentFilterYear)}</div></div><div class="sticky bottom-0 bg-white border-t border-gray-100 pt-3 pb-2 px-5 flex justify-end gap-2"><button onclick="exporterHistoriqueClientFiltre()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm transition"><i class="fas fa-download mr-1"></i> Exporter CSV</button><button onclick="genererFactureClientParAnnee()" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition"><i class="fas fa-file-invoice mr-1"></i> Facture PDF</button><button onclick="this.closest('.client-detail-modal').remove()" class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm transition">Fermer</button></div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });
  } catch (error) {
    showTemporaryNotification(`❌ Erreur: ${error.message}`, "error");
  }
}
function filterClientYear(year) {
  currentFilterYear = year;
  document.querySelectorAll(".year-filter-btn").forEach((btn) => {
    btn.classList.remove("bg-emerald-600", "text-white");
    btn.classList.add("bg-gray-200", "text-gray-700");
  });
  const activeBtn = Array.from(
    document.querySelectorAll(".year-filter-btn"),
  ).find(
    (btn) => btn.textContent.trim() === (year === "all" ? "📅 Toutes" : year),
  );
  if (activeBtn) {
    activeBtn.classList.remove("bg-gray-200", "text-gray-700");
    activeBtn.classList.add("bg-emerald-600", "text-white");
  }
  const contentDiv = document.getElementById("clientStatsContent");
  if (contentDiv)
    contentDiv.innerHTML = renderClientStats(currentClientVentes, year);
}
function renderClientStats(ventesClient, filterYear) {
  let ventesFiltrees = ventesClient;
  if (filterYear !== "all")
    ventesFiltrees = ventesClient.filter(
      (v) => parseDate(v.date).getFullYear() === parseInt(filterYear),
    );
  if (ventesFiltrees.length === 0)
    return `<div class="text-center text-gray-400 py-8"><i class="fas fa-inbox text-4xl mb-3 block"></i><p>Aucune vente pour cette période</p></div>`;
  const ventesParMois = {};
  let totalGeneral = 0,
    totalVentes = ventesFiltrees.length;
  ventesFiltrees.forEach((vente) => {
    const date = parseDate(vente.date);
    const moisKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const moisNom = date.toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
    const vn = nettoyerVente(vente);
    const montant = vn.total;
    if (!ventesParMois[moisKey])
      ventesParMois[moisKey] = {
        nom: moisNom,
        key: moisKey,
        annee: date.getFullYear(),
        ventes: [],
        total: 0,
        remise: 0,
        net: 0,
      };
    ventesParMois[moisKey].ventes.push({
      id: vente.id,
      date: vente.date,
      montant: montant,
      produits: vn.produits,
    });
    ventesParMois[moisKey].total += montant;
    totalGeneral += montant;
  });
  for (const mois in ventesParMois) {
    ventesParMois[mois].remise = ventesParMois[mois].total * 0.05;
    ventesParMois[mois].net =
      ventesParMois[mois].total - ventesParMois[mois].remise;
  }
  const moisTries = Object.entries(ventesParMois).sort((a, b) =>
    b[0].localeCompare(a[0]),
  );
  const remiseTotale = totalGeneral * 0.05;
  const netTotal = totalGeneral - remiseTotale;
  let ventesHtml = "";
  for (const [key, mois] of moisTries) {
    const ventesListeHtml = mois.ventes
      .map(
        (v) =>
          `<div class="sale-item"><div><div class="font-medium text-gray-800">Vente #${v.id.substring(0, 8)}</div><div class="text-xs text-gray-500">${formatDate(v.date)}</div><div class="text-xs text-gray-400 mt-1">${v.produits.map((p) => `${escapeHtml(p.nom)} (${p.quantite})`).join(", ")}</div></div><div class="text-right"><div class="font-bold text-emerald-600">${formatNumberFC(v.montant)} FC</div><button onclick="genererFactureVente('${v.id}', '${currentClientData.id}')" class="text-blue-600 text-xs hover:text-blue-800 mt-1">🧾 Facture</button></div></div>`,
      )
      .join("");
    ventesHtml += `<div class="month-group"><div class="month-header" onclick="this.nextElementSibling.classList.toggle('show')"><span><i class="fas fa-calendar-alt mr-2"></i>${mois.nom}</span><span class="flex gap-4"><span class="text-white/80 text-sm">Total: ${formatNumberFC(mois.total)} FC</span><i class="fas fa-chevron-down"></i></span></div><div class="month-details"><div class="grid grid-cols-3 gap-3 mb-4 pb-3 border-b border-gray-200"><div class="text-center"><p class="text-xs text-gray-500">Ventes</p><p class="font-bold text-gray-700">${mois.ventes.length}</p></div><div class="text-center"><p class="text-xs text-gray-500">Remise 5%</p><p class="font-bold text-orange-600">${formatNumberFC(mois.remise)} FC</p></div><div class="text-center"><p class="text-xs text-gray-500">Net à payer</p><p class="font-bold text-emerald-600">${formatNumberFC(mois.net)} FC</p></div></div><div class="space-y-2 max-h-64 overflow-y-auto">${ventesListeHtml}</div></div></div>`;
  }
  return `<div class="client-stats-grid"><div class="client-stat-card"><i class="fas fa-shopping-cart text-emerald-600 text-xl mb-2"></i><p class="text-2xl font-bold text-gray-800">${totalVentes}</p><p class="text-xs text-gray-500">Total ventes</p></div><div class="client-stat-card"><i class="fas fa-chart-line text-blue-600 text-xl mb-2"></i><p class="text-2xl font-bold text-gray-800">${formatNumberFC(totalGeneral)} FC</p><p class="text-xs text-gray-500">Montant total</p></div><div class="client-stat-card"><i class="fas fa-percent text-orange-600 text-xl mb-2"></i><p class="text-2xl font-bold text-orange-600">${formatNumberFC(remiseTotale)} FC</p><p class="text-xs text-gray-500">Remise totale (5%)</p></div><div class="client-stat-card"><i class="fas fa-money-bill-wave text-emerald-600 text-xl mb-2"></i><p class="text-2xl font-bold text-emerald-600">${formatNumberFC(netTotal)} FC</p><p class="text-xs text-gray-500">Net à payer</p></div></div><h4 class="font-semibold text-gray-800 mb-3"><i class="fas fa-history text-emerald-600 mr-2"></i>Historique des achats par mois</h4><div class="space-y-3 max-h-96 overflow-y-auto pr-1">${ventesHtml || '<div class="text-center text-gray-400 py-8">Aucune vente trouvée</div>'}</div>`;
}
async function exporterHistoriqueClientFiltre() {
  try {
    let ventesClient = currentClientVentes;
    if (currentFilterYear !== "all")
      ventesClient = ventesClient.filter(
        (v) => parseDate(v.date).getFullYear() === parseInt(currentFilterYear),
      );
    if (ventesClient.length === 0) {
      showTemporaryNotification("Aucune donnée à exporter", "error");
      return;
    }
    const separator = ";";
    const headers = [
      "ID Vente",
      "Date",
      "Montant (FC)",
      "Remise 5% (FC)",
      "Net (FC)",
      "Produits",
    ];
    const rows = ventesClient.map((vente) => {
      const vn = nettoyerVente(vente);
      const remise = vn.total * 0.05;
      const net = vn.total - remise;
      const produits = vn.produits
        .map((p) => `${p.nom}(${p.quantite})`)
        .join(", ");
      return [
        vente.id,
        formatDate(vente.date),
        vn.total,
        remise,
        net,
        produits,
      ];
    });
    const csvContent = [headers, ...rows]
      .map((row) => row.join(separator))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const suffixe = currentFilterYear !== "all" ? `_${currentFilterYear}` : "";
    link.download = `client_${currentClientData.nom.replace(/\s/g, "_")}${suffixe}_ventes.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showTemporaryNotification("📥 Export CSV effectué");
  } catch (error) {
    showTemporaryNotification("❌ Erreur export", "error");
  }
}
async function genererFactureClientParAnnee() {
  try {
    const client = currentClientData;
    let ventesClient = currentClientVentes;
    if (currentFilterYear !== "all")
      ventesClient = ventesClient.filter(
        (v) => parseDate(v.date).getFullYear() === parseInt(currentFilterYear),
      );
    if (ventesClient.length === 0) {
      showTemporaryNotification("Aucune vente pour cette période", "error");
      return;
    }
    if (typeof window.jspdf === "undefined") {
      showTemporaryNotification("❌ Erreur PDF", "error");
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const w = doc.internal.pageSize.getWidth();
    const m = 20;
    const rt = w - m;
    let totalGeneral = 0;
    const ventesParMois = {};
    ventesClient.forEach((vente) => {
      const date = parseDate(vente.date);
      const moisKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const moisNom = date.toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      });
      const vn = nettoyerVente(vente);
      totalGeneral += vn.total;
      if (!ventesParMois[moisKey])
        ventesParMois[moisKey] = { nom: moisNom, total: 0, nbVentes: 0 };
      ventesParMois[moisKey].total += vn.total;
      ventesParMois[moisKey].nbVentes++;
    });
    const remiseTotale = totalGeneral * 0.05;
    const netTotal = totalGeneral - remiseTotale;
    const dateFacture = new Date().toLocaleString("fr-FR");
    const titrePeriode =
      currentFilterYear !== "all"
        ? `Année ${currentFilterYear}`
        : "Toutes les années";
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("FACTURE RÉCAPITULATIVE", w / 2, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Période: ${titrePeriode}`, w / 2, 28, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("VentesPro SARL", m, 40);
    doc.text("Kinshasa, RDC", m, 48);
    doc.text(`Date: ${dateFacture}`, rt - 40, 40, { align: "right" });
    doc.line(m, 55, rt, 55);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Client :", m, 68);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(client.nom, m + 30, 68);
    doc.text(`Téléphone: ${client.telephone}`, m, 75);
    doc.text(`ID Client: ${client.id}`, m, 82);
    doc.line(m, 90, rt, 90);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Récapitulatif par mois", m, 102);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Mois", m, 112);
    doc.text("Nb ventes", 80, 112);
    doc.text("Total", 130, 112);
    doc.text("Remise 5%", 160, 112);
    doc.line(m, 114, rt, 114);
    let y = 122;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const [key, mois] of Object.entries(ventesParMois)) {
      const remiseMois = mois.total * 0.05;
      doc.text(mois.nom, m, y);
      doc.text(mois.nbVentes.toString(), 80, y);
      doc.text(`${formatNumberFC(mois.total)} FC`, 130, y);
      doc.text(`${formatNumberFC(remiseMois)} FC`, 160, y);
      y += 7;
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
    }
    y += 10;
    doc.line(m, y, rt, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL GÉNÉRAL :", m, y);
    doc.text(`${formatNumberFC(totalGeneral)} FC`, 130, y);
    y += 7;
    doc.text("Remise globale (5%) :", m, y);
    doc.text(`-${formatNumberFC(remiseTotale)} FC`, 130, y);
    y += 10;
    doc.setFontSize(14);
    doc.setTextColor(76, 175, 80);
    doc.text("NET À PAYER :", m, y);
    doc.text(`${formatNumberFC(netTotal)} FC`, 130, y);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Merci de votre confiance !", w / 2, 280, { align: "center" });
    const suffixeFichier =
      currentFilterYear !== "all" ? `_${currentFilterYear}` : "";
    doc.save(
      `facture_client_${client.nom.replace(/\s/g, "_")}${suffixeFichier}.pdf`,
    );
    showTemporaryNotification("✅ Facture générée");
  } catch (error) {
    showTemporaryNotification(`❌ Erreur: ${error.message}`, "error");
  }
}
window.showClientDetails = showClientDetails;
window.filterClientYear = filterClientYear;
window.exporterHistoriqueClientFiltre = exporterHistoriqueClientFiltre;
window.genererFactureClientParAnnee = genererFactureClientParAnnee;
window.genererFactureVente = async function (venteId, clientId) {
  try {
    const v = await (await fetch(`${VENTES_URL}/${venteId}`)).json();
    const c = await (await fetch(`${CLIENTS_URL}/${String(clientId)}`)).json();
    genererFacturePanier(v, c);
  } catch (e) {
    showTemporaryNotification("❌ Erreur", "error");
  }
};

// ============================================
// ACHATS FOURNISSEURS
// ============================================
async function chargerAchats() {
  try {
    const response = await fetch(ACHATS_URL);
    if (!response.ok) throw new Error("Erreur chargement achats");
    achatsList = await response.json();
    return achatsList;
  } catch (error) {
    console.error("Erreur chargement achats:", error);
    achatsList = [];
    return [];
  }
}
async function sauvegarderAchat(achatData) {
  const response = await fetch(ACHATS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(achatData),
  });
  if (!response.ok) throw new Error("Erreur sauvegarde achat");
  return await response.json();
}
async function mettreAJourAchat(id, achatData) {
  const response = await fetch(`${ACHATS_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(achatData),
  });
  if (!response.ok) throw new Error("Erreur mise à jour achat");
  return await response.json();
}
async function supprimerAchat(id) {
  const response = await fetch(`${ACHATS_URL}/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Erreur suppression achat");
  return true;
}
async function afficherAchats() {
  await chargerAchats();
  const fournisseur =
    document.getElementById("filtreFournisseurAchat")?.value || "all";
  const mois = document.getElementById("filtreMoisAchat")?.value || "all";
  let achatsFiltres = [...achatsList];
  if (fournisseur !== "all")
    achatsFiltres = achatsFiltres.filter((a) => a.fournisseur === fournisseur);
  if (mois !== "all")
    achatsFiltres = achatsFiltres.filter((a) => {
      const dateAchat = new Date(a.date);
      const moisKey = `${dateAchat.getFullYear()}-${String(dateAchat.getMonth() + 1).padStart(2, "0")}`;
      return moisKey === mois;
    });
  achatsFiltres.sort((a, b) => new Date(b.date) - new Date(a.date));
  let totalGeneral = 0;
  achatsFiltres.forEach((a) => {
    totalGeneral += a.total;
  });
  const remiseTotale = totalGeneral * 0.05;
  const netTotal = totalGeneral - remiseTotale;
  document.getElementById("statsTotalAchats").textContent =
    formatNumberFC(totalGeneral) + " FC";
  document.getElementById("statsTotalRemise").textContent =
    formatNumberFC(remiseTotale) + " FC";
  document.getElementById("statsTotalNet").textContent =
    formatNumberFC(netTotal) + " FC";
  document.getElementById("statsNbAchats").textContent = achatsFiltres.length;
  const tbody = document.getElementById("achatsTableBody");
  const footer = document.getElementById("achatsTableFooter");
  if (achatsFiltres.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-400">📭 Aucun achat trouvé</td></tr>';
    footer.classList.add("hidden");
    return;
  }
  tbody.innerHTML = achatsFiltres
    .map((achat, index) => {
      const dateObj = new Date(achat.date);
      const dateStr = dateObj.toLocaleDateString("fr-FR");
      const typeLabel =
        achat.type === "cassier" ? "📦 Cassier" : "🍾 Bouteille";
      const typeClass =
        achat.type === "cassier"
          ? "bg-purple-100 text-purple-700"
          : "bg-blue-100 text-blue-700";
      const fournisseurLabel =
        achat.fournisseur === "BRACONGO" ? "🍺 BRACONGO" : "🍻 BRALIMA";
      return `<tr class="${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100 transition"><td class="px-4 py-3 text-sm">${dateStr}</td><td class="px-4 py-3 text-sm font-medium">${fournisseurLabel}</td><td class="px-4 py-3 text-sm"><span class="inline-block px-2 py-0.5 rounded text-xs font-medium ${typeClass} mr-1">${typeLabel}</span>${escapeHtml(achat.produit)}</td><td class="px-4 py-3 text-center text-sm font-medium">${achat.quantite}</td><td class="px-4 py-3 text-right text-sm">${formatNumberFC(achat.prix)} FC</td><td class="px-4 py-3 text-right text-sm font-bold text-emerald-600">${formatNumberFC(achat.total)} FC</td><td class="px-4 py-3 text-center"><button onclick="ouvrirEditAchat('${achat.id}')" class="text-blue-600 hover:text-blue-800 mr-2 transition"><i class="fas fa-edit"></i></button><button onclick="supprimerAchatConfirm('${achat.id}')" class="text-red-600 hover:text-red-800 transition"><i class="fas fa-trash"></i></button></td></tr>`;
    })
    .join("");
  footer.classList.remove("hidden");
  document.getElementById("footerTotalAchats").textContent =
    formatNumberFC(totalGeneral) + " FC";
}
async function mettreAJourFiltreMoisAchats() {
  await chargerAchats();
  const moisSet = new Set();
  achatsList.forEach((achat) => {
    const date = new Date(achat.date);
    const moisKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const moisNom = date.toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
    moisSet.add(JSON.stringify({ key: moisKey, nom: moisNom }));
  });
  const moisArray = Array.from(moisSet).map((m) => JSON.parse(m));
  moisArray.sort((a, b) => b.key.localeCompare(a.key));
  const selectMois = document.getElementById("filtreMoisAchat");
  if (selectMois) {
    selectMois.innerHTML = '<option value="all">📅 Tous les mois</option>';
    moisArray.forEach((mois) => {
      const option = document.createElement("option");
      option.value = mois.key;
      option.textContent = mois.nom;
      selectMois.appendChild(option);
    });
  }
}
function ouvrirAjoutAchat() {
  document.getElementById("achatFournisseur").value = "BRACONGO";
  document.getElementById("achatProduit").value = "";
  document.getElementById("achatType").value = "bouteille";
  document.getElementById("achatQuantite").value = "1";
  document.getElementById("achatPrix").value = "";
  document.getElementById("achatDate").value = new Date()
    .toISOString()
    .split("T")[0];
  mettreAJourProduitsAchat();
  document.getElementById("ajoutAchatModal").classList.remove("hidden");
  document.getElementById("ajoutAchatModal").classList.add("flex");
}
async function mettreAJourProduitsAchat() {
  const fournisseur = document.getElementById("achatFournisseur").value;
  const type = document.getElementById("achatType").value;
  const selectProduit = document.getElementById("achatProduit");
  await chargerProduits();
  selectProduit.innerHTML =
    '<option value="">-- Sélectionnez un produit --</option>';
  if (type === "bouteille") {
    Object.entries(produits[fournisseur].bouteille).forEach(([nom, data]) => {
      const option = document.createElement("option");
      option.value = nom;
      option.textContent = `${nom} (${data.format}) - ${formatNumberFC(data.prix)} FC`;
      selectProduit.appendChild(option);
    });
  } else {
    Object.entries(produits[fournisseur].cassier).forEach(([nom, data]) => {
      const option = document.createElement("option");
      option.value = nom;
      option.textContent = `${nom} (${data.format}) - ${formatNumberFC(data.prixCassier)} FC (cassier)`;
      selectProduit.appendChild(option);
    });
  }
  selectProduit.onchange = () => {
    const produitNom = selectProduit.value;
    if (produitNom) {
      if (type === "bouteille") {
        const prix = produits[fournisseur].bouteille[produitNom]?.prix;
        if (prix) document.getElementById("achatPrix").value = prix;
      } else {
        const prix = produits[fournisseur].cassier[produitNom]?.prixCassier;
        if (prix) document.getElementById("achatPrix").value = prix;
      }
    }
  };
}
async function saveAchat() {
  const fournisseur = document.getElementById("achatFournisseur").value;
  const produit = document.getElementById("achatProduit").value;
  const type = document.getElementById("achatType").value;
  const quantite = parseInt(document.getElementById("achatQuantite").value);
  const prix = parseFloat(document.getElementById("achatPrix").value);
  const date = document.getElementById("achatDate").value;
  if (!produit || !quantite || !prix || !date) {
    showTemporaryNotification("❌ Veuillez remplir tous les champs", "error");
    return;
  }
  const total = quantite * prix;
  try {
    await sauvegarderAchat({
      fournisseur,
      produit,
      type,
      quantite,
      prix,
      total,
      date,
    });
    showTemporaryNotification("✅ Achat enregistré avec succès");
    fermerModalAchat();
    await afficherAchats();
    await mettreAJourFiltreMoisAchats();
  } catch (error) {
    showTemporaryNotification(`❌ Erreur: ${error.message}`, "error");
  }
}
function fermerModalAchat() {
  document.getElementById("ajoutAchatModal").classList.add("hidden");
  document.getElementById("ajoutAchatModal").classList.remove("flex");
}
async function ouvrirEditAchat(id) {
  currentEditAchatId = id;
  const achat = achatsList.find((a) => a.id === id);
  if (!achat) return;
  document.getElementById("editAchatId").value = achat.id;
  document.getElementById("editAchatFournisseur").value = achat.fournisseur;
  document.getElementById("editAchatProduit").value = achat.produit;
  document.getElementById("editAchatType").value = achat.type;
  document.getElementById("editAchatQuantite").value = achat.quantite;
  document.getElementById("editAchatPrix").value = achat.prix;
  document.getElementById("editAchatDate").value = achat.date.split("T")[0];
  document.getElementById("editAchatModal").classList.remove("hidden");
  document.getElementById("editAchatModal").classList.add("flex");
}
async function updateAchat() {
  const id = document.getElementById("editAchatId").value;
  const fournisseur = document.getElementById("editAchatFournisseur").value;
  const produit = document.getElementById("editAchatProduit").value;
  const type = document.getElementById("editAchatType").value;
  const quantite = parseInt(document.getElementById("editAchatQuantite").value);
  const prix = parseFloat(document.getElementById("editAchatPrix").value);
  const date = document.getElementById("editAchatDate").value;
  if (!produit || !quantite || !prix || !date) {
    showTemporaryNotification("❌ Veuillez remplir tous les champs", "error");
    return;
  }
  const total = quantite * prix;
  try {
    await mettreAJourAchat(id, {
      fournisseur,
      produit,
      type,
      quantite,
      prix,
      total,
      date,
    });
    showTemporaryNotification("✅ Achat modifié avec succès");
    fermerModalEditAchat();
    await afficherAchats();
    await mettreAJourFiltreMoisAchats();
  } catch (error) {
    showTemporaryNotification(`❌ Erreur: ${error.message}`, "error");
  }
}
async function supprimerAchatConfirm(id) {
  if (confirm("⚠️ Êtes-vous sûr de vouloir supprimer cet achat ?")) {
    try {
      await supprimerAchat(id);
      showTemporaryNotification("✅ Achat supprimé");
      await afficherAchats();
      await mettreAJourFiltreMoisAchats();
    } catch (error) {
      showTemporaryNotification(`❌ Erreur: ${error.message}`, "error");
    }
  }
}
function fermerModalEditAchat() {
  document.getElementById("editAchatModal").classList.add("hidden");
  document.getElementById("editAchatModal").classList.remove("flex");
  currentEditAchatId = null;
}
function exporterAchatsCSV() {
  const fournisseur =
    document.getElementById("filtreFournisseurAchat")?.value || "all";
  const mois = document.getElementById("filtreMoisAchat")?.value || "all";
  let achatsFiltres = [...achatsList];
  if (fournisseur !== "all")
    achatsFiltres = achatsFiltres.filter((a) => a.fournisseur === fournisseur);
  if (mois !== "all")
    achatsFiltres = achatsFiltres.filter((a) => {
      const dateAchat = new Date(a.date);
      const moisKey = `${dateAchat.getFullYear()}-${String(dateAchat.getMonth() + 1).padStart(2, "0")}`;
      return moisKey === mois;
    });
  if (achatsFiltres.length === 0) {
    showTemporaryNotification("📭 Aucune donnée à exporter", "error");
    return;
  }
  const separator = ";";
  const headers = [
    "Date",
    "Fournisseur",
    "Produit",
    "Type",
    "Quantité",
    "Prix unitaire (FC)",
    "Total (FC)",
    "Remise 5% (FC)",
    "Net (FC)",
  ];
  const rows = achatsFiltres.map((a) => {
    const remise = a.total * 0.05;
    const net = a.total - remise;
    const dateObj = new Date(a.date);
    const dateStr = dateObj.toLocaleDateString("fr-FR");
    return [
      dateStr,
      a.fournisseur,
      a.produit,
      a.type,
      a.quantite,
      a.prix,
      a.total,
      remise,
      net,
    ];
  });
  const csvContent = [headers, ...rows]
    .map((row) => row.join(separator))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  const suffixe = fournisseur !== "all" ? `_${fournisseur}` : "";
  link.download = `achats_fournisseurs${suffixe}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showTemporaryNotification("📥 Export CSV effectué");
}
function initAchats() {
  document
    .getElementById("ajouterAchatBtn")
    ?.addEventListener("click", ouvrirAjoutAchat);
  document.getElementById("saveAchatBtn")?.addEventListener("click", saveAchat);
  document
    .getElementById("closeAchatModalBtn")
    ?.addEventListener("click", fermerModalAchat);
  document
    .getElementById("closeEditAchatModalBtn")
    ?.addEventListener("click", fermerModalEditAchat);
  document
    .getElementById("updateAchatBtn")
    ?.addEventListener("click", updateAchat);
  document.getElementById("deleteAchatBtn")?.addEventListener("click", () => {
    if (currentEditAchatId && confirm("⚠️ Supprimer cet achat ?")) {
      supprimerAchatConfirm(currentEditAchatId);
      fermerModalEditAchat();
    }
  });
  document
    .getElementById("appliquerFiltreAchat")
    ?.addEventListener("click", afficherAchats);
  document
    .getElementById("exporterAchatsCsv")
    ?.addEventListener("click", exporterAchatsCSV);
  document
    .getElementById("achatFournisseur")
    ?.addEventListener("change", mettreAJourProduitsAchat);
  document
    .getElementById("achatType")
    ?.addEventListener("change", mettreAJourProduitsAchat);
  mettreAJourFiltreMoisAchats();
  afficherAchats();
}
window.ouvrirEditAchat = ouvrirEditAchat;
window.supprimerAchatConfirm = supprimerAchatConfirm;

// ============================================
// API PRODUITS (suite)
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
// UI PRODUITS (raccourcie)
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
// CLIENTS (raccourcie)
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
      tr.innerHTML = `<td class="px-4 py-3 text-sm font-mono">${client.id}<\/td>
                      <td class="px-4 py-3 text-sm"><button onclick="showClientDetails('${client.id}')" class="text-blue-600 hover:text-blue-800 hover:underline font-medium">${escapeHtml(client.nom)}<\/button><\/td>
                      <td class="px-4 py-3 text-sm">${escapeHtml(client.telephone)}<\/td>
                      <td class="px-4 py-3 text-sm text-center"><button onclick="fillVenteForm('${client.id}')" class="bg-emerald-600 text-white px-3 py-1 rounded text-xs hover:bg-emerald-700 mr-2 transition">🛒 Vendre</button><button class="edit-client-btn text-blue-600 hover:text-blue-800 mr-3 transition" data-id="${client.id}" data-nom="${escapeHtml(client.nom)}" data-telephone="${escapeHtml(client.telephone)}"><i class="fas fa-edit"></i> Modifier</button><button class="delete-client-btn text-red-600 hover:text-red-800 transition" data-id="${client.id}" data-nom="${escapeHtml(client.nom)}"><i class="fas fa-trash"></i> Supprimer</button><\/td>`;
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
// HISTORIQUE AVEC FILTRES
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
      const cr = await fetch(`${CLIENTS_URL}/${String(vente.clientId)}`);
      if (cr.ok) clientNom = (await cr.json()).nom;
    } catch (e) {}
    const vn = nettoyerVente(vente);
    const produits = vn.produits;
    const total = vn.total;
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
  } catch (e) {
    showTemporaryNotification("❌ Erreur", "error");
  }
};
async function afficherHistorique() {
  const clientId = historiqueClientIdElem.value.trim();
  if (!clientId) {
    historiqueMessageDiv.innerHTML =
      '<span class="text-red-600">⚠️ Entrez un ID client</span>';
    return;
  }
  try {
    const cr = await fetch(`${CLIENTS_URL}/${String(clientId)}`);
    if (!cr.ok) {
      historiqueMessageDiv.innerHTML = `<span class="text-red-600">❌ Client "${clientId}" non trouvé</span>`;
      return;
    }
    const clientData = await cr.json();
    const ventesRes = await fetch(VENTES_URL);
    const allVentes = await ventesRes.json();
    const ventes = allVentes.filter(
      (v) => String(v.clientId) === String(clientId),
    );
    if (ventes.length === 0) {
      historiqueMessageDiv.innerHTML = `<span class="text-blue-600">📭 Aucune vente pour ${clientData.nom}</span>`;
      historiqueTableElem.classList.add("hidden");
      return;
    }
    window.currentVentesData = ventes;
    window.currentClientData = clientData;
    historiqueMessageDiv.innerHTML = `<span class="text-emerald-600">✅ ${ventes.length} vente(s) pour ${escapeHtml(clientData.nom)} (ID: ${clientData.id})</span>`;
    displayVentesMulti(ventes, clientData);
  } catch (e) {
    historiqueMessageDiv.innerHTML = `<span class="text-red-600">❌ Erreur: ${e.message}</span>`;
  }
}
function displayVentesMulti(ventes, clientData) {
  if (!historiqueTableBody) return;
  historiqueTableBody.innerHTML = "";
  let totalQuantite = 0,
    totalPrix = 0;
  ventes
    .sort((a, b) => parseDate(b.date) - parseDate(a.date))
    .forEach((v, idx) => {
      const vn = nettoyerVente(v);
      const produitsListe = vn.produits;
      const total = vn.total;
      let qt = produitsListe.reduce((s, p) => s + p.quantite, 0);
      const prixMoyen = qt > 0 ? total / qt : 0;
      if (isNaN(total)) return;
      const row = document.createElement("tr");
      row.className = idx % 2 === 0 ? "bg-gray-50" : "";
      row.innerHTML = `<td class="px-4 py-3 text-sm font-mono">${v.id.substring(0, 8)}<\/td><td class="px-4 py-3 text-sm">${afficherProduitsListe(produitsListe)}<\/td><td class="px-4 py-3 text-center font-medium">${qt}<\/td><td class="px-4 py-3 text-right">${formatNumberFC(prixMoyen)} FC<\/td><td class="px-4 py-3 text-right font-bold text-emerald-600">${formatNumberFC(total)} FC<\/td><td class="px-4 py-3 text-sm">${formatDate(v.date)}<\/td><td class="px-4 py-3 text-center"><button onclick="showVenteDetail('${v.id}')" class="bg-blue-600 text-white px-2 py-1 rounded text-xs mr-1">📄 Détails</button><button onclick="genererFactureVente('${v.id}', '${clientData.id}')" class="bg-emerald-600 text-white px-2 py-1 rounded text-xs">🧾 Facture</button><\/td>`;
      historiqueTableBody.appendChild(row);
      totalQuantite += qt;
      totalPrix += total;
    });
  document.getElementById("totalQuantite").textContent = totalQuantite;
  document.getElementById("totalPrix").textContent =
    formatNumberFC(totalPrix) + " FC";
  historiqueTableElem.classList.remove("hidden");
  const oldFilter = document.getElementById("filterContainerHisto");
  if (oldFilter) oldFilter.remove();
  const filterContainer = document.createElement("div");
  filterContainer.id = "filterContainerHisto";
  filterContainer.className =
    "mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200";
  filterContainer.innerHTML = `<div class="flex flex-wrap items-center justify-between gap-4"><div><strong><i class="fas fa-filter mr-1"></i> 🔍 Filtrer :</strong></div><div class="flex flex-wrap gap-3"><label class="inline-flex items-center gap-2"><input type="radio" name="filterTypeHisto" value="all" checked class="text-emerald-600"> 📅 Toutes</label><label class="inline-flex items-center gap-2"><input type="radio" name="filterTypeHisto" value="today" class="text-emerald-600"> 📆 Aujourd'hui</label><label class="inline-flex items-center gap-2"><input type="radio" name="filterTypeHisto" value="week" class="text-emerald-600"> 📊 Semaine</label><label class="inline-flex items-center gap-2"><input type="radio" name="filterTypeHisto" value="month" class="text-emerald-600"> 📈 Mois</label><button id="applyFilterHistoBtn" class="bg-emerald-600 text-white px-3 py-1 rounded text-sm">Appliquer</button><button id="resetFilterHistoBtn" class="bg-gray-500 text-white px-3 py-1 rounded text-sm">Réinitialiser</button></div></div>`;
  const histContainer =
    document.getElementById("historiqueTable").parentElement;
  histContainer.appendChild(filterContainer);
  document
    .getElementById("applyFilterHistoBtn")
    ?.addEventListener("click", () => {
      const val = document.querySelector(
        'input[name="filterTypeHisto"]:checked',
      ).value;
      appliquerFiltreHisto(val, ventes, clientData);
    });
  document
    .getElementById("resetFilterHistoBtn")
    ?.addEventListener("click", () => {
      document.querySelector(
        'input[name="filterTypeHisto"][value="all"]',
      ).checked = true;
      displayVentesMulti(ventes, clientData);
      showTemporaryNotification("📋 Filtre réinitialisé");
    });
  const oldActions = document.querySelector(".action-buttons-container");
  if (oldActions) oldActions.remove();
  const actionDiv = document.createElement("div");
  actionDiv.className = "action-buttons-container flex gap-3 mt-4 justify-end";
  actionDiv.innerHTML = `<button id="exportCsvBtn" class="bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><i class="fas fa-file-excel"></i> Exporter CSV</button><button id="factureMensuelleBtn" class="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><i class="fas fa-file-invoice"></i> Facture mensuelle</button>`;
  histContainer.appendChild(actionDiv);
  document
    .getElementById("exportCsvBtn")
    ?.addEventListener("click", () => exportToCSV(ventes, clientData));
  document
    .getElementById("factureMensuelleBtn")
    ?.addEventListener("click", () =>
      genererFactureMensuelleMulti(ventes, clientData),
    );
}
function appliquerFiltreHisto(filterType, ventesOriginales, clientData) {
  const now = new Date();
  let filtrees = [];
  let msg = "";
  switch (filterType) {
    case "today":
      filtrees = ventesOriginales.filter(
        (v) => parseDate(v.date).toDateString() === now.toDateString(),
      );
      msg = "aujourd'hui";
      break;
    case "week":
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      filtrees = ventesOriginales.filter((v) => parseDate(v.date) >= weekAgo);
      msg = "cette semaine";
      break;
    case "month":
      const year = now.getFullYear(),
        month = now.getMonth();
      filtrees = ventesOriginales.filter((v) => {
        const d = parseDate(v.date);
        return (
          !isNaN(d.getTime()) &&
          d.getMonth() === month &&
          d.getFullYear() === year
        );
      });
      msg = "ce mois";
      break;
    default:
      filtrees = [...ventesOriginales];
      msg = "toutes";
  }
  if (filtrees.length === 0) {
    historiqueMessageDiv.innerHTML = `<span class="text-blue-600">📭 Aucune vente pour ${msg}</span>`;
    historiqueTableBody.innerHTML = "";
    document.getElementById("totalQuantite").textContent = "0";
    document.getElementById("totalPrix").textContent = "0 FC";
  } else {
    displayVentesMulti(filtrees, clientData);
    historiqueMessageDiv.innerHTML = `<span class="text-emerald-600">✅ ${filtrees.length} vente(s) pour ${msg}</span>`;
  }
}

// ============================================
// RAPPORTS MENSUELS
// ============================================
async function chargerClientsPourRapport() {
  try {
    const r = await fetch(CLIENTS_URL);
    const clients = await r.json();
    const sel = document.getElementById("rapportClientSelect");
    if (sel) {
      sel.innerHTML = '<option value="">-- Tous les clients --</option>';
      clients.forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = `${escapeHtml(c.nom)} (${c.id})`;
        sel.appendChild(opt);
      });
    }
  } catch (e) {}
}
async function genererRapportMensuel() {
  const clientId = document.getElementById("rapportClientSelect")?.value;
  const mois = parseInt(document.getElementById("rapportMoisSelect")?.value);
  const annee = parseInt(document.getElementById("rapportAnneeSelect")?.value);
  showTemporaryNotification("⏳ Génération...");
  try {
    const vr = await fetch(VENTES_URL);
    const cr = await fetch(CLIENTS_URL);
    const toutesVentes = await vr.json();
    const tousClients = await cr.json();
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
      showTemporaryNotification("📭 Aucune donnée", "error");
      document.getElementById("rapportTable")?.classList.add("hidden");
      document.getElementById("rapportResume")?.classList.add("hidden");
      document.getElementById("rapportEmpty")?.classList.remove("hidden");
      return;
    }
    document.getElementById("rapportEmpty")?.classList.add("hidden");
    const totaux = new Map();
    ventesFiltrees.forEach((v) => {
      const id = String(v.clientId);
      const vn = nettoyerVente(v);
      if (!totaux.has(id)) totaux.set(id, { nb: 0, total: 0 });
      const t = totaux.get(id);
      t.nb++;
      t.total += vn.total;
    });
    const tbody = document.getElementById("rapportTableBody");
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
        tr.className = "border-b hover:bg-gray-50";
        tr.innerHTML = `<td class="px-4 py-3"><div class="font-medium">${client ? escapeHtml(client.nom) : "Client " + id}</div><div class="text-xs text-gray-400">ID: ${id}</div></td><td class="px-4 py-3 text-center">${data.nb}</td><td class="px-4 py-3 text-right">${formatNumberFC(data.total)} FC</td><td class="px-4 py-3 text-right text-orange-600">${formatNumberFC(remise)} FC</td><td class="px-4 py-3 text-right font-bold text-emerald-600">${formatNumberFC(data.total - remise)} FC<td><td class="px-4 py-3 text-center"><button onclick="showTemporaryNotification('Facture client')" class="bg-purple-600 text-white px-2 py-1 rounded text-xs">🧾</button></td>`;
        tbody.appendChild(tr);
      }
      document.getElementById("rapportFootNbVentes").textContent = nbGlobal;
      document.getElementById("rapportFootTotal").textContent =
        formatNumberFC(totalGlobal) + " FC";
      document.getElementById("rapportFootRemise").textContent =
        formatNumberFC(totalGlobal * 0.05) + " FC";
      document.getElementById("rapportFootNet").textContent =
        formatNumberFC(totalGlobal * 0.95) + " FC";
      document.getElementById("rapportTable")?.classList.remove("hidden");
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
    showTemporaryNotification("✅ Rapport généré");
  } catch (e) {
    showTemporaryNotification("❌ Erreur", "error");
  }
}
function initRapports() {
  document
    .getElementById("genererRapportBtn")
    ?.addEventListener("click", genererRapportMensuel);
  document
    .getElementById("exporterRapportBtn")
    ?.addEventListener("click", () => showTemporaryNotification("Export CSV"));
  const annee = document.getElementById("rapportAnneeSelect");
  if (annee) annee.value = new Date().getFullYear();
  const mois = document.getElementById("rapportMoisSelect");
  if (mois) mois.value = new Date().getMonth() + 1;
  chargerClientsPourRapport();
}

// ============================================
// FACTURES
// ============================================
function genererFacturePanier(vente, client) {
  if (typeof window.jspdf === "undefined") {
    showTemporaryNotification("❌ Erreur PDF", "error");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const m = 20;
  const rt = w - m;
  const vn = nettoyerVente(vente);
  const total = vn.total,
    produits = vn.produits;
  const dateF = new Date().toLocaleString("fr-FR");
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURE", w / 2, 20, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("VentesPro SARL", m, 35);
  doc.text("Kinshasa, RDC", m, 45);
  doc.text(`Facture N°: ${vente.id || "N/A"}`, rt - 40, 35, { align: "right" });
  doc.text(`Date: ${dateF}`, rt - 40, 40, { align: "right" });
  doc.line(m, 55, rt, 55);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Client :", m, 68);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(client.nom, m + 30, 68);
  doc.text(`Tél: ${client.telephone || "N/A"}`, m, 75);
  doc.text(`ID: ${client.id}`, m, 82);
  doc.line(m, 90, rt, 90);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Détails", m, 102);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Produit", m, 112);
  doc.text("Qté", 100, 112);
  doc.text("Prix unit.", 130, 112);
  doc.text("Total", 165, 112);
  doc.line(m, 114, rt, 114);
  let y = 122;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  produits.forEach((p) => {
    const st = p.prix * p.quantite;
    doc.text(p.nom.substring(0, 30), m, y);
    doc.text(p.quantite.toString(), 100, y);
    doc.text(`${formatNumberFC(p.prix)} FC`, 130, y);
    doc.text(`${formatNumberFC(st)} FC`, 165, y);
    y += 7;
  });
  y += 5;
  doc.line(m, y, rt, y);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL À PAYER :", 130, y);
  doc.setFontSize(14);
  doc.setTextColor(76, 175, 80);
  doc.text(`${formatNumberFC(total)} FC`, rt, y, { align: "right" });
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Merci de votre confiance !", w / 2, 280, { align: "center" });
  doc.save(
    `facture_${client.nom.replace(/\s/g, "_")}_${vente.id || Date.now()}.pdf`,
  );
  showTemporaryNotification("✅ Facture générée");
}
function genererFactureMensuelleMulti(ventes, client) {
  if (typeof window.jspdf === "undefined") {
    showTemporaryNotification("❌ Erreur PDF", "error");
    return;
  }
  const now = new Date();
  const moisActuel = now.getMonth(),
    anneeActuelle = now.getFullYear();
  const ventesDuMois = ventes.filter((v) => {
    const d = parseDate(v.date);
    return (
      !isNaN(d.getTime()) &&
      d.getMonth() === moisActuel &&
      d.getFullYear() === anneeActuelle
    );
  });
  if (ventesDuMois.length === 0) {
    showTemporaryNotification("📭 Aucune vente ce mois", "error");
    return;
  }
  let total = 0;
  ventesDuMois.forEach((v) => {
    const vn = nettoyerVente(v);
    total += vn.total;
  });
  const remise = total * 0.05,
    totalFinal = total - remise;
  const dateF = new Date().toLocaleString("fr-FR");
  const moisTexte = now.toLocaleString("fr-FR", {
    month: "long",
    year: "numeric",
  });
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const m = 20,
    rt = w - m;
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURE MENSUELLE", w / 2, 20, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("VentesPro SARL", m, 35);
  doc.text("Kinshasa, RDC", m, 45);
  doc.text(`Période: ${moisTexte}`, rt - 40, 35, { align: "right" });
  doc.text(`Date: ${dateF}`, rt - 40, 40, { align: "right" });
  doc.line(m, 55, rt, 55);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Client :", m, 68);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(client.nom, m + 30, 68);
  doc.text(`Tél: ${client.telephone || "N/A"}`, m, 75);
  doc.text(`ID: ${client.id}`, m, 82);
  doc.line(m, 90, rt, 90);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Achats - ${moisTexte}`, m, 102);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Date", m, 112);
  doc.text("Produits", 55, 112);
  doc.text("Total", 160, 112);
  doc.line(m, 114, rt, 114);
  let y = 122;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  ventesDuMois.forEach((v, idx) => {
    const vn = nettoyerVente(v);
    const prods = vn.produits.map((p) => `${p.nom}(${p.quantite})`).join(", ");
    const dateStr = formatDate(v.date);
    doc.text(dateStr.substring(0, 10), m, y);
    doc.text(prods.substring(0, 45), 55, y);
    doc.text(`${formatNumberFC(vn.total)} FC`, 160, y);
    y += 6;
    if (y > 250 && idx < ventesDuMois.length - 1) {
      doc.addPage();
      y = 20;
    }
  });
  y += 5;
  doc.line(m, y, rt, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Sous-total:", 130, y);
  doc.text(`${formatNumberFC(total)} FC`, rt, y, { align: "right" });
  y += 7;
  doc.text("Remise (5%):", 130, y);
  doc.text(`-${formatNumberFC(remise)} FC`, rt, y, { align: "right" });
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL À PAYER :", 130, y);
  doc.setFontSize(14);
  doc.setTextColor(76, 175, 80);
  doc.text(`${formatNumberFC(totalFinal)} FC`, rt, y, { align: "right" });
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Merci de votre confiance !", w / 2, 280, { align: "center" });
  doc.save(
    `facture_mensuelle_${client.nom.replace(/\s/g, "_")}_${moisTexte.replace(/\s/g, "_")}.pdf`,
  );
  showTemporaryNotification("✅ Facture mensuelle générée");
}
function exportToCSV(ventes, client) {
  if (!ventes || ventes.length === 0) {
    showTemporaryNotification("📭 Aucune donnée", "error");
    return;
  }
  const sep = ";";
  const fmt = (f) => {
    if (f === undefined || f === null) return "";
    const s = String(f);
    if (s.includes(sep) || s.includes('"') || s.includes("\n"))
      return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const headers = [
    "ID Vente",
    "Produits",
    "Qté totale",
    "Total (FC)",
    "Date",
  ].map(fmt);
  const rows = ventes.map((v) => {
    const vn = nettoyerVente(v);
    let prods = "",
      qt = 0;
    if (vn.produits.length > 0) {
      prods = vn.produits.map((p) => `${p.nom}(${p.quantite})`).join(", ");
      qt = vn.produits.reduce((s, p) => s + p.quantite, 0);
    }
    return [v.id, prods, qt, formatNumberFC(vn.total), formatDate(v.date)].map(
      fmt,
    );
  });
  const csv = [headers, ...rows].map((r) => r.join(sep)).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `ventes_${client.nom.replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showTemporaryNotification("📥 Export CSV effectué");
}

// ============================================
// INITIALISATION
// ============================================
loadDashboardStats();
initGestionProduits();
initGestionClients();
initRapports();
initDailyStats();
initAchats();
showTemporaryNotification("Bienvenue sur VentesPro !");
