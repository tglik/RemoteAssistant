# Quick Start Guide

Get RemoteAssistant running in 5 minutes!

## 1. Get Your Telegram Bot Token

1. Open Telegram
2. Search for `@BotFather`
3. Send `/newbot`
4. Name your bot (e.g., "My ML Assistant")
5. Copy the token (looks like `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`)

## 2. Get Your Telegram User ID

1. Search for `@userinfobot`
2. Send `/start`
3. Copy your user ID (a number like `123456789`)

## 3. Setup on Your Remote VM

```bash
# Clone the repository or copy the files
cd /path/to/RemoteAssistant

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit the .env file with your values
nano .env
```

In `.env`, set:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
ALLOWED_USER_ID=your_user_id_here
WORK_DIR=/path/to/your/ml/project
```

## 4. Build and Run

```bash
# Build
npm run build

# Run
npm start
```

## 5. Test It!

1. Open Telegram
2. Find your bot
3. Send `/start`
4. Try: `/stats` or "Show me GPU usage"

## That's it! 🎉

## Next Steps

### Make it persistent with PM2:

```bash
npm install -g pm2
pm2 start npm --name "remote-assistant" -- start
pm2 save
pm2 startup
```

### View logs:

```bash
pm2 logs remote-assistant
```

### Stop the bot:

```bash
pm2 stop remote-assistant
```

## Common First Commands

- `/stats` - See GPU/CPU/Memory
- `/logs training.log 50` - View last 50 lines of logs
- `/processes python` - Check if training is running
- "What files are in this directory?"
- "Check GPU temperature and utilization"
- "Show me the latest checkpoint files"

## Need Help?

See [README.md](README.md) for full documentation and troubleshooting.
