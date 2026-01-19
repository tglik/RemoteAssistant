# RemoteAssistant - Telegram Bot for Claude Code CLI

Monitor and interact with your remote ML training jobs from anywhere using Claude Code through Telegram!

## What is RemoteAssistant?

RemoteAssistant is a bridge that connects Claude Code CLI running on your remote VM to Telegram, allowing you to:

- 📊 Check GPU/CPU/Memory usage on the go
- 📝 View training logs and tensorboard events
- 🤖 Ask natural language questions about your training
- 💬 Get intelligent analysis of your ML experiments
- 📱 Control everything from your mobile device

## Architecture

```
Your Mobile Device (Telegram)
    ↓
Telegram Bot API
    ↓
RemoteAssistant Bridge (Node.js)
    ↓
Claude Code CLI
    ↓
Your ML Training Scripts & Data
```

## Features

### Quick Commands
- `/stats` - Get GPU, CPU, and memory usage
- `/logs [file] [lines]` - View training logs
- `/processes [name]` - Check running processes
- `/clear` - Clear conversation history
- `/help` - Show help message

### Natural Language Queries
Send any question and Claude Code will execute it:
- "What's the current training loss?"
- "Show me the latest checkpoint files"
- "Analyze training.log for errors"
- "Check if my training is still running"
- "Compare the last two tensorboard event files"

### Conversation Context
RemoteAssistant maintains conversation history, so you can have natural follow-up conversations:
- You: "Show me the GPU usage"
- Bot: *shows GPU stats*
- You: "Is that normal for this model?"
- Bot: *analyzes and provides context*

## Setup Guide

### Prerequisites

1. **Node.js** (v18 or higher)
2. **Claude Code CLI** installed on your remote VM
   - Install from: https://github.com/anthropics/claude-code
3. **Telegram Account**
4. **Anthropic API Key** (if using Claude SDK features)

