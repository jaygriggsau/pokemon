import { neonConfig } from "@neondatabase/serverless";

export function register() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  try {
    const host = new URL(dbUrl).hostname;
    if (host === "db.localtest.me") {
      neonConfig.fetchEndpoint = (h: string) => {
        const [protocol, port] =
          h === "db.localtest.me" ? ["http", 4444] : ["https", 443];
        return `${protocol}://${h}:${port}/sql`;
      };
      console.log("[instrumentation] neonConfig.fetchEndpoint set for local proxy");
    }
  } catch {
    // DATABASE_URL not set or invalid — skip
  }
}
