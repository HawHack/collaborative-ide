type LogLevel = "info" | "warn" | "error";

function emit(level: LogLevel, event: string, payload: Record<string, unknown> = {}) {
  const entry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...payload,
  };
  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
    return;
  }
  console.log(line);
}

export const logger = {
  info(event: string, payload: Record<string, unknown> = {}) {
    emit("info", event, payload);
  },
  warn(event: string, payload: Record<string, unknown> = {}) {
    emit("warn", event, payload);
  },
  error(event: string, payload: Record<string, unknown> = {}) {
    emit("error", event, payload);
  },
};