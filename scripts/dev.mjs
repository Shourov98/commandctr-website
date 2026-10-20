import { spawn } from "node:child_process";
import net from "node:net";
import process from "node:process";

const HOST = process.env.HOST ?? "localhost";
const portArgIndex = process.argv.findIndex((arg) => arg === "-p" || arg === "--port");
const cliPort = portArgIndex >= 0 ? process.argv[portArgIndex + 1] : undefined;
const parsedPort = Number.parseInt(cliPort ?? process.env.PORT ?? "3000", 10);
const DEFAULT_PORT = Number.isNaN(parsedPort) ? 3000 : parsedPort;
const MAX_PORT_ATTEMPTS = Number.parseInt(process.env.PORT_ATTEMPTS ?? "20", 10);
const PROBE_HOSTS = ["127.0.0.1", "::1"];

function canConnect(port, host) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const done = (isOpen) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(isOpen);
    };

    socket.setTimeout(250);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

function isPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", (error) => {
      if (error?.code === "EADDRINUSE") {
        resolve(false);
        return;
      }

      reject(error);
    });

    server.once("listening", () => {
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve(true);
      });
    });

    server.listen({
      host: HOST,
      port,
      exclusive: true,
    });
  });
}

async function isPortFree(port) {
  for (const host of PROBE_HOSTS) {
    if (await canConnect(port, host)) {
      return false;
    }
  }

  return isPortAvailable(port);
}

async function getAvailablePort(startPort) {
  console.log(`Checking for an available port starting at ${HOST}:${startPort}...`);

  for (let attempt = 0; attempt < MAX_PORT_ATTEMPTS; attempt += 1) {
    const port = startPort + attempt;
    if (await isPortFree(port)) {
      if (port === startPort) {
        console.log(`Port ${port} is free.`);
      } else {
        console.log(`Port ${startPort} is busy, using ${port} instead.`);
      }
      return port;
    }
  }

  console.error(`Could not find a free port between ${startPort} and ${startPort + MAX_PORT_ATTEMPTS - 1}.`);
  process.exit(1);
}

const port = await getAvailablePort(DEFAULT_PORT);

console.log(`Starting dev server on ${HOST}:${port}...`);

const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--webpack",
    "--hostname",
    HOST,
    "--port",
    String(port),
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      WATCHPACK_POLLING: "true",
      WATCHPACK_POLLING_INTERVAL: "1000",
      CHOKIDAR_USEPOLLING: "true",
    },
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
