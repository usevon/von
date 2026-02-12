import { existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = [
  resolve(import.meta.dir, "../.env"),
  resolve(import.meta.dir, "../.env.test"),
  resolve(import.meta.dir, "../.env.test.example"),
].find((candidate) => existsSync(candidate));

if (envPath) {
  const envFile = Bun.file(envPath);
  const envContent = await envFile.text();

  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const [key, ...valueParts] = trimmed.split("=");
    if (key && process.env[key] === undefined) {
      process.env[key] = valueParts.join("=");
    }
  }
}

process.env.NODE_ENV ??= "test";
