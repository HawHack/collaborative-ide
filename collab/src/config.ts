export type CollabConfig = {
  port: number;
  databaseUrl: string;
  redisUrl: string;
  jwtSecretKey: string;
  serverName: string;
};

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getConfig(): CollabConfig {
  const port = Number(process.env.PORT ?? "3001");

  return {
    port,
    databaseUrl: requireEnv(
      "DATABASE_URL",
      "postgresql://collab_ide:collab_ide@postgres:5432/collab_ide"
    ),
    redisUrl: requireEnv("REDIS_URL", "redis://redis:6379/0"),
    jwtSecretKey: requireEnv("JWT_SECRET_KEY"),
    serverName: process.env.COLLAB_SERVER_NAME ?? `collab-${process.pid}`,
  };
}