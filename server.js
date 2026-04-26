const jsonServer = require("json-server");
const path = require("path");
const server = jsonServer.create();

// CORRECTION : On indique le chemin réel vers le dossier database
const router = jsonServer.router(path.join(__dirname, "database", "db.json"));

// CORRECTION : On active le service des fichiers statiques (ton HTML/JS)
const middlewares = jsonServer.defaults({
  static: "./",
});

const port = process.env.PORT || 10000;

server.use(middlewares);
server.use(router);

server.listen(port, () => {
  console.log(`JSON Server est lancé sur le port ${port}`);
});
