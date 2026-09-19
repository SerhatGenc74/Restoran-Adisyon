import pino from "pino";

// A simple setup: in real prod, we could output to a file and stdout.
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    targets: [
      {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
        }
      }
    ]
  }
});
