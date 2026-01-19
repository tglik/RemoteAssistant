#!/bin/bash

# RemoteAssistant Setup Script
# This script helps you set up RemoteAssistant quickly

set -e

echo "🚀 RemoteAssistant Setup"
echo "========================"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "   Please install Node.js v18 or higher from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version is too old (found v$NODE_VERSION, need v18+)"
    echo "   Please upgrade Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node -v) found"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed!"
    exit 1
fi

echo "✅ npm $(npm -v) found"

# Check for Claude Code CLI
if command -v claude &> /dev/null; then
    echo "✅ Claude Code CLI found: $(claude --version)"
else
    echo "⚠️  Claude Code CLI not found"
    echo "   Install it from: https://github.com/anthropics/claude-code"
    read -p "   Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔨 Building TypeScript..."
npm run build

# Check if .env exists
if [ -f .env ]; then
    echo ""
    echo "⚠️  .env file already exists"
    read -p "   Overwrite it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp .env.example .env
        CONFIGURE_ENV=true
    else
        CONFIGURE_ENV=false
    fi
else
    cp .env.example .env
    CONFIGURE_ENV=true
fi

if [ "$CONFIGURE_ENV" = true ]; then
    echo ""
    echo "📝 Let's configure your environment"
    echo ""

    # Get Telegram Bot Token
    echo "1️⃣  Telegram Bot Token"
    echo "   Get this from @BotFather on Telegram:"
    echo "   - Send /newbot to @BotFather"
    echo "   - Follow the instructions"
    echo "   - Copy the token"
    echo ""
    read -p "   Enter your Telegram Bot Token: " BOT_TOKEN

    # Get User ID
    echo ""
    echo "2️⃣  Your Telegram User ID"
    echo "   Get this from @userinfobot on Telegram:"
    echo "   - Send /start to @userinfobot"
    echo "   - Copy your user ID (a number)"
    echo ""
    read -p "   Enter your Telegram User ID: " USER_ID

    # Get Anthropic API Key (optional)
    echo ""
    echo "3️⃣  Anthropic API Key (optional)"
    echo "   Only needed if Claude Code requires it"
    echo "   Press Enter to skip"
    echo ""
    read -p "   Enter your Anthropic API Key (or press Enter to skip): " API_KEY

    # Get Work Directory
    echo ""
    echo "4️⃣  Working Directory"
    echo "   This is where your ML scripts are located"
    echo "   Default: current directory"
    echo ""
    read -p "   Enter working directory [$(pwd)]: " WORK_DIR
    WORK_DIR=${WORK_DIR:-$(pwd)}

    # Update .env file
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=$BOT_TOKEN|" .env
        sed -i '' "s|ALLOWED_USER_ID=.*|ALLOWED_USER_ID=$USER_ID|" .env
        sed -i '' "s|WORK_DIR=.*|WORK_DIR=$WORK_DIR|" .env
        if [ ! -z "$API_KEY" ]; then
            sed -i '' "s|ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=$API_KEY|" .env
        fi
    else
        # Linux
        sed -i "s|TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=$BOT_TOKEN|" .env
        sed -i "s|ALLOWED_USER_ID=.*|ALLOWED_USER_ID=$USER_ID|" .env
        sed -i "s|WORK_DIR=.*|WORK_DIR=$WORK_DIR|" .env
        if [ ! -z "$API_KEY" ]; then
            sed -i "s|ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=$API_KEY|" .env
        fi
    fi

    echo ""
    echo "✅ Configuration saved to .env"
fi

echo ""
echo "========================"
echo "✅ Setup Complete!"
echo "========================"
echo ""
echo "🚀 Quick Start:"
echo "   npm start              # Run the bot"
echo "   npm run dev            # Run in development mode"
echo ""
echo "📱 Next Steps:"
echo "   1. Run: npm start"
echo "   2. Open Telegram"
echo "   3. Find your bot and send /start"
echo ""
echo "🔧 Make it persistent with PM2:"
echo "   npm install -g pm2"
echo "   pm2 start npm --name remote-assistant -- start"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "📚 Documentation:"
echo "   README.md       # Full documentation"
echo "   QUICK_START.md  # Quick start guide"
echo "   EXAMPLES.md     # Usage examples"
echo ""
