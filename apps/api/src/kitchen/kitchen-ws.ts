import type { FastifyInstance } from "fastify";
import { eventBus } from "../shared/event-bus.js";

export async function kitchenWsRoutes(app: FastifyInstance) {
  app.get("/ws/kitchen", { websocket: true }, (connection: any, req) => {
    app.log.info("Kitchen screen connected to WebSocket");
    
    connection.send(JSON.stringify({ type: "CONNECTED" }));

    const listener = () => {
      connection.send(JSON.stringify({ type: "KITCHEN_UPDATE" }));
    };

    eventBus.on("kitchen-update", listener);

    connection.on("close", () => {
      app.log.info("Kitchen screen disconnected");
      eventBus.off("kitchen-update", listener);
    });
  });
}
