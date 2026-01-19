# Deployment Checklist

Use this checklist to deploy RemoteAssistant to your remote VM.

## Pre-Deployment (On Your Local Machine)

### ✅ Step 1: Get Telegram Credentials

- [ ] Open Telegram and search for `@BotFather`
- [ ] Send `/newbot` and follow instructions
- [ ] Save your **bot token** (e.g., `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`)
- [ ] Search for `@userinfobot` on Telegram
- [ ] Send `/start` and save your **user ID** (e.g., `123456789`)

### ✅ Step 2: Get Anthropic API Key (Optional)

- [ ] Visit https://console.anthropic.com/
- [ ] Create or copy your API key
- [ ] Save it securely (starts with `sk-ant-`)

### ✅ Step 3: Verify Local Build

```bash
# In the RemoteAssistant directory
npm install
npm run build
node test-setup.js
```

- [ ] All tests pass ✅

## Deployment (On Your Remote VM)

### ✅ Step 1: Copy Files to Remote VM

Choose one method:

**Option A: Using SCP**
```bash
# From your local machine
scp -r RemoteAssistant user@your-vm-ip:/home/user/
```

**Option B: Using Git**
```bash
# On your local machine
cd RemoteAssistant
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo>
git push

# On your remote VM
git clone <your-repo>
cd RemoteAssistant
```

**Option C: Using rsync**
```bash
# From your local machine
rsync -avz RemoteAssistant/ user@your-vm-ip:/home/user/RemoteAssistant/
```

- [ ] Files copied to remote VM

### ✅ Step 2: Install Prerequisites on VM

```bash
# Check Node.js version (need 18+)
node --version

# If not installed or too old, install Node.js:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

- [ ] Node.js 18+ installed

### ✅ Step 3: Install Claude Code CLI on VM

```bash
# Follow instructions from:
# https://github.com/anthropics/claude-code

# Verify installation
claude --version
```

- [ ] Claude Code CLI installed and working

### ✅ Step 4: Configure Environment

```bash
cd RemoteAssistant

# Create .env file
cp .env.example .env

# Edit with your credentials
nano .env
```

Edit the `.env` file:

```env
TELEGRAM_BOT_TOKEN=<your-bot-token>
ALLOWED_USER_ID=<your-user-id>
ANTHROPIC_API_KEY=<your-api-key>  # Optional
WORK_DIR=/path/to/your/ml/project
```

- [ ] `.env` file configured with correct values

### ✅ Step 5: Install Dependencies & Build

```bash
npm install
npm run build
```

- [ ] Dependencies installed
- [ ] TypeScript compiled successfully

### ✅ Step 6: Test the Bot

```bash
# Run in foreground first to test
npm start
```

Expected output:
```
🚀 Starting RemoteAssistant...
✅ Claude Code CLI is available
📋 Configuration:
   Working Directory: /path/to/your/ml/project
   Allowed User ID: 123456789
✅ RemoteAssistant is ready!
```

- [ ] Bot starts without errors
- [ ] Open Telegram on your phone
- [ ] Find your bot and send `/start`
- [ ] Bot responds with welcome message
- [ ] Try `/stats` command
- [ ] Try asking a natural language question

If everything works, press `Ctrl+C` to stop the bot and continue to production deployment.

### ✅ Step 7: Production Deployment

Choose **Option A (PM2)** or **Option B (SystemD)**:

#### Option A: Deploy with PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start the bot
pm2 start npm --name "remote-assistant" -- start

# Check status
pm2 status

# View logs
pm2 logs remote-assistant

# Make it start on boot
pm2 startup
# Follow the instructions it outputs
pm2 save
```

- [ ] PM2 installed
- [ ] Bot running in PM2
- [ ] Auto-start configured

**PM2 Useful Commands:**
```bash
pm2 status                      # Check status
pm2 logs remote-assistant       # View logs
pm2 restart remote-assistant    # Restart bot
pm2 stop remote-assistant       # Stop bot
pm2 delete remote-assistant     # Remove from PM2
```

#### Option B: Deploy with SystemD

```bash
# Edit the service file
nano remote-assistant.service

# Update these placeholders:
# - YOUR_USERNAME → your Linux username
# - /path/to/RemoteAssistant → absolute path to project
# - /path/to/node → output of: which node

# Copy to systemd
sudo cp remote-assistant.service /etc/systemd/system/

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable remote-assistant
sudo systemctl start remote-assistant

# Check status
sudo systemctl status remote-assistant
```

- [ ] Service file configured
- [ ] Service installed
- [ ] Service running
- [ ] Auto-start enabled

