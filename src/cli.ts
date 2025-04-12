import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import * as v4 from 'paseto-ts/v4';

// Output capture for testing
type OutputCapture = {
  stdout: string[];
  stderr: string[];
};

// CLI class for testability
export class PasetoCLI {
  private values: Record<string, any> = {};
  private outputCapture: OutputCapture | null = null;
  
  // For testing purposes
  enableTestMode(outputCapture: OutputCapture): void {
    this.outputCapture = outputCapture;
  }
  
  private log(...args: any[]): void {
    const message = args.join(' ');
    if (this.outputCapture) {
      this.outputCapture.stdout.push(message);
    } else {
      console.log(message);
    }
  }
  
  private error(...args: any[]): void {
    const message = args.join(' ');
    if (this.outputCapture) {
      this.outputCapture.stderr.push(message);
    } else {
      console.error(message);
    }
  }
  
  async parseArguments(args?: string[]): Promise<void> {
    const options = {
      options: {
        version: {
          type: 'string' as const,
          short: 'v',
          default: 'v4',
        },
        help: {
          type: 'boolean' as const,
          short: 'h',
          default: false,
        },
        command: {
          type: 'string' as const,
          short: 'c',
        },
        key: {
          type: 'string' as const,
          short: 'k',
        },
        payload: {
          type: 'string' as const,
          short: 'p',
        },
        file: {
          type: 'string' as const,
          short: 'f',
        },
        token: {
          type: 'string' as const,
          short: 't',
        },
        footer: {
          type: 'string' as const,
          short: 'F',
        },
        assertion: {
          type: 'string' as const,
          short: 'a',
        },
        generateKey: {
          type: 'string' as const,
          short: 'g',
        },
        json: {
          type: 'boolean' as const,
          short: 'j',
          default: false,
        },
      },
      allowPositionals: true,
    };
    
    // Handle both direct command line and programmatic calling
    const parsed = args 
      ? parseArgs({ ...options, args }) 
      : parseArgs(options);
      
    this.values = parsed.values;
  }
  
  async run(): Promise<number> {
    try {
      // Show help menu if help flag is present or no command is provided
      if (this.values.help) {
        if (this.values.command) {
          this.showCommandHelp(this.values.command);
          return 0;
        }
        this.showHelp();
        return 0;
      }
      
      if (!this.values.command && !this.values.generateKey) {
        this.showHelp();
        return 0;
      }
      
      // Check version
      if (this.values.version !== 'v4') {
        this.error(`Unsupported version: ${this.values.version}. Currently, only 'v4' is supported.`);
        return 1;
      }
      
      // Generate keys
      if (this.values.generateKey) {
        return this.generateKeys(this.values.generateKey);
      }
      
      // Handle other commands
      const command = this.values.command;
      switch (command) {
        case 'encrypt':
          await this.encrypt(this.values);
          break;
        case 'decrypt':
          await this.decrypt(this.values);
          break;
        case 'sign':
          await this.sign(this.values);
          break;
        case 'verify':
          await this.verify(this.values);
          break;
        default:
          this.error(`Unknown command: ${command}`);
          this.showHelp();
          return 1;
      }
      
      return 0;
    } catch (error) {
      if (this.values.json) {
        this.log(JSON.stringify({ error: (error as Error).message }));
      } else {
        this.error('Error:', (error as Error).message);
      }
      return 1;
    }
  }
  
