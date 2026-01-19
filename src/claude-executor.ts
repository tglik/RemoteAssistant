import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SessionManager } from './session-manager';

const execAsync = promisify(exec);

export interface ClaudeResponse {
  success: boolean;
  output: string;
  error?: string;
}

/**
 * Executes queries using Claude Code CLI
 */
export class ClaudeExecutor {
  private workDir: string;
  private sessionDir: string;
  private sessionManager?: SessionManager;

  constructor(workDir: string, sessionManager?: SessionManager) {
    this.workDir = workDir;
    this.sessionDir = path.join(process.cwd(), 'sessions');
    this.sessionManager = sessionManager;
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
   * Execute a query using Claude Code CLI in headless mode
   */
  async executeQuery(query: string, userId: string): Promise<ClaudeResponse> {
    try {
      // Get conversation context if session manager is available
      let fullQuery = query;
      if (this.sessionManager) {
        const context = await this.sessionManager.getConversationContext(userId, 5);
        if (context) {
          fullQuery = `${context}\n${query}`;
        }
      }

      // Build the claude command
      // Using headless mode with JSON output for structured responses
      const command = `claude -p "${this.escapeQuery(fullQuery)}" --output json`;

      console.log(`Executing in ${this.workDir}:`, command.substring(0, 100) + '...');

      const { stdout, stderr } = await execAsync(command, {
        cwd: this.workDir,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
        timeout: 300000, // 5 minute timeout
      });

      // Parse JSON output if available
      let output = stdout;
      try {
        const jsonOutput = JSON.parse(stdout);
        output = this.formatJsonOutput(jsonOutput);
      } catch {
        // Not JSON, use raw output
        output = stdout;
      }

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
      console.log(`Executing bash command in ${this.workDir}:`, command);

      const { stdout, stderr } = await execAsync(command, {
        cwd: this.workDir,
        maxBuffer: 10 * 1024 * 1024,
        timeout: 60000, // 1 minute timeout for bash commands
      });

      return {
        success: true,
        output: stdout || stderr || 'Command executed successfully',
      };
    } catch (error: any) {
      console.error('Bash execution error:', error);
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
      await execAsync('claude --version');
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
   * Format JSON output from Claude CLI
   */
  private formatJsonOutput(json: any): string {
    if (typeof json === 'string') return json;
    if (json.response) return json.response;
    if (json.output) return json.output;
    return JSON.stringify(json, null, 2);
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

      return [
        '📊 System Stats:',
        '',
        '🎮 GPU:',
        results[0].output || 'N/A',
        '',
        '💻 ' + (results[1].output || 'CPU: N/A'),
        '🧠 ' + (results[2].output || 'Memory: N/A'),
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
   * Check if processes are running (by name)
   */
  async checkProcesses(processName: string): Promise<string> {
    const result = await this.executeBashCommand(
      `ps aux | grep "${processName}" | grep -v grep || echo "No processes found"`
    );
    return result.output;
  }
}
