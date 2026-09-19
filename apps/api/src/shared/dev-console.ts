const clients = new Set<any>();

export function addDevClient(connection: any) {
  clients.add(connection);
  connection.on("close", () => {
    clients.delete(connection);
  });
}

export function broadcastDevLog(log: any) {
  const message = JSON.stringify(log);
  for (const client of clients) {
    if (client.readyState === 1) { // OPEN
      client.send(message);
    }
  }
}
