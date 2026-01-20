import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { SessionManager } from './session-manager';

export interface ClaudeResponse {
  success: boolean;
  output: string;
  error?: string;
}

/**
 * Helper function to execute commands using spawn for better reliability
 */
function execCommand(command: string, options: {
  cwd: string;
  timeout?: number;
  env?: NodeJS.ProcessEnv;
}): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    // Execute using Node's shell mode for portability.
    // On POSIX, Node uses /bin/sh; on Windows, it uses cmd.exe.
    // This avoids hard-requiring bash (and avoids ENOENT when bash exists but is not runnable).
    const child = spawn(command, {
      cwd: options.cwd,
      env: options.env || process.env,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    const timeout = options.timeout ? setTimeout(() => {
      child.kill();
      reject(new Error(`Command timed out after ${options.timeout}ms`));
    }, options.timeout) : null;

    child.on('error', (error) => {
      if (timeout) clearTimeout(timeout);
      reject(error);
    });

    child.on('close', (code) => {
      if (timeout) clearTimeout(timeout);
      if (code === 0 || stdout || stderr) {
        resolve({ stdout, stderr });
      } else {
        const error: any = new Error(`Command failed with exit code ${code}`);
        error.code = code;
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });
  });
}

/**
 * Executes queries using Claude Code CLI
 */
export class ClaudeExecutor {
  private workDir: string;
  private sessionDir: string;
  private sessionManager?: SessionManager;
  private userSessionIds: Map<string, string>; // Maps userId to Claude session UUID

  constructor(workDir: string, sessionManager?: SessionManager) {
    this.workDir = workDir;
    this.sessionDir = path.join(process.cwd(), 'sessions');
    this.sessionManager = sessionManager;
    this.userSessionIds = new Map();
  }

