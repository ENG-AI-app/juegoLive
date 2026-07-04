const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const preferredPort = Number(process.env.PORT || 8123);
const host = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
const tiktokUser = getArgValue("--tiktok") || process.env.TIKTOK_USER || "";
const clients = new Set();
let liveStatus = {
  type: "status",
  state: tiktokUser ? "connecting" : "simulator",
  message: tiktokUser ? `Buscando live de @${tiktokUser.replace(/^@/, "")}...` : "Modo simulador"
};
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".md": "text/plain; charset=utf-8"
};

startServer(preferredPort);

function startServer(port) {
  const server = http.createServer(handleRequest);

  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && port === preferredPort) {
      startServer(port + 1);
      return;
    }

    console.error(error.message);
  });

  server.listen(port, host, () => {
    const visibleHost = host === "0.0.0.0" ? "localhost o URL del hosting" : host;
    console.log(`BailaChat Live: http://${visibleHost}:${port}`);
    console.log(`Overlay OBS: http://${visibleHost}:${port}?overlay=1`);

    if (tiktokUser) {
      connectTikTok(tiktokUser);
    } else {
      console.log("Modo simulador. Para TikTok real: node server.js --tiktok usuario");
      console.log("En hosting usa la variable TIKTOK_USER.");
    }
  });
}

function handleRequest(req, res) {
  const cleanUrl = req.url.split("?")[0];

  if (cleanUrl === "/events") {
    connectEventStream(req, res);
    return;
  }

  if (cleanUrl === "/test/comment") {
    broadcast({ type: "comment", name: "Prueba Live" });
    res.end("ok");
    return;
  }

  if (cleanUrl === "/test/gift") {
    broadcast({ type: "gift", name: "Prueba Live", amount: 4, label: "regalo de prueba" });
    res.end("ok");
    return;
  }

  const requested = cleanUrl === "/" ? "index.html" : cleanUrl.replace(/^\/+/, "");
  const filePath = path.join(root, requested);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "text/plain" });
    res.end(data);
  });
}

function connectEventStream(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  });
  res.write(": connected\n\n");
  clients.add(res);
  sendEvent(res, liveStatus);
  req.on("close", () => clients.delete(res));
}

function broadcast(event) {
  clients.forEach((client) => sendEvent(client, event));
  console.log(`[${event.type}] ${event.name || "sin nombre"}`);
}

function sendEvent(client, event) {
  client.write(`data: ${JSON.stringify(event)}\n\n`);
}

function setLiveStatus(state, message) {
  liveStatus = { type: "status", state, message };
  broadcast(liveStatus);
}

async function connectTikTok(uniqueId) {
  let WebcastPushConnection;

  try {
    ({ WebcastPushConnection } = require("tiktok-live-connector"));
  } catch (error) {
    console.error("Falta instalar tiktok-live-connector.");
    console.error("Ejecuta: npm install");
    setLiveStatus("error", "Falta instalar tiktok-live-connector");
    return;
  }

  const cleanUser = uniqueId.replace(/^@/, "");
  const connection = new WebcastPushConnection(cleanUser);
  let reconnectTimer;

  setLiveStatus("connecting", `Buscando live de @${cleanUser}...`);

  connection.on("chat", (data) => {
    broadcast({
      type: "comment",
      name: data.nickname || data.uniqueId || cleanUser,
      text: data.comment || ""
    });
  });

  connection.on("gift", (data) => {
    if (data.giftType === 1 && !data.repeatEnd) {
      return;
    }

    const diamonds = Number(data.diamondCount || 0) * Number(data.repeatCount || 1);
    broadcast({
      type: "gift",
      name: data.nickname || data.uniqueId || cleanUser,
      amount: giftAmount(diamonds),
      label: data.giftName || "regalo",
      diamonds
    });
  });

  connection.on("like", (data) => {
    broadcast({
      type: "dance",
      name: data.nickname || data.uniqueId || cleanUser,
      label: "like"
    });
  });

  connection.on("connected", () => {
    console.log(`Conectado al live de @${cleanUser}`);
    setLiveStatus("connected", `Conectado al live de @${cleanUser}`);
  });

  connection.on("disconnected", () => {
    console.log(`Desconectado del live de @${cleanUser}`);
    setLiveStatus("waiting", `Live desconectado. Reintentando @${cleanUser}...`);
    scheduleTikTokReconnect(cleanUser);
  });

  try {
    await connection.connect();
  } catch (error) {
    console.error(`No pude conectar con @${cleanUser}. Verifica que este en vivo.`);
    console.error(error.message);
    setLiveStatus("waiting", `Esperando que @${cleanUser} este en vivo...`);
    scheduleTikTokReconnect(cleanUser);
  }

  function scheduleTikTokReconnect(user) {
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => connectTikTok(user), 15000);
  }
}

function giftAmount(diamonds) {
  if (diamonds >= 100) return 4;
  if (diamonds >= 20) return 3;
  if (diamonds >= 5) return 2;
  return 1;
}

function getArgValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return "";
  return process.argv[index + 1] || "";
}