  showHelp(): void {
    this.log(`
PASETO CLI (${process.env.npm_package_version || 'dev'})
      
Usage:
  paseto-cli -c <command> [options]
  paseto-cli -c <command> --help     Show help for a specific command
      
Commands:
  encrypt    Encrypt a payload with a local key
  decrypt    Decrypt a token with a local key
  sign       Sign a payload with a secret key
  verify     Verify a token with a public key
      
Options:
  -v, --version <version>    PASETO version (default: v4)
  -h, --help                 Show this help message
  -k, --key <key>            Key in PASERK format
  -p, --payload <payload>    JSON payload as string
  -f, --file <path>          Read payload or token from file
  -t, --token <token>        PASETO token string
  -F, --footer <footer>      Footer data
  -a, --assertion <data>     Additional assertion data
  -g, --generateKey <type>   Generate keys (local or public)
  -j, --json                 Output results in JSON format
      
Examples:
  paseto-cli -g local                     # Generate a local key
  paseto-cli -g public                    # Generate a key pair
  paseto-cli -c encrypt -k k4.local.xxx -p '{"data":"test"}'
  paseto-cli -c decrypt -k k4.local.xxx -t v4.local.xxx
  paseto-cli -c sign -k k4.secret.xxx -p '{"data":"test"}'
  paseto-cli -c verify -k k4.public.xxx -t v4.public.xxx
  `);
  }
  
  showCommandHelp(command: string): void {
    switch(command) {
      case 'encrypt':
        this.log(`
Command: encrypt
Description: Encrypt a payload with a local key to create a PASETO v4.local token

Usage: 
  paseto-cli -c encrypt -k <key> -p <payload> [options]

Required Arguments:
  -k, --key <key>            Local key in PASERK format (k4.local.*)
  -p, --payload <payload>    JSON payload to encrypt

Optional Arguments:
  -f, --file <path>          Read payload from file instead of command line
  -F, --footer <footer>      Add footer data to the token
  -a, --assertion <data>     Add additional assertion data (implicit assertions)
  -j, --json                 Output result in JSON format

Examples:
  paseto-cli -c encrypt -k k4.local.xxx -p '{"data":"test"}'
  paseto-cli -c encrypt -k k4.local.xxx -f payload.json -F '{"kid":"key1"}'
        `);
        break;
      case 'decrypt':
        this.log(`
Command: decrypt
Description: Decrypt a v4.local PASETO token using a local key

Usage:
  paseto-cli -c decrypt -k <key> -t <token> [options]

Required Arguments:
  -k, --key <key>            Local key in PASERK format (k4.local.*)
  -t, --token <token>        PASETO token to decrypt

Optional Arguments:
  -f, --file <path>          Read token from file instead of command line
  -a, --assertion <data>     Additional assertion data to verify (implicit assertions)
  -j, --json                 Output result in JSON format

Examples:
  paseto-cli -c decrypt -k k4.local.xxx -t v4.local.xxx
  paseto-cli -c decrypt -k k4.local.xxx -f token.txt -a '{"aud":"example"}'
        `);
        break;
      case 'sign':
        this.log(`
Command: sign
Description: Sign a payload with a secret key to create a PASETO v4.public token

Usage:
  paseto-cli -c sign -k <key> -p <payload> [options]

Required Arguments:
  -k, --key <key>            Secret key in PASERK format (k4.secret.*)
  -p, --payload <payload>    JSON payload to sign

Optional Arguments:
  -f, --file <path>          Read payload from file instead of command line
  -F, --footer <footer>      Add footer data to the token
  -a, --assertion <data>     Add additional assertion data (implicit assertions)
  -j, --json                 Output result in JSON format

Examples:
  paseto-cli -c sign -k k4.secret.xxx -p '{"data":"test"}'
  paseto-cli -c sign -k k4.secret.xxx -f payload.json -F '{"kid":"key1"}'
        `);
        break;
      case 'verify':
        this.log(`
Command: verify
Description: Verify a v4.public PASETO token using a public key

Usage:
  paseto-cli -c verify -k <key> -t <token> [options]

Required Arguments:
  -k, --key <key>            Public key in PASERK format (k4.public.*)
  -t, --token <token>        PASETO token to verify

Optional Arguments:
  -f, --file <path>          Read token from file instead of command line
  -a, --assertion <data>     Additional assertion data to verify (implicit assertions)
  -j, --json                 Output result in JSON format

Examples:
  paseto-cli -c verify -k k4.public.xxx -t v4.public.xxx
  paseto-cli -c verify -k k4.public.xxx -f token.txt -a '{"aud":"example"}'
        `);
        break;
      default:
        this.error(`Unknown command: ${command}`);
        this.showHelp();
    }
  }
  
