import { execFileSync } from "node:child_process";

const container = "xpansive-postgres";

function docker(args, options = {}) {
  return execFileSync("docker", args, { encoding: "utf8", stdio: options.silent ? ["ignore", "pipe", "pipe"] : "inherit" }).trim();
}

function containerExists() {
  try {
    docker(["container", "inspect", container], { silent: true });
    return true;
  } catch {
    return false;
  }
}

function isRunning() {
  try {
    return docker(["container", "inspect", "--format", "{{.State.Running}}", container], { silent: true }) === "true";
  } catch {
    return false;
  }
}

try {
  if (containerExists()) {
    if (!isRunning()) docker(["start", container]);
  } else {
    docker(["compose", "up", "-d", "db"]);
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      docker(["exec", container, "pg_isready", "-U", "xpansive", "-d", "xpansive"], { silent: true });
      console.log("Local PostgreSQL is ready.");
      process.exit(0);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error("PostgreSQL did not become ready in time.");
} catch (error) {
  console.error("Unable to start local PostgreSQL. Start Docker Desktop and run npm run db:up again.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
