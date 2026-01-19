import * as fs from 'fs/promises';
import * as path from 'path';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Session {
  userId: string;
  messages: Message[];
  createdAt: number;
  lastActivityAt: number;
}

/**
 * Manages conversation sessions for each user
 */
export class SessionManager {
  private sessionDir: string;
  private sessions: Map<string, Session>;
  private maxMessagesPerSession: number;

  constructor(sessionDir: string, maxMessagesPerSession: number = 50) {
    this.sessionDir = sessionDir;
    this.sessions = new Map();
    this.maxMessagesPerSession = maxMessagesPerSession;
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.sessionDir, { recursive: true });
    await this.loadSessions();
  }

  /**
   * Get or create a session for a user
   */
  async getSession(userId: string): Promise<Session> {
    let session = this.sessions.get(userId);

    if (!session) {
      session = {
        userId,
        messages: [],
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
      };
      this.sessions.set(userId, session);
      await this.saveSession(userId);
    }

    return session;
  }

  /**
   * Add a message to a user's session
   */
  async addMessage(
    userId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<void> {
    const session = await this.getSession(userId);

    session.messages.push({
      role,
      content,
      timestamp: Date.now(),
    });

    // Keep only the last N messages to prevent unlimited growth
    if (session.messages.length > this.maxMessagesPerSession) {
      session.messages = session.messages.slice(-this.maxMessagesPerSession);
    }

    session.lastActivityAt = Date.now();
    await this.saveSession(userId);
  }

  /**
   * Get conversation history for a user
   */
  async getHistory(userId: string, lastN?: number): Promise<Message[]> {
    const session = await this.getSession(userId);
    if (lastN) {
      return session.messages.slice(-lastN);
    }
    return session.messages;
  }

  /**
   * Clear a user's session
   */
  async clearSession(userId: string): Promise<void> {
    this.sessions.delete(userId);
    const sessionFile = path.join(this.sessionDir, `${userId}.json`);
    try {
      await fs.unlink(sessionFile);
    } catch {
      // File might not exist
    }
  }

  /**
   * Get formatted conversation context for Claude
   */
  async getConversationContext(userId: string, lastN: number = 10): Promise<string> {
    const history = await this.getHistory(userId, lastN);

    if (history.length === 0) {
      return '';
    }

    const context = history
      .map((msg) => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        return `${role}: ${msg.content}`;
      })
      .join('\n\n');

    return `Previous conversation:\n${context}\n\nCurrent query:`;
  }

  /**
   * Save a session to disk
   */
  private async saveSession(userId: string): Promise<void> {
    const session = this.sessions.get(userId);
    if (!session) return;

    const sessionFile = path.join(this.sessionDir, `${userId}.json`);
    await fs.writeFile(sessionFile, JSON.stringify(session, null, 2), 'utf-8');
  }

  /**
   * Load all sessions from disk
   */
  private async loadSessions(): Promise<void> {
    try {
      const files = await fs.readdir(this.sessionDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const sessionFile = path.join(this.sessionDir, file);
        const content = await fs.readFile(sessionFile, 'utf-8');
        const session: Session = JSON.parse(content);

        this.sessions.set(session.userId, session);
      }

      console.log(`📂 Loaded ${this.sessions.size} session(s)`);
    } catch (error) {
      // Directory might not exist yet
      console.log('📂 No existing sessions found');
    }
  }

  /**
   * Get session statistics
   */
  getStats(): { totalSessions: number; totalMessages: number } {
    let totalMessages = 0;
    for (const session of this.sessions.values()) {
      totalMessages += session.messages.length;
    }

    return {
      totalSessions: this.sessions.size,
      totalMessages,
    };
  }
}
