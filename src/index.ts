#!/usr/bin/env node

import { PasetoCLI } from './cli.js';

async function main() {
  const cli = new PasetoCLI();
  await cli.parseArguments();
  
  const exitCode = await cli.run();
  process.exit(exitCode);
}

main().catch((error) => {
  console.error('Unhandled error:', (error as Error).message);
  process.exit(1);
}); 