const jsonServer = require("json-server");
const path = require("path");
const server = jsonServer.create();

// Chemin vers votre base de données dans le dossier 'database'
const router = jsonServer.router(path.join(__dirname, "database", "db.json"));

// Configuration des middlewares (log, static, etc.)
// Le paramètre static: './' permet de servir votre index.html
const middlewares = jsonServer.defaults({
  static: "./",
  noCors: false, // Autorise les requêtes de n'importe où
});

// Port dynamique pour Render (très important)
const port = process.env.PORT || 10000;

server.use(middlewares);
server.use(router);

server.listen(port, () => {
  console.log(`JSON Server est opérationnel sur le port ${port}`);
});
