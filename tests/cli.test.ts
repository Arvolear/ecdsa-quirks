import path from "path";

import { expect } from "chai";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runCmd(
  cmd: string,
  args: string[],
  opts?: { cwd?: string; env?: NodeJS.ProcessEnv },
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: opts?.cwd ?? path.resolve(__dirname, ".."),
      stdio: ["ignore", "pipe", "pipe"],
      env: opts?.env ?? process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => resolve({ code: code ?? 0, stdout, stderr }));
  });
}

async function runBuild(cwd: string): Promise<void> {
  const { code, stderr } = await runCmd("npm", ["run", "build", "--silent"], { cwd });

  if (code !== 0) {
    throw new Error(`Build failed: ${stderr}`);
  }
}

function runCli(
  args: string[],
  opts?: { cwd?: string },
): Promise<{ code: number; stdout: string; stderr: string }> {
  const repo = opts?.cwd ?? path.resolve(__dirname, "..");
  const entry = path.resolve(repo, "dist/src/index.js");

  return runCmd(process.execPath, [entry, ...args], { cwd: repo });
}

describe("cli", function () {
  this.timeout(120000);

  const repoRoot = path.resolve(__dirname, "..");

  before(async () => {
    await runBuild(repoRoot);
  });

  it("should generate the signature", async () => {
    const { code, stdout, stderr } = await runCli([
      "--m1",
      "Ethereum the world computer",
      "--m2",
      "Bitcoin the store of value",
      "--eip191",
    ]);

    console.log(stdout);

    expect(code).to.equal(0, `stderr: ${stderr}`);
  });
});