**SystemD Useful Commands:**
```bash
sudo systemctl status remote-assistant    # Check status
sudo journalctl -u remote-assistant -f    # View logs
sudo systemctl restart remote-assistant   # Restart
sudo systemctl stop remote-assistant      # Stop
```

## Post-Deployment Verification

### ✅ Step 8: Final Tests

From your mobile device (or desktop Telegram):

- [ ] Send `/start` - Bot responds
- [ ] Send `/stats` - Shows GPU/CPU/Memory stats
- [ ] Send `/logs training.log 10` - Shows logs (adjust filename)
- [ ] Send `/processes python` - Shows Python processes
- [ ] Ask: "What files are in this directory?" - Bot responds
- [ ] Ask: "What's the GPU usage?" - Bot responds
- [ ] Ask a follow-up question to test context - Bot responds appropriately
- [ ] Send `/clear` - Clears conversation
- [ ] Test that conversation context is cleared

### ✅ Step 9: Monitoring Setup

**Set up log rotation (Optional but recommended):**

```bash
# If using PM2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# If using SystemD, logs are auto-rotated by journald
```

- [ ] Log rotation configured

**Monitor system resources:**

```bash
# Check bot resource usage
# PM2:
pm2 monit

# SystemD:
ps aux | grep node
```

- [ ] Bot using reasonable resources (<100MB RAM)

### ✅ Step 10: Security Hardening

```bash
# Secure .env file
chmod 600 .env

# Verify permissions
ls -la .env
# Should show: -rw------- (only owner can read/write)

# Optional: Set up firewall if not already done
sudo ufw status
# If inactive, consider enabling it:
# sudo ufw enable
# sudo ufw allow ssh
# (Be careful not to lock yourself out!)
```

- [ ] `.env` file permissions secured
- [ ] Firewall configured (if needed)

## Troubleshooting

### Bot doesn't start

1. Check logs:
   ```bash
   # PM2:
   pm2 logs remote-assistant --lines 50

   # SystemD:
   sudo journalctl -u remote-assistant -n 50
   ```

2. Verify `.env` file:
   ```bash
   cat .env
   # Ensure no extra spaces, quotes, or newlines
   ```

3. Test manually:
   ```bash
   npm start
   # See the actual error message
   ```

### Bot doesn't respond

1. Check that bot is running:
   ```bash
   pm2 status  # or systemctl status remote-assistant
   ```

2. Verify bot token is correct

3. Verify your user ID is correct:
   ```bash
   # Check what's in .env
   grep ALLOWED_USER_ID .env
   ```

4. Check bot logs for "Unauthorized" messages

### Claude Code CLI errors

1. Verify Claude is installed:
   ```bash
   which claude
   claude --version
   ```

2. Test Claude manually:
   ```bash
   cd /your/work/dir
   claude -p "list files in current directory"
   ```

3. Check API key if required:
   ```bash
   grep ANTHROPIC_API_KEY .env
   ```

### Permission errors

1. Verify working directory permissions:
   ```bash
   ls -la /your/work/dir
   # Bot user should have read access
   ```

2. Run bot as correct user (not root)

## Maintenance

### Regular Tasks

- [ ] **Weekly**: Check logs for errors
  ```bash
  pm2 logs remote-assistant | grep -i error
  ```

- [ ] **Weekly**: Check disk space (sessions can grow)
  ```bash
  du -sh RemoteAssistant/sessions/
  ```

- [ ] **Monthly**: Update dependencies
  ```bash
  npm update
  npm run build
  pm2 restart remote-assistant
  ```

- [ ] **As needed**: Clear old sessions
  ```bash
  rm RemoteAssistant/sessions/*.json
  # Or selectively delete old ones
  ```

### Backup

Backup these files/directories:

- [ ] `.env` file (contains credentials)
- [ ] `sessions/` directory (conversation history)
- [ ] `src/` directory (if you made customizations)

```bash
# Example backup script
tar -czf remote-assistant-backup-$(date +%Y%m%d).tar.gz \
  .env sessions/ src/
```

## Success! 🎉

If you've checked all the boxes above, your RemoteAssistant is fully deployed and ready to use!

### What's Next?

- Use it regularly to monitor your ML training
- Customize commands for your specific workflows
- Share feedback and improvements
- Consider setting up proactive alerts
- Explore extending functionality

### Need Help?

- Check [README.md](README.md) for full documentation
- See [EXAMPLES.md](EXAMPLES.md) for usage inspiration
- Review [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
- Open issues on GitHub (if you set up a repo)

---

**Happy monitoring!** 📱🤖🚀