  async initialize(): Promise<void> {
    // Create sessions directory if it doesn't exist
    try {
      await fs.mkdir(this.sessionDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create sessions directory:', error);
    }
  }

  /**
   * Generate a new UUID for Claude session
   */
  private generateSessionId(): string {
    return crypto.randomUUID();
  }

  /**
   * Execute a query using Claude Code CLI in headless mode
   * Uses --session-id to create new sessions and --resume to continue them
   */
  async executeQuery(query: string, userId: string): Promise<ClaudeResponse> {
    try {
      const existingSessionId = this.userSessionIds.get(userId);

      let command: string;
      if (existingSessionId) {
        // Resume existing session using the stored UUID
        command = `claude --resume "${existingSessionId}" -p "${this.escapeQuery(query)}"`;
        console.log(`Resuming session ${existingSessionId} for user ${userId}`);
      } else {
        // First query - create new session with a fresh UUID
        const newSessionId = this.generateSessionId();
        command = `claude --session-id "${newSessionId}" -p "${this.escapeQuery(query)}"`;
        console.log(`Creating new session ${newSessionId} for user ${userId}`);
        this.userSessionIds.set(userId, newSessionId);
      }

      console.log(`Executing in ${this.workDir}`);
      console.log(`Query: ${query.substring(0, 50)}...`);

      const { stdout, stderr } = await execCommand(command, {
        cwd: this.workDir,
        timeout: 300000, // 5 minute timeout
        env: { ...process.env, PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin' },
      });

      // Use the stdout directly
      let output = stdout.trim() || stderr.trim();

      // Save to session history if available
      if (this.sessionManager) {
        await this.sessionManager.addMessage(userId, 'user', query);
        await this.sessionManager.addMessage(userId, 'assistant', output);
      }

      return {
        success: true,
        output: output || stderr || 'Command executed successfully (no output)',
      };
    } catch (error: any) {
      console.error('Claude execution error:', error);
      return {
        success: false,
        output: error.stdout || '',
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Execute a direct bash command (for simple queries like checking GPU status)
   */
  async executeBashCommand(command: string): Promise<ClaudeResponse> {
    try {
      console.log(`Executing command in ${this.workDir}:`, command);

      const { stdout, stderr } = await execCommand(command, {
        cwd: this.workDir,
        timeout: 60000, // 1 minute timeout
        env: { ...process.env, PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin' },
      });

      return {
        success: true,
        output: stdout || stderr || 'Command executed successfully',
      };
    } catch (error: any) {
      console.error('Command execution error:', error);
      return {
        success: false,
        output: error.stdout || '',
        error: error.message || 'Command failed',
      };
    }
  }

  /**
   * Check if Claude Code CLI is available
   */
  async checkClaudeAvailability(): Promise<boolean> {
    try {
      await execCommand('claude --version', {
        cwd: this.workDir,
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Escape query string for shell command
   */
  private escapeQuery(query: string): string {
    return query.replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$');
  }

  /**
   * Clear the session for a user (will create a new session on next query)
   */
  clearSession(userId: string): void {
    const oldSessionId = this.userSessionIds.get(userId);
    this.userSessionIds.delete(userId);
    console.log(`Cleared session ${oldSessionId} for user ${userId} - next query will start a new session`);
  }

  /**
   * Get quick system stats (GPU, CPU, memory)
   */
  async getSystemStats(): Promise<string> {
    const commands = [
      'nvidia-smi --query-gpu=index,name,utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits 2>/dev/null || echo "No GPU found"',
      'top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk \'{print "CPU Usage: " 100 - $1"%"}\'',
      'free -h | awk \'/^Mem:/ {print "Memory: " $3 "/" $2}\'',
    ];

    try {
      const results = await Promise.all(
        commands.map(cmd => this.executeBashCommand(cmd))
      );

      // Format GPU output
      const gpuOutput = results[0].output?.trim() || 'N/A';
      let gpuFormatted = '';

      if (gpuOutput === 'No GPU found' || gpuOutput === 'N/A') {
        gpuFormatted = 'No GPU found';
      } else {
        // Parse CSV: index, name, utilization, memory.used, memory.total
        const gpuLines = gpuOutput.split('\n').filter(line => line.trim());
        gpuFormatted = gpuLines.map(line => {
          const parts = line.split(',').map(p => p.trim());
          if (parts.length >= 5) {
            const [index, name, util, memUsed, memTotal] = parts;
            return `GPU ${index}: ${name}\n  Compute: ${util}% | Memory: ${memUsed}MB / ${memTotal}MB (${Math.round((parseFloat(memUsed) / parseFloat(memTotal)) * 100)}%)`;
          }
          return line;
        }).join('\n');
      }

      return [
        '📊 System Stats:',
        '',
        '🎮 GPU:',
        gpuFormatted,
        '',
        '💻 ' + (results[1].output?.trim() || 'CPU: N/A'),
        '🧠 ' + (results[2].output?.trim() || 'Memory: N/A'),
      ].join('\n');
    } catch (error) {
      return '❌ Failed to get system stats';
    }
  }

  /**
   * Get training logs (last N lines from a log file)
   */
  async getTrainingLogs(logFile: string, lines: number = 50): Promise<string> {
    const result = await this.executeBashCommand(`tail -n ${lines} "${logFile}"`);
    return result.output || 'No logs found';
  }

  /**
   * Get tmux session output (last N lines)
   */
  async getTmuxLogs(sessionName: string, lines: number = 50): Promise<string> {
    // First check if tmux session exists
    const checkResult = await this.executeBashCommand(
      `tmux list-sessions 2>/dev/null | grep -q "^${sessionName}:" && echo "exists" || echo "not found"`
    );

    if (checkResult.output?.trim() === 'not found') {
      return `Tmux session "${sessionName}" not found.\n\nAvailable sessions:\n` +
        (await this.executeBashCommand('tmux list-sessions 2>/dev/null || echo "No tmux sessions found"')).output;
    }

    // Capture the pane output
    const result = await this.executeBashCommand(
      `tmux capture-pane -p -t "${sessionName}" -S -${lines} 2>/dev/null || echo "Failed to capture tmux output"`
    );

    return result.output || 'No output captured';
  }

  /**
   * Check if processes are running (by name)
   */
  async checkProcesses(processName: string): Promise<string> {
    const result = await this.executeBashCommand(
      `ps aux | grep "${processName}" | grep -v grep || echo "No processes found"`
    );
    return result.output;
  }
}
