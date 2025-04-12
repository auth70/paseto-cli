import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PasetoCLI } from '../src/cli.js';
import * as v4 from 'paseto-ts/v4';
import { readFile } from 'node:fs/promises';

// Mock the paseto-ts library
vi.mock('paseto-ts/v4', () => {
  return {
    generateKeys: vi.fn((type: 'local' | 'public') => {
      if (type === 'local') {
        return 'k4.local.mock-local-key';
      } else {
        return {
          secretKey: 'k4.secret.mock-secret-key',
          publicKey: 'k4.public.mock-public-key'
        };
      }
    }),
    encrypt: vi.fn(async (key, payload, options) => {
      // Simulate an error for a specific assertion value
      if (options?.assertion === '{"error":"trigger-error"}') {
        throw new Error('Invalid assertion data');
      }
      return 'v4.local.mock-encrypted-token';
    }),
    decrypt: vi.fn(async (key, token, options) => {
      // Simulate an error for a specific assertion value
      if (options?.assertion === '{"error":"trigger-error"}') {
        throw new Error('Assertion verification failed');
      }
      return { data: 'test' };
    }),
    sign: vi.fn(async (key, payload, options) => 'v4.public.mock-signed-token'),
    verify: vi.fn(async (key, token, options) => {
      // Simulate an error for a specific assertion value
      if (options?.assertion === '{"error":"trigger-error"}') {
        throw new Error('Invalid assertion during verification');
      }
      return { data: 'test' };
    })
  };
});

// Mock file system
vi.mock('node:fs/promises', () => {
  return {
    readFile: vi.fn(() => '{"data":"test"}')
  };
});

