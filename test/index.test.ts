import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PasetoCLI } from '../src/cli.js';

// Create a mock for the CLI
const mockRun = vi.fn().mockResolvedValue(0);
const mockParseArguments = vi.fn();
const mockCli = {
  parseArguments: mockParseArguments,
  run: mockRun
};

// Mock the PasetoCLI class
vi.mock('../src/cli.js', () => {
  return {
    PasetoCLI: vi.fn(() => mockCli)
  };
});

// Mock process.exit
const mockExit = vi.spyOn(process, 'exit').mockImplementation((code) => {
  return undefined as never;
});

// Mock console.error
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

describe('CLI Entry Point', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });
  
  it('should create a CLI instance and run it', async () => {
    // Import the module which will execute the main function
    await import('../src/index.js');
    
    // Verify PasetoCLI was constructed
    expect(PasetoCLI).toHaveBeenCalledTimes(1);
    
    // Verify methods were called
    expect(mockParseArguments).toHaveBeenCalledTimes(1);
    expect(mockRun).toHaveBeenCalledTimes(1);
    
    // Verify process.exit was called with the correct code
    expect(mockExit).toHaveBeenCalledWith(0);
  });
}); 