### Step 1: Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` command
3. Follow the instructions to name your bot
4. Copy the bot token (looks like `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`)
5. Get your Telegram User ID:
   - Search for [@userinfobot](https://t.me/userinfobot)
   - Send `/start` and copy your user ID

### Step 2: Install RemoteAssistant

On your remote VM:

```bash
# Clone or copy the RemoteAssistant code to your VM
cd /path/to/RemoteAssistant

# Install dependencies
npm install

# Build the TypeScript code
npm run build
```

### Step 3: Configure Environment

Create a `.env` file:

```bash
cp .env.example .env
nano .env
```

Edit the `.env` file with your settings:

```env
# Your Telegram bot token from @BotFather
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ

# Your Anthropic API key (optional - needed if Claude Code requires it)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# Your Telegram User ID from @userinfobot
ALLOWED_USER_ID=123456789

# Working directory where your ML scripts run
WORK_DIR=/home/user/ml-training
```

### Step 4: Run the Bot

```bash
# Run in development mode
npm run dev

# Or run the compiled version
npm start
```

You should see:

```
🚀 Starting RemoteAssistant...

🔍 Checking for Claude Code CLI...
✅ Claude Code CLI is available

📋 Configuration:
   Working Directory: /home/user/ml-training
   Allowed User ID: 123456789

✅ RemoteAssistant is ready!
📱 Open Telegram and send a message to your bot
```

### Step 5: Test Your Bot

1. Open Telegram and find your bot
2. Send `/start` to begin
3. Try commands like:
   - `/stats` - Check system resources
   - "What files are in my current directory?"
   - "Show me GPU utilization"

## Running as a Service

To keep the bot running even after you disconnect, use a process manager:

### Option 1: Using PM2

```bash
# Install PM2
npm install -g pm2

# Start the bot
pm2 start npm --name "remote-assistant" -- start

# Make it auto-start on boot
pm2 startup
pm2 save

# View logs
pm2 logs remote-assistant

# Stop the bot
pm2 stop remote-assistant
```

### Option 2: Using systemd

Create `/etc/systemd/system/remote-assistant.service`:

```ini
[Unit]
Description=RemoteAssistant Telegram Bot
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/RemoteAssistant
ExecStart=/usr/bin/npm start
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable remote-assistant
sudo systemctl start remote-assistant
sudo systemctl status remote-assistant
```

## Usage Examples

### Monitoring Training

```
You: /stats
Bot: 📊 System Stats:

🎮 GPU:
0, Tesla V100, 95%, 14523 MiB, 16384 MiB

💻 CPU Usage: 45.2%
🧠 Memory: 28G/64G

You: Is the GPU usage normal?
Bot: Yes, 95% GPU utilization is excellent for training...
```

### Checking Logs

```
You: /logs training.log 20
Bot: 📄 Fetching last 20 lines from training.log...

```
Epoch 45/100 - Loss: 0.234 - Val Loss: 0.256
Epoch 46/100 - Loss: 0.229 - Val Loss: 0.251
...
```

You: The validation loss is increasing. Should I be worried?
Bot: The validation loss increasing while training loss decreases...
```

### Natural Language Queries

```
You: Show me all checkpoint files created in the last hour
Bot: [Lists checkpoint files with timestamps]

You: What's the size of the latest checkpoint?
Bot: The latest checkpoint (checkpoint_epoch_46.pt) is 1.2GB

You: Compare it to the previous checkpoint
Bot: [Analyzes and compares the two checkpoints]
```

## Configuration Options

### Session Management

Edit [src/session-manager.ts](src/session-manager.ts):

```typescript
const sessionManager = new SessionManager(sessionDir, 50); // Keep last 50 messages
```

### Timeout Settings

Edit [src/claude-executor.ts](src/claude-executor.ts):

```typescript
timeout: 300000, // 5 minute timeout for Claude queries
```

### Working Directory

Change `WORK_DIR` in `.env` or pass it when initializing the bot.

## Troubleshooting

### Bot doesn't respond
- Check that the bot is running: `pm2 status` or `systemctl status remote-assistant`
- Verify your bot token is correct
- Check logs: `pm2 logs remote-assistant` or `journalctl -u remote-assistant -f`

### "Unauthorized" message
- Make sure `ALLOWED_USER_ID` matches your Telegram user ID
- Get your ID from @userinfobot

### Claude Code not found
- Verify Claude Code CLI is installed: `claude --version`
- Add Claude to PATH or use absolute path in commands

### Permission errors
- Ensure the bot has read access to your working directory
- Check file permissions: `ls -la $WORK_DIR`

### Out of memory
- Reduce `maxMessagesPerSession` in SessionManager
- Increase `maxBuffer` in claude-executor.ts if dealing with large outputs

## Security Considerations

1. **User ID Restriction**: The bot only responds to the configured `ALLOWED_USER_ID`
2. **API Keys**: Keep your `.env` file secure and never commit it to git
3. **File Access**: The bot has access to files in `WORK_DIR` - be careful what you expose
4. **Command Execution**: Commands are executed with the bot's user permissions
5. **Network**: Consider running the bot behind a firewall

## Advanced Usage

### Custom Commands

Add custom commands in [src/telegram-bot.ts](src/telegram-bot.ts):

```typescript
this.bot.onText(/\/custom/, async (msg) => {
  // Your custom logic here
});
```

### Integration with TensorBoard

```typescript
async getTensorBoardEvents(): Promise<string> {
  const result = await this.executeBashCommand(
    'python -c "from tensorboard.backend.event_processing import event_accumulator; ..."'
  );
  return result.output;
}
```

### Alerts and Notifications

Set up proactive monitoring:

```typescript
setInterval(async () => {
  const stats = await this.executor.getSystemStats();
  if (stats.includes('100%')) {
    await this.bot.sendMessage(chatId, '⚠️ GPU at 100%!');
  }
}, 60000); // Check every minute
```

## Contributing

Feel free to extend RemoteAssistant with:
- Additional monitoring commands
- Integration with specific ML frameworks
- Better error handling
- UI improvements

## License

MIT

## Support

For issues and questions:
- Claude Code: https://github.com/anthropics/claude-code
- Telegram Bot API: https://core.telegram.org/bots/api

---

**Made with Claude Code** 🤖
