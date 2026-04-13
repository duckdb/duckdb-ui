import { execSync, spawn, type ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');

function findDuckDBBinary(): string {
  const candidates = [
    join(REPO_ROOT, 'build', 'release', 'duckdb'),
    join(REPO_ROOT, 'build', 'debug', 'duckdb'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    `DuckDB binary not found. Build the extension first with 'make' or 'make debug'. Searched:\n${candidates.join('\n')}`,
  );
}

export interface DuckDBServerOptions {
  port: number;
  tokenAuth?: boolean;
}

export interface DuckDBServerInfo {
  url: string;
  token: string;
  port: number;
}

export class DuckDBServer {
  private proc: ChildProcess | null = null;
  private info: DuckDBServerInfo | null = null;

  constructor(private readonly options: DuckDBServerOptions) {}

  async start(): Promise<DuckDBServerInfo> {
    const binary = findDuckDBBinary();
    const port = this.options.port;
    const tokenAuth = this.options.tokenAuth ?? true;

    const sql = [
      `SET ui_local_port=${port};`,
      `SET ui_enable_token_auth=${tokenAuth};`,
      `SELECT * FROM start_ui_server();`,
      `SELECT * FROM get_ui_token();`,
    ].join('\n');

    // Start DuckDB in a subprocess that stays alive (the server runs in a thread).
    // Use -noheader -csv for clean, parseable output.
    this.proc = spawn(binary, ['-noheader', '-csv'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return new Promise<DuckDBServerInfo>((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      const timeout = setTimeout(() => {
        this.stop();
        reject(
          new Error(
            `Timed out waiting for DuckDB server to start.\nstdout: ${stdout}\nstderr: ${stderr}`,
          ),
        );
      }, 10000);

      this.proc!.stdout!.on('data', (data: Buffer) => {
        stdout += data.toString();

        // The output has two result lines:
        // 1. "UI server started at http://localhost:<port>/?token=<token>"
        // 2. "<token>" (from get_ui_token)
        const lines = stdout
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        // Look for the token line (64-char hex string on its own line)
        const tokenLine = lines.find((l) => /^[0-9a-f]{64}$/.test(l));
        if (tokenLine) {
          clearTimeout(timeout);
          this.info = {
            url: `http://localhost:${port}`,
            token: tokenLine,
            port,
          };
          resolve(this.info);
        }
      });

      this.proc!.stderr!.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      this.proc!.on('close', (code) => {
        clearTimeout(timeout);
        if (!this.info) {
          reject(
            new Error(
              `DuckDB exited with code ${code} before server started.\nstdout: ${stdout}\nstderr: ${stderr}`,
            ),
          );
        }
      });

      // Send SQL commands via stdin, but don't close stdin — keep the process alive
      this.proc!.stdin!.write(sql + '\n');
    });
  }

  stop(): void {
    if (this.proc) {
      this.proc.stdin?.end();
      this.proc.kill('SIGTERM');
      this.proc = null;
      this.info = null;
    }
  }

  getInfo(): DuckDBServerInfo {
    if (!this.info) {
      throw new Error('Server not started');
    }
    return this.info;
  }
}
