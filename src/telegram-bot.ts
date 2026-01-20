import TelegramBot from 'node-telegram-bot-api';
import { ClaudeExecutor } from './claude-executor';
import { SessionManager } from './session-manager';

export class RemoteAssistantBot {
  private bot: TelegramBot;
  private executor: ClaudeExecutor;
  private sessionManager: SessionManager;
  private allowedUserId: number;

  constructor(token: string, allowedUserId: number, workDir: string, sessionManager: SessionManager) {
    this.bot = new TelegramBot(token, { polling: true });
    this.sessionManager = sessionManager;
    this.executor = new ClaudeExecutor(workDir, sessionManager);
    this.allowedUserId = allowedUserId;
  }

  async initialize(): Promise<void> {
    await this.executor.initialize();
    await this.sessionManager.initialize();
    this.setupCommands();
    this.setupMessageHandler();
    console.log('✅ RemoteAssistant bot initialized and running...');
  }

  private setupCommands(): void {
    // Set bot commands for Telegram UI
    this.bot.setMyCommands([
      { command: 'start', description: 'Start the bot and see help' },
      { command: 'stats', description: 'Get GPU/CPU/Memory stats' },
      { command: 'logs', description: 'Get tmux session output' },
      { command: 'processes', description: 'Check running processes' },
      { command: 'clear', description: 'Clear conversation history' },
      { command: 'help', description: 'Show help message' },
    ]);

    // /start command
    this.bot.onText(/\/start/, (msg) => {
      if (!this.isAuthorized(msg)) return;

      this.bot.sendMessage(
        msg.chat.id,
        `🤖 *RemoteAssistant Bot*\n\n` +
          `I'm connected to your remote VM and can help you monitor your ML training!\n\n` +
          `*Quick Commands:*\n` +
          `/stats - GPU, CPU, and memory usage\n` +
          `/logs - Recent training logs\n` +
          `/processes [name] - Check running processes\n` +
          `/help - Show this message\n\n` +
          `*Ask me anything:*\n` +
          `Just send a message and I'll use Claude Code to help you:\n` +
          `• "What's the current training loss?"\n` +
          `• "Show me the latest tensorboard events"\n` +
          `• "Analyze the training progress"\n` +
          `• "Check if my training script is still running"`,
        { parse_mode: 'Markdown' }
      );
    });

    // /help command
    this.bot.onText(/\/help/, (msg) => {
      if (!this.isAuthorized(msg)) return;
      this.bot.sendMessage(
        msg.chat.id,
        `🤖 *RemoteAssistant Help*\n\n` +
          `*Commands:*\n` +
          `/stats - System statistics (GPU/CPU/Memory)\n` +
          `/logs [session] [lines] - Get tmux session output\n` +
          `  Example: /logs 0 100 (default: session "0", 50 lines)\n` +
          `/processes [name] - Check running processes\n` +
          `  Example: /processes python\n\n` +
          `*Natural Language Queries:*\n` +
          `Send any message and I'll execute it using Claude Code CLI.\n\n` +
          `Examples:\n` +
          `• Check GPU utilization\n` +
          `• What's in the latest checkpoint?\n` +
          `• Show me tensorboard events from the last hour\n` +
          `• Analyze training.log for errors\n` +
          `• List all .pt files in the checkpoints directory`,
        { parse_mode: 'Markdown' }
      );
    });

    // /stats command
    this.bot.onText(/\/stats/, async (msg) => {
      if (!this.isAuthorized(msg)) return;

      const chatId = msg.chat.id;
      await this.bot.sendMessage(chatId, '📊 Fetching system stats...');

      const stats = await this.executor.getSystemStats();
      await this.bot.sendMessage(chatId, stats);
    });

    // /logs command
    this.bot.onText(/\/logs(?:\s+(.+))?/, async (msg, match) => {
      if (!this.isAuthorized(msg)) return;

      const chatId = msg.chat.id;
      const args = match?.[1]?.trim().split(/\s+/) || [];
      const sessionName = args[0] || '0';
      const lines = parseInt(args[1]) || 50;

      await this.bot.sendMessage(
        chatId,
        `📄 Fetching last ${lines} lines from tmux session "${sessionName}"...`
      );

      const logs = await this.executor.getTmuxLogs(sessionName, lines);
      // Send as plain text to avoid Markdown parsing issues
      await this.sendLongMessage(chatId, logs);
    });

    // /processes command
    this.bot.onText(/\/processes(?:\s+(.+))?/, async (msg, match) => {
      if (!this.isAuthorized(msg)) return;

      const chatId = msg.chat.id;
      const processName = match?.[1]?.trim() || 'python';

      await this.bot.sendMessage(chatId, `🔍 Checking for "${processName}" processes...`);

      const processes = await this.executor.checkProcesses(processName);
      // Send as plain text to avoid Markdown parsing issues
      await this.sendLongMessage(chatId, processes);
    });

    // /clear command
    this.bot.onText(/\/clear/, async (msg) => {
      if (!this.isAuthorized(msg)) return;

      const chatId = msg.chat.id;
      const userId = msg.from?.id.toString() || 'unknown';

      await this.sessionManager.clearSession(userId);
      this.executor.clearSession(userId); // Also clear Claude session
      await this.bot.sendMessage(
        chatId,
        '🗑️ Conversation history cleared. Starting fresh!'
      );
    });
  }

