import * as dotenv from 'dotenv';
import * as path from 'path';
import { RemoteAssistantBot } from './telegram-bot';
import { ClaudeExecutor } from './claude-executor';
import { SessionManager } from './session-manager';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🚀 Starting RemoteAssistant...\n');

  // Validate environment variables
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const allowedUserId = process.env.ALLOWED_USER_ID;
  const workDir = process.env.WORK_DIR || process.cwd();

  if (!telegramToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN is not set in .env file');
    process.exit(1);
  }

  if (!allowedUserId) {
    console.error('❌ ALLOWED_USER_ID is not set in .env file');
    console.error('   Get your user ID from @userinfobot on Telegram');
    process.exit(1);
  }

  const userId = parseInt(allowedUserId);
  if (isNaN(userId)) {
    console.error('❌ ALLOWED_USER_ID must be a number');
    process.exit(1);
  }

  // Check if Claude Code CLI is available
  console.log('🔍 Checking for Claude Code CLI...');
  const executor = new ClaudeExecutor(workDir);
  const isClaudeAvailable = await executor.checkClaudeAvailability();

  if (!isClaudeAvailable) {
    console.warn('⚠️  Claude Code CLI not found. Some features may not work.');
    console.warn('   Install it from: https://github.com/anthropics/claude-code');
  } else {
    console.log('✅ Claude Code CLI is available');
  }

  // Display configuration
  console.log('\n📋 Configuration:');
  console.log(`   Working Directory: ${workDir}`);
  console.log(`   Allowed User ID: ${userId}`);
  console.log('');

  // Initialize session manager
  const sessionDir = path.join(process.cwd(), 'sessions');
  const sessionManager = new SessionManager(sessionDir);

  // Initialize and start bot
  try {
    const bot = new RemoteAssistantBot(telegramToken, userId, workDir, sessionManager);
    await bot.initialize();
    bot.start();

    console.log('✅ RemoteAssistant is ready!');
    console.log('📱 Open Telegram and send a message to your bot\n');

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down...');
      bot.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down...');
      bot.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
