# RemoteAssistant Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Your Mobile Device                       │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              Telegram Mobile App                        │    │
│  │  • Send commands (/stats, /logs, etc.)                 │    │
│  │  • Ask natural language questions                      │    │
│  │  • Receive responses and notifications                 │    │
│  └────────────────────────────────────────────────────────┘    │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           │ HTTPS
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Telegram Bot API                             │
│                   (Hosted by Telegram)                           │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           │ Polling (Long Polling)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Remote VM / Server                         │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         RemoteAssistant Bot (Node.js/TypeScript)        │    │
│  │                                                         │    │
│  │  ┌──────────────────────────────────────────────┐      │    │
│  │  │  TelegramBot (telegram-bot.ts)               │      │    │
│  │  │  • Receives messages from Telegram           │      │    │
│  │  │  • Authenticates user                        │      │    │
│  │  │  • Routes commands                           │      │    │
│  │  │  • Formats responses                         │      │    │
│  │  └────────┬─────────────────────────────────────┘      │    │
│  │           │                                             │    │
│  │           ▼                                             │    │
│  │  ┌──────────────────────────────────────────────┐      │    │
│  │  │  SessionManager (session-manager.ts)         │      │    │
│  │  │  • Maintains conversation history            │      │    │
│  │  │  • Provides context for follow-up queries    │      │    │
│  │  │  • Persists sessions to disk                 │      │    │
│  │  └────────┬─────────────────────────────────────┘      │    │
│  │           │                                             │    │
│  │           ▼                                             │    │
│  │  ┌──────────────────────────────────────────────┐      │    │
│  │  │  ClaudeExecutor (claude-executor.ts)         │      │    │
│  │  │  • Executes queries via Claude Code CLI      │      │    │
│  │  │  • Runs bash commands                        │      │    │
│  │  │  • Formats responses                         │      │    │
│  │  └────────┬─────────────────────────────────────┘      │    │
│  │           │                                             │    │
│  └───────────┼─────────────────────────────────────────────┘    │
│              │                                                  │
│              ▼                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              Claude Code CLI                            │    │
│  │  • Processes natural language queries                  │    │
│  │  • Executes file operations                            │    │
│  │  • Runs system commands                                │    │
│  │  • Analyzes data and code                              │    │
│  └────────────────────────────────────────────────────────┘    │
│              │                                                  │
│              ▼                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         Your ML Training Environment                    │    │
│  │                                                         │    │
│  │  • Training scripts (train.py, etc.)                   │    │
│  │  • Checkpoint files                                    │    │
│  │  • Log files                                           │    │
│  │  • TensorBoard events                                  │    │
│  │  • GPU/CPU resources                                   │    │
│  │  • Data files                                          │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Telegram Bot Interface (`telegram-bot.ts`)

**Responsibilities:**
- Receive and authenticate incoming messages
- Parse commands and route to appropriate handlers
- Format and send responses back to users
- Handle long messages (split into chunks if needed)
- Manage bot commands (/stats, /logs, etc.)

**Key Methods:**
- `setupCommands()` - Registers bot commands
- `setupMessageHandler()` - Handles natural language queries
- `isAuthorized()` - Security check
- `sendLongMessage()` - Handles Telegram's 4096 character limit

### 2. Session Manager (`session-manager.ts`)

**Responsibilities:**
- Maintain conversation history per user
- Provide context for Claude Code queries
- Persist sessions to disk
- Manage session lifecycle

**Key Methods:**
- `getSession(userId)` - Get or create user session
- `addMessage(userId, role, content)` - Add to history
- `getConversationContext(userId, lastN)` - Format context for Claude
- `clearSession(userId)` - Reset conversation

**Data Structure:**
```typescript
interface Session {
  userId: string;
  messages: Message[];
  createdAt: number;
  lastActivityAt: number;
}
```

### 3. Claude Executor (`claude-executor.ts`)

**Responsibilities:**
- Execute queries using Claude Code CLI
- Run direct bash commands
- Format responses
- Handle errors and timeouts