describe('PasetoCLI', () => {
  let cli: PasetoCLI;
  let output: { stdout: string[], stderr: string[] };
  
  beforeEach(() => {
    // Create new CLI and output capture for each test
    cli = new PasetoCLI();
    output = { stdout: [], stderr: [] };
    cli.enableTestMode(output);
    
    // Reset mocks
    vi.clearAllMocks();
  });
  
  describe('Help', () => {
    it('should show general help when no command is provided', async () => {
      await cli.parseArguments([]);
      const exitCode = await cli.run();
      
      expect(exitCode).toBe(0);
      expect(output.stdout.length).toBeGreaterThan(0);
      expect(output.stdout[0]).toContain('PASETO CLI');
    });
    
    it('should show command help when command and help flag are provided', async () => {
      await cli.parseArguments(['-c', 'encrypt', '-h']);
      const exitCode = await cli.run();
      
      expect(exitCode).toBe(0);
      expect(output.stdout.length).toBeGreaterThan(0);
      expect(output.stdout[0]).toContain('Command: encrypt');
    });
  });
  
  describe('Generate Keys', () => {
    it('should generate a local key', async () => {
      await cli.parseArguments(['-g', 'local']);
      const exitCode = await cli.run();
      
      expect(exitCode).toBe(0);
      expect(v4.generateKeys).toHaveBeenCalledWith('local');
      expect(output.stdout[0]).toContain('k4.local');
    });
    
    it('should generate a key pair', async () => {
      await cli.parseArguments(['-g', 'public']);
      const exitCode = await cli.run();
      
      expect(exitCode).toBe(0);
      expect(v4.generateKeys).toHaveBeenCalledWith('public');
      expect(output.stdout[0]).toContain('k4.secret');
      expect(output.stdout[1]).toContain('k4.public');
    });
    
    it('should output JSON when JSON flag is provided', async () => {
      await cli.parseArguments(['-g', 'local', '-j']);
      const exitCode = await cli.run();
      
      expect(exitCode).toBe(0);
      expect(v4.generateKeys).toHaveBeenCalledWith('local');
      expect(output.stdout[0]).toBe('{"key":"k4.local.mock-local-key"}');
    });
  });
  
  describe('Encrypt', () => {
    it('should encrypt a payload', async () => {
      await cli.parseArguments([
        '-c', 'encrypt',
        '-k', 'k4.local.test-key',
        '-p', '{"data":"test"}'
      ]);
      
      const exitCode = await cli.run();
      
      expect(exitCode).toBe(0);
      expect(v4.encrypt).toHaveBeenCalled();
      expect(output.stdout[0]).toBe('v4.local.mock-encrypted-token');
    });
    
    it('should handle footer and assertion data', async () => {
      await cli.parseArguments([
        '-c', 'encrypt',
        '-k', 'k4.local.test-key',
        '-p', '{"data":"test"}',
        '-F', '{"kid":"key1"}',
        '-a', '{"aud":"example"}'
      ]);
      
      const exitCode = await cli.run();
      
      expect(exitCode).toBe(0);
      expect(v4.encrypt).toHaveBeenCalledWith(
        'k4.local.test-key',
        { data: 'test' },
        { footer: '{"kid":"key1"}', assertion: '{"aud":"example"}' }
      );
    });
  });
  
  describe('Decrypt', () => {
    it('should decrypt a token', async () => {
      await cli.parseArguments([
        '-c', 'decrypt',
        '-k', 'k4.local.test-key',
        '-t', 'v4.local.test-token'
      ]);
      
      const exitCode = await cli.run();
      
      expect(exitCode).toBe(0);
      expect(v4.decrypt).toHaveBeenCalled();
      const output_json = JSON.parse(output.stdout[0]);
      expect(output_json).toEqual({ data: 'test' });
    });
  });
  
  describe('Sign', () => {
    it('should sign a payload', async () => {
      await cli.parseArguments([
        '-c', 'sign',
        '-k', 'k4.secret.test-key',
        '-p', '{"data":"test"}'
      ]);
      
      const exitCode = await cli.run();
      
      expect(exitCode).toBe(0);
      expect(v4.sign).toHaveBeenCalled();
      expect(output.stdout[0]).toBe('v4.public.mock-signed-token');
    });
  });
  
  describe('Verify', () => {
    it('should verify a token', async () => {
      await cli.parseArguments([
        '-c', 'verify',
        '-k', 'k4.public.test-key',
        '-t', 'v4.public.test-token'
      ]);
      
      const exitCode = await cli.run();
      
      expect(exitCode).toBe(0);
      expect(v4.verify).toHaveBeenCalled();
      const output_json = JSON.parse(output.stdout[0]);
      expect(output_json).toEqual({ data: 'test' });
    });
  });
  
  describe('Error handling', () => {
    it('should handle missing key error', async () => {
      await cli.parseArguments([
        '-c', 'encrypt',
        '-p', '{"data":"test"}'
      ]);
      
      const exitCode = await cli.run();
      
      expect(exitCode).toBe(1);
      expect(output.stderr[0]).toContain('Local key is required');
    });
    
    it('should handle invalid JSON payload', async () => {
      await cli.parseArguments([
        '-c', 'encrypt',
        '-k', 'k4.local.test-key',
        '-p', 'not-valid-json'
      ]);
      
      const exitCode = await cli.run();
      
      expect(exitCode).toBe(1);
      expect(output.stderr[0]).toContain('Invalid JSON payload');
    });
    
    it('should format errors as JSON when JSON flag is provided', async () => {
      await cli.parseArguments([
        '-c', 'encrypt',
        '-k', 'k4.local.test-key',
        '-p', 'not-valid-json',
        '-j'
      ]);
      
      const exitCode = await cli.run();
      
      expect(exitCode).toBe(1);
      expect(output.stdout[0]).toBe('{"error":"Invalid JSON payload"}');
    });
  });
  
  describe('Assertions', () => {
    it('should pass assertion data correctly to encrypt function', async () => {
      await cli.parseArguments([
        '-c', 'encrypt',
        '-k', 'k4.local.test-key',
        '-p', '{"data":"test"}',
        '-a', '{"aud":"test-audience","iss":"test-issuer"}'
      ]);
      
      const exitCode = await cli.run();
      
      expect(exitCode).toBe(0);
      expect(v4.encrypt).toHaveBeenCalledWith(
        'k4.local.test-key',
        { data: 'test' },
        { assertion: '{"aud":"test-audience","iss":"test-issuer"}' }
      );
    });
    
    it('should pass assertion data correctly to decrypt function', async () => {
      await cli.parseArguments([
        '-c', 'decrypt',
        '-k', 'k4.local.test-key',
        '-t', 'v4.local.test-token',
        '-a', '{"aud":"test-audience","iss":"test-issuer"}'
      ]);
      
      const exitCode = await cli.run();
      
      expect(exitCode).toBe(0);
      expect(v4.decrypt).toHaveBeenCalledWith(
        'k4.local.test-key',
        'v4.local.test-token',
        { assertion: '{"aud":"test-audience","iss":"test-issuer"}' }
      );
    });
    
    it('should pass assertion data correctly to sign function', async () => {
      await cli.parseArguments([
        '-c', 'sign',
        '-k', 'k4.secret.test-key',
        '-p', '{"data":"test"}',
        '-a', '{"aud":"test-audience","iss":"test-issuer"}'
      ]);
      
      const exitCode = await cli.run();
      
      expect(exitCode).toBe(0);
      expect(v4.sign).toHaveBeenCalledWith(
        'k4.secret.test-key',
        { data: 'test' },
        { assertion: '{"aud":"test-audience","iss":"test-issuer"}' }
      );
    });
    
    it('should pass assertion data correctly to verify function', async () => {
      await cli.parseArguments([
        '-c', 'verify',
        '-k', 'k4.public.test-key',
        '-t', 'v4.public.test-token',
        '-a', '{"aud":"test-audience","iss":"test-issuer"}'
      ]);
      
      const exitCode = await cli.run();
      
      expect(exitCode).toBe(0);
      expect(v4.verify).toHaveBeenCalledWith(
        'k4.public.test-key',
        'v4.public.test-token',
        { assertion: '{"aud":"test-audience","iss":"test-issuer"}' }
      );
    });
    
    it('should handle assertion data with both footer and assertions', async () => {
      await cli.parseArguments([
        '-c', 'encrypt',
        '-k', 'k4.local.test-key',
        '-p', '{"data":"test"}',
        '-F', '{"kid":"key-id-1"}',
        '-a', '{"aud":"test-audience","iss":"test-issuer"}'
      ]);
      
      const exitCode = await cli.run();
      
      expect(exitCode).toBe(0);
      expect(v4.encrypt).toHaveBeenCalledWith(
        'k4.local.test-key',
        { data: 'test' },
        { 
          footer: '{"kid":"key-id-1"}',
          assertion: '{"aud":"test-audience","iss":"test-issuer"}' 
        }
      );
    });
    
    it('should handle assertion errors during encryption', async () => {
      await cli.parseArguments([
        '-c', 'encrypt',
        '-k', 'k4.local.test-key',
        '-p', '{"data":"test"}',
        '-a', '{"error":"trigger-error"}'
      ]);
      
      const exitCode = await cli.run();
      
      expect(exitCode).toBe(1);
      expect(v4.encrypt).toHaveBeenCalledWith(
        'k4.local.test-key',
        { data: 'test' },
        { assertion: '{"error":"trigger-error"}' }
      );
      expect(output.stderr[0]).toContain('Error: Invalid assertion data');
    });
    
    it('should handle assertion errors during verification', async () => {
      await cli.parseArguments([
        '-c', 'verify',
        '-k', 'k4.public.test-key',
        '-t', 'v4.public.test-token',
        '-a', '{"error":"trigger-error"}'
      ]);
      
      const exitCode = await cli.run();
      
      expect(exitCode).toBe(1);
      expect(v4.verify).toHaveBeenCalledWith(
        'k4.public.test-key',
        'v4.public.test-token',
        { assertion: '{"error":"trigger-error"}' }
      );
      expect(output.stderr[0]).toContain('Error: Invalid assertion during verification');
    });
    
    it('should output JSON error with assertion failures when JSON mode is enabled', async () => {
      await cli.parseArguments([
        '-c', 'decrypt',
        '-k', 'k4.local.test-key',
        '-t', 'v4.local.test-token',
        '-a', '{"error":"trigger-error"}',
        '-j'
      ]);
      
      const exitCode = await cli.run();
      
      expect(exitCode).toBe(1);
      expect(v4.decrypt).toHaveBeenCalledWith(
        'k4.local.test-key',
        'v4.local.test-token',
        { assertion: '{"error":"trigger-error"}' }
      );
      
      const errorJson = JSON.parse(output.stdout[0]);
      expect(errorJson).toHaveProperty('error');
      expect(errorJson.error).toContain('Assertion verification failed');
    });
    
    it('should preserve assertion structure during processing', async () => {
      // Test with a more complex assertion structure
      const complexAssertion = JSON.stringify({
        aud: 'audience-value',
        iss: 'issuer-value',
        sub: 'subject-value',
        nested: {
          field1: 'value1',
          field2: 'value2',
          array: [1, 2, 3]
        }
      });
      
      await cli.parseArguments([
        '-c', 'encrypt',
        '-k', 'k4.local.test-key',
        '-p', '{"data":"test"}',
        '-a', complexAssertion
      ]);
      
      const exitCode = await cli.run();
      
      expect(exitCode).toBe(0);
      expect(v4.encrypt).toHaveBeenCalledWith(
        'k4.local.test-key',
        { data: 'test' },
        { assertion: complexAssertion }
      );
    });
    
    it('should work with file-sourced token and assertions together', async () => {
      // Mock the readFile to return a token
      const readFileMock = vi.mocked(readFile);
      readFileMock.mockResolvedValueOnce('v4.local.file-sourced-token');
      
      await cli.parseArguments([
        '-c', 'decrypt',
        '-k', 'k4.local.test-key',
        '-f', 'token.txt',
        '-a', '{"aud":"test-audience"}'
      ]);
      
      const exitCode = await cli.run();
      
      expect(exitCode).toBe(0);
      expect(readFile).toHaveBeenCalledWith('token.txt', 'utf-8');
      expect(v4.decrypt).toHaveBeenCalledWith(
        'k4.local.test-key',
        'v4.local.file-sourced-token',
        { assertion: '{"aud":"test-audience"}' }
      );
    });
    
    it('should use file content over token parameter when both are specified', async () => {
      // Mock the readFile to return a token, which will override the CLI parameter
      const readFileMock = vi.mocked(readFile);
      readFileMock.mockResolvedValueOnce('v4.local.file-sourced-token');
      
      await cli.parseArguments([
        '-c', 'decrypt',
        '-k', 'k4.local.test-key',
        '-t', 'v4.local.cli-token',
        '-f', 'token.txt', // This overrides the -t parameter
        '-a', '{"aud":"test-audience"}'
      ]);
      
      const exitCode = await cli.run();
      
      expect(exitCode).toBe(0);
      expect(readFile).toHaveBeenCalledWith('token.txt', 'utf-8');
      expect(v4.decrypt).toHaveBeenCalledWith(
        'k4.local.test-key',
        'v4.local.file-sourced-token', // File content is used, not the CLI parameter
        { assertion: '{"aud":"test-audience"}' }
      );
    });
  });
}); 