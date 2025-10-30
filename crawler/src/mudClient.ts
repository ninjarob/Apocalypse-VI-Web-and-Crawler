import { Telnet } from 'telnet-client';
import { EventEmitter } from 'events';
import logger from './logger';

export class MUDClient extends EventEmitter {
  private client: Telnet;
  private connected: boolean = false;
  private buffer: string = '';
  private host: string;
  private port: number;
  private username: string;
  private password: string;

  constructor(host: string, port: number, username: string, password: string) {
    super();
    this.host = host;
    this.port = port;
    this.username = username;
    this.password = password;
    this.client = new Telnet();
  }

  async connect(): Promise<void> {
    try {
      logger.info(`Connecting to ${this.host}:${this.port}...`);
      
      await this.client.connect({
        host: this.host,
        port: this.port,
        timeout: 10000,
        shellPrompt: '',
        negotiationMandatory: false,
      });

      this.connected = true;
      logger.info('Connected to MUD server');

      // Listen for data
      this.client.on('data', (data: Buffer) => {
        const text = data.toString('utf8');
        this.buffer += text;
        this.emit('data', text);
        // Log received data with visual separator
        const preview = text.length > 200 ? text.substring(0, 200) + '...' : text;
        logger.info(`📥 RECEIVED from telnet:\n${preview.replace(/\r/g, '\\r').replace(/\n/g, '\\n\n')}`);
      });

      this.client.on('close', () => {
        this.connected = false;
        logger.info('Connection closed');
        this.emit('close');
      });

      this.client.on('error', (error: Error) => {
        logger.error('Connection error:', error);
        this.emit('error', error);
      });

      // Wait for initial prompt and login
      await this.login();

    } catch (error) {
      logger.error('Failed to connect:', error);
      throw error;
    }
  }

  private async login(): Promise<void> {
    logger.info('Logging in...');
    
    // Wait for username prompt
    await this.waitFor(['name', 'login', 'character'], 5000);
    await this.send(this.username);
    
    // Wait for password prompt
    await this.waitFor(['password'], 5000);
    await this.send(this.password);
    
    // Wait a bit for server response
    await this.delay(2000);
    
    // Check if we got the "PRESS ENTER" prompt (happens after long logout)
    const lowerBuffer = this.buffer.toLowerCase();
    if (lowerBuffer.includes('press enter')) {
      logger.info('Detected PRESS ENTER prompt...');
      await this.send(''); // Send empty line (just Enter)
      await this.delay(1000);
      
      // Check for menu
      if (this.buffer.toLowerCase().includes('make your choice')) {
        logger.info('Detected game menu, selecting option 1...');
        await this.send('1');
        await this.delay(2000);
      }
    }
    
    logger.info('Login complete');
    this.emit('ready');
  }

  async send(command: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to MUD');
    }
    
    logger.info(`📤 SENDING to telnet: "${command}"`);
    this.buffer = ''; // Clear buffer before sending command
    await this.client.send(command + '\r\n');
  }

  async waitFor(patterns: string[], timeout: number = 5000): Promise<string> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkBuffer = () => {
        const lowerBuffer = this.buffer.toLowerCase();
        
        for (const pattern of patterns) {
          if (lowerBuffer.includes(pattern.toLowerCase())) {
            const result = this.buffer;
            return resolve(result);
          }
        }
        
        if (Date.now() - startTime > timeout) {
          return reject(new Error(`Timeout waiting for patterns: ${patterns.join(', ')}`));
        }
        
        setTimeout(checkBuffer, 100);
      };
      
      checkBuffer();
    });
  }

  async sendAndWait(command: string, delay: number = 1000): Promise<string> {
    this.buffer = '';
    await this.send(command);
    await this.delay(delay);
    return this.buffer;
  }

  getBuffer(): string {
    return this.buffer;
  }

  clearBuffer(): void {
    this.buffer = '';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      logger.info('Disconnecting...');
      await this.client.end();
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}
