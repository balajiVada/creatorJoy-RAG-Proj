import pino from "pino";

// Define structured logger with pretty-printing for development
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "HH:MM:ss.l", 
      ignore: "pid,hostname",       
    },
  },
});