  // Generate keys (local or public)
  generateKeys(type: string): number {
    if (type !== 'local' && type !== 'public') {
      this.error('Key type must be "local" or "public"');
      return 1;
    }
    
    try {
      if (type === 'local') {
        const result = v4.generateKeys('local');
        if (this.values.json) {
          this.log(JSON.stringify({ key: result }));
        } else {
          this.log(result);
        }
      } else {
        const result = v4.generateKeys('public');
        if (this.values.json) {
          this.log(JSON.stringify({ 
            secretKey: result.secretKey, 
            publicKey: result.publicKey 
          }));
        } else {
          this.log(result.secretKey);
          this.log(result.publicKey);
        }
      }
      return 0;
    } catch (error) {
      if (this.values.json) {
        this.log(JSON.stringify({ error: (error as Error).message }));
      } else {
        this.error('Error generating keys:', (error as Error).message);
      }
      return 1;
    }
  }
  
  // Encrypt a payload with a local key
  async encrypt(options: any): Promise<void> {
    const key = options.key;
    let payload = options.payload;
    
    if (!key) {
      throw new Error('Local key is required');
    }
    
    // Read payload from file if specified
    if (options.file) {
      payload = await readFile(options.file, 'utf-8');
    }
    
    if (!payload) {
      throw new Error('Payload is required');
    }
    
    // Parse payload as JSON if it's a string
    let parsedPayload;
    try {
      parsedPayload = JSON.parse(payload);
    } catch (e) {
      throw new Error('Invalid JSON payload');
    }
    
    const token = await v4.encrypt(key, parsedPayload, {
      footer: options.footer,
      assertion: options.assertion,
    });
    
    if (options.json) {
      this.log(JSON.stringify({ token }));
    } else {
      this.log(token);
    }
  }
  
  // Decrypt a token with a local key
  async decrypt(options: any): Promise<void> {
    const key = options.key;
    let token = options.token;
    
    if (!key) {
      throw new Error('Local key is required');
    }
    
    // Read token from file if specified
    if (options.file) {
      token = await readFile(options.file, 'utf-8');
    }
    
    if (!token) {
      throw new Error('Token is required');
    }
    
    const result = await v4.decrypt(key, token, {
      assertion: options.assertion,
    });
    
    if (options.json) {
      this.log(JSON.stringify(result));
    } else {
      this.log(JSON.stringify(result, null, 2));
    }
  }
  
  // Sign a payload with a secret key
  async sign(options: any): Promise<void> {
    const key = options.key;
    let payload = options.payload;
    
    if (!key) {
      throw new Error('Secret key is required');
    }
    
    // Read payload from file if specified
    if (options.file) {
      payload = await readFile(options.file, 'utf-8');
    }
    
    if (!payload) {
      throw new Error('Payload is required');
    }
    
    // Parse payload as JSON if it's a string
    let parsedPayload;
    try {
      parsedPayload = JSON.parse(payload);
    } catch (e) {
      throw new Error('Invalid JSON payload');
    }
    
    const token = await v4.sign(key, parsedPayload, {
      footer: options.footer,
      assertion: options.assertion,
    });
    
    if (options.json) {
      this.log(JSON.stringify({ token }));
    } else {
      this.log(token);
    }
  }
  
  // Verify a token with a public key
  async verify(options: any): Promise<void> {
    const key = options.key;
    let token = options.token;
    
    if (!key) {
      throw new Error('Public key is required');
    }
    
    // Read token from file if specified
    if (options.file) {
      token = await readFile(options.file, 'utf-8');
    }
    
    if (!token) {
      throw new Error('Token is required');
    }
    
    const result = await v4.verify(key, token, {
      assertion: options.assertion,
    });
    
    if (options.json) {
      this.log(JSON.stringify(result));
    } else {
      this.log(JSON.stringify(result, null, 2));
    }
  }
} 