  private setupMessageHandler(): void {
    // Handle all text messages that aren't commands
    this.bot.on('message', async (msg) => {
      if (!this.isAuthorized(msg)) return;

      // Skip if it's a command (starts with /)
      if (msg.text?.startsWith('/')) return;

      const chatId = msg.chat.id;
      const query = msg.text;

      if (!query) return;

      console.log(`Query from ${msg.from?.username}: ${query}`);

      // Send "typing" action
      await this.bot.sendChatAction(chatId, 'typing');

      // Show processing message
      const processingMsg = await this.bot.sendMessage(
        chatId,
        '🤔 Processing your request with Claude Code...'
      );

      try {
        // Execute query using Claude Code CLI
        const result = await this.executor.executeQuery(
          query,
          msg.from?.id.toString() || 'unknown'
        );

        // Delete processing message
        await this.bot.deleteMessage(chatId, processingMsg.message_id);

        if (result.success) {
          await this.sendLongMessage(chatId, result.output);
        } else {
          await this.bot.sendMessage(
            chatId,
            `❌ *Error:*\n${result.error}\n\n` +
              (result.output ? `*Output:*\n\`\`\`\n${result.output}\n\`\`\`` : ''),
            { parse_mode: 'Markdown' }
          );
        }
      } catch (error: any) {
        await this.bot.deleteMessage(chatId, processingMsg.message_id);
        await this.bot.sendMessage(
          chatId,
          `❌ Failed to process request: ${error.message}`
        );
      }
    });
  }

  /**
   * Check if user is authorized to use the bot
   */
  private isAuthorized(msg: TelegramBot.Message): boolean {
    if (msg.from?.id !== this.allowedUserId) {
      this.bot.sendMessage(
        msg.chat.id,
        '⛔ Unauthorized. This bot is private.'
      );
      console.warn(`Unauthorized access attempt from user ID: ${msg.from?.id}`);
      return false;
    }
    return true;
  }

  /**
   * Send long messages by splitting them if needed (Telegram has 4096 char limit)
   */
  private async sendLongMessage(
    chatId: number,
    text: string,
    parseMode?: 'Markdown' | 'HTML'
  ): Promise<void> {
    const MAX_LENGTH = 4000; // Leave some margin

    if (text.length <= MAX_LENGTH) {
      await this.bot.sendMessage(chatId, text, { parse_mode: parseMode });
      return;
    }

    // Split into chunks
    const chunks: string[] = [];
    let currentChunk = '';

    const lines = text.split('\n');
    for (const line of lines) {
      if ((currentChunk + line + '\n').length > MAX_LENGTH) {
        chunks.push(currentChunk);
        currentChunk = line + '\n';
      } else {
        currentChunk += line + '\n';
      }
    }
    if (currentChunk) chunks.push(currentChunk);

    // Send chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const header = i === 0 ? '' : `📄 *Part ${i + 1}/${chunks.length}*\n\n`;
      await this.bot.sendMessage(chatId, header + chunk, { parse_mode: parseMode });
    }
  }

  /**
   * Start the bot
   */
  start(): void {
    console.log('🚀 Bot is polling for messages...');
  }

  /**
   * Stop the bot
   */
  stop(): void {
    this.bot.stopPolling();
    console.log('🛑 Bot stopped');
  }
}