**Key Methods:**
- `executeQuery(query, userId)` - Main query execution
- `executeBashCommand(command)` - Direct command execution
- `getSystemStats()` - Quick system info
- `getTrainingLogs(file, lines)` - Read log files
- `checkProcesses(name)` - Process monitoring

**Execution Flow:**
1. Receive query from TelegramBot
2. Get conversation context from SessionManager
3. Build Claude Code CLI command
4. Execute command with timeout
5. Parse and format output
6. Save to session history
7. Return response

### 4. Claude Code CLI

**Integration:**
- Executed as a subprocess using Node.js `child_process`
- Uses headless mode with `-p` flag for non-interactive queries
- JSON output mode for structured responses
- Runs in the configured `WORK_DIR`

**Command Format:**
```bash
claude -p "query with context" --output json
```

## Data Flow

### Example: Natural Language Query

```
1. User sends: "What's the current GPU usage?"
   │
   ▼
2. Telegram Bot API → RemoteAssistant Bot
   │
   ▼
3. TelegramBot.on('message')
   │ - Authenticates user
   │ - Extracts message text
   │
   ▼
4. SessionManager.getConversationContext()
   │ - Retrieves last 5 messages
   │ - Formats as context
   │
   ▼
5. ClaudeExecutor.executeQuery()
   │ - Combines context + query
   │ - Executes: claude -p "Previous conversation: ... Current query: What's the current GPU usage?"
   │
   ▼
6. Claude Code CLI
   │ - Interprets query
   │ - Runs: nvidia-smi (or equivalent)
   │ - Formats response
   │
   ▼
7. ClaudeExecutor
   │ - Parses JSON output
   │ - Saves to session history
   │
   ▼
8. TelegramBot.sendMessage()
   │ - Formats for Telegram
   │ - Splits if too long
   │
   ▼
9. User receives: "GPU 0: 87% utilization, 15.2GB/16GB memory"
```

### Example: Quick Command

```
1. User sends: "/stats"
   │
   ▼
2. TelegramBot.onText(/\/stats/)
   │
   ▼
3. ClaudeExecutor.getSystemStats()
   │ - Runs multiple bash commands in parallel:
   │   • nvidia-smi for GPU
   │   • top for CPU
   │   • free for memory
   │
   ▼
4. Format and send response
```

## Session Persistence

Sessions are stored in `sessions/` directory:

```
sessions/
├── 123456789.json      # User 1's session
└── 987654321.json      # User 2's session
```

**Session File Format:**
```json
{
  "userId": "123456789",
  "messages": [
    {
      "role": "user",
      "content": "What's the GPU usage?",
      "timestamp": 1704067200000
    },
    {
      "role": "assistant",
      "content": "GPU 0: 87% utilization...",
      "timestamp": 1704067203000
    }
  ],
  "createdAt": 1704067200000,
  "lastActivityAt": 1704067203000
}
```

## Security Architecture

### Authentication
1. **User ID Whitelist**: Only configured `ALLOWED_USER_ID` can use the bot
2. **Token Security**: Bot token stored in `.env` (not in git)
3. **API Key Protection**: Anthropic API key secured in `.env`

### Authorization
- Bot runs with VM user permissions
- File access limited to `WORK_DIR`
- No privilege escalation

### Best Practices
- Keep `.env` file secure (600 permissions)
- Run bot as non-root user
- Use firewall to restrict network access
- Regular security updates for dependencies

## Deployment Architectures

### Option 1: Direct on Training VM

```
┌─────────────────────────┐
│    Training VM          │
│  ┌──────────────────┐   │
│  │ RemoteAssistant  │   │
│  │      Bot         │   │
│  └────────┬─────────┘   │
│           │             │
│           ▼             │
│  ┌──────────────────┐   │
│  │   ML Training    │   │
│  └──────────────────┘   │
└─────────────────────────┘
```

**Pros:** Direct access to all resources
**Cons:** Bot consumes VM resources

### Option 2: Separate Management VM

