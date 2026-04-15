type LogLevel = "debug" | "info" | "warn" | "error";

type LoggerContext = {
  service: string;
};

type LogPayload = Record<string, unknown>;

export function createLogger(context: LoggerContext) {
  const emit = (level: LogLevel, message: string, payload?: LogPayload) => {
    const event = {
      timestamp: new Date().toISOString(),
      level,
      service: context.service,
      message,
      ...payload
    };

    console.log(JSON.stringify(event));
  };

  return {
    debug: (message: string, payload?: LogPayload) => emit("debug", message, payload),
    info: (message: string, payload?: LogPayload) => emit("info", message, payload),
    warn: (message: string, payload?: LogPayload) => emit("warn", message, payload),
    error: (message: string, payload?: LogPayload) => emit("error", message, payload)
  };
}