```
┌─────────────────────┐      ┌─────────────────────┐
│   Management VM     │      │    Training VM      │
│ ┌─────────────────┐ │ SSH  │ ┌─────────────────┐ │
│ │ RemoteAssistant │◄├──────┤►│   ML Training   │ │
│ │      Bot        │ │      │ └─────────────────┘ │
│ └─────────────────┘ │      │                     │
└─────────────────────┘      └─────────────────────┘
```

**Pros:** Isolated, doesn't affect training
**Cons:** Requires SSH setup, more complex

### Option 3: Containerized

```
┌─────────────────────────────────┐
│         Training VM             │
│  ┌────────────┐ ┌────────────┐  │
│  │   Docker   │ │   Docker   │  │
│  │ RemoteAsst │ │  Training  │  │
│  └────────────┘ └────────────┘  │
│         │              │         │
│         └──────┬───────┘         │
│                │                 │
│         ┌──────▼──────┐          │
│         │   Volumes   │          │
│         └─────────────┘          │
└─────────────────────────────────┘
```

**Pros:** Portable, reproducible
**Cons:** Additional Docker complexity

## Performance Considerations

### Resource Usage
- **Memory**: ~50-100MB for Node.js bot
- **CPU**: Minimal when idle, spikes during Claude execution
- **Network**: Polling uses minimal bandwidth (~1-2 KB/s)

### Optimizations
1. **Message Batching**: Combine multiple queries when possible
2. **Session Limits**: Keep last N messages to prevent memory growth
3. **Timeout Management**: Prevent hung processes
4. **Output Buffering**: Handle large outputs (up to 10MB)

### Scalability
- Single user: Handles hundreds of queries/day easily
- Multiple users: Add more `ALLOWED_USER_ID` entries (requires code modification)
- High load: Consider rate limiting in production

## Error Handling

### Bot Level
- Network disconnections → Automatic reconnection
- API errors → Retry with exponential backoff
- Invalid commands → User-friendly error messages

### Executor Level
- Command timeouts → Graceful termination
- Permission errors → Clear error reporting
- Output too large → Truncation with warning

### Session Level
- Corrupted session files → Auto-recovery
- Disk full → Graceful degradation
- Memory limits → Automatic cleanup

## Monitoring and Logging

### Console Logs
```
✅ RemoteAssistant bot initialized
📂 Loaded 1 session(s)
Executing in /home/user/ml: claude -p "..."
Query from @username: What's the GPU usage?
```

### PM2 Integration
```bash
pm2 logs remote-assistant     # View logs
pm2 monit                     # Live monitoring
pm2 status                    # Status check
```

### SystemD Integration
```bash
journalctl -u remote-assistant -f    # Follow logs
systemctl status remote-assistant    # Status
```

## Extension Points

### Custom Commands
Add new commands in `telegram-bot.ts`:
```typescript
this.bot.onText(/\/custom/, async (msg) => {
  // Your logic here
});
```

### Custom Tools
Add utility methods in `claude-executor.ts`:
```typescript
async getCustomMetric(): Promise<string> {
  // Your implementation
}
```

### Webhooks
Switch from polling to webhooks for better performance:
```typescript
const bot = new TelegramBot(token, {
  webHook: { port: 8443 }
});
```

### Multiple Users
Extend `ALLOWED_USER_ID` to array:
```typescript
const allowedUserIds = [123456789, 987654321];
if (!allowedUserIds.includes(msg.from?.id)) { ... }
```

## Future Enhancements

1. **Web Dashboard**: Real-time monitoring UI
2. **Alert System**: Proactive notifications (GPU overheating, training stopped, etc.)
3. **Multi-VM Support**: Manage multiple training VMs from one bot
4. **Voice Commands**: Telegram voice message support
5. **Image Analysis**: Send screenshots of plots/graphs
6. **Scheduled Reports**: Daily training summaries
7. **Team Sharing**: Multi-user access with role-based permissions
8. **Integration Plugins**: TensorBoard, Weights & Biases, MLflow
