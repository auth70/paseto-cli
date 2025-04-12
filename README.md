# PASETO CLI

A command-line interface for working with [PASETO (Platform-Agnostic Security Tokens)](https://github.com/paseto-standard/paseto-spec) using the [paseto-ts](https://github.com/auth70/paseto-ts) library.

## Features

- Generate PASETO v4 tokens (local and public)
- Encrypt and decrypt payloads
- Sign and verify tokens
- Support for footer data and implicit assertions
- JSON output mode for scripting
- Detailed command-specific help

## Installation

```bash
npm install -g paseto-cli
```

## Usage

### Generate Keys

```bash
# Generate a local key
paseto-cli -g local

# Generate a key pair
paseto-cli -g public

# Generate keys with JSON output
paseto-cli -g local -j
```

### Encrypt/Decrypt

```bash
# Encrypt a payload
paseto-cli -c encrypt -k k4.local.YOUR_KEY -p '{"data":"test"}'

# Encrypt with footer and assertion
paseto-cli -c encrypt -k k4.local.YOUR_KEY -p '{"data":"test"}' -F '{"kid":"key1"}' -a '{"aud":"example"}'

# Decrypt a token
paseto-cli -c decrypt -k k4.local.YOUR_KEY -t v4.local.ENCRYPTED_TOKEN
```

### Sign/Verify

```bash
# Sign a payload
paseto-cli -c sign -k k4.secret.YOUR_SECRET_KEY -p '{"data":"test"}'

# Verify a token
paseto-cli -c verify -k k4.public.YOUR_PUBLIC_KEY -t v4.public.SIGNED_TOKEN
```

### Reading from files

```bash
# Encrypt payload from file
paseto-cli -c encrypt -k k4.local.YOUR_KEY -f ./payload.json

# Decrypt token from file
paseto-cli -c decrypt -k k4.local.YOUR_KEY -f ./token.txt
```

### JSON Output

```bash
# Enable JSON output
paseto-cli -c decrypt -k k4.local.YOUR_KEY -t v4.local.TOKEN -j
```

### Working with Assertions

PASETO supports "implicit assertions" which are used to validate token claims without including them in the token payload. This is useful for validating properties like audience, issuer, or other contextual security information.

#### Basic Assertion Examples

```bash
# Encrypt with audience assertion
paseto-cli -c encrypt -k k4.local.YOUR_KEY -p '{"data":"test"}' -a '{"aud":"api.example.com"}'

# Decrypt with audience assertion (will validate the audience claim)
paseto-cli -c decrypt -k k4.local.YOUR_KEY -t v4.local.TOKEN -a '{"aud":"api.example.com"}'

# Sign with issuer and audience assertions
paseto-cli -c sign -k k4.secret.YOUR_KEY -p '{"data":"test"}' -a '{"iss":"auth.example.com","aud":"api.example.com"}'

# Verify with multiple assertions
paseto-cli -c verify -k k4.public.YOUR_KEY -t v4.public.TOKEN -a '{"iss":"auth.example.com","aud":"api.example.com"}'
```

#### Complex Assertions

You can use more complex assertions with nested objects:

```bash
# Encrypt with complex assertion structure
paseto-cli -c encrypt -k k4.local.YOUR_KEY -p '{"data":"test"}' -a '{
  "aud": "api.example.com",
  "iss": "auth.example.com",
  "sub": "user123",
  "context": {
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0",
    "permissions": ["read", "write"]
  }
}'
```

#### Combining Assertions and Footers

Assertions and footers can be used together:

```bash
# Encrypt with both footer and assertions
paseto-cli -c encrypt -k k4.local.YOUR_KEY -p '{"data":"test"}' \
  -F '{"kid":"key-2022-01"}' \
  -a '{"aud":"api.example.com"}'
```

#### Reading Assertions from File

For complex assertions, you might want to read them from a file:

```bash
# Store your assertions in a file
echo '{"aud":"api.example.com","iss":"auth.example.com"}' > assertions.json

# Use assertions from file (requires shell that supports command substitution)
paseto-cli -c verify -k k4.public.YOUR_KEY -t v4.public.TOKEN -a "$(cat assertions.json)"
```

## Help

```bash
# General help
paseto-cli --help

# Command-specific help
paseto-cli -c encrypt --help
paseto-cli -c decrypt --help
paseto-cli -c sign --help
paseto-cli -c verify --help
```

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/auth70/paseto-cli.git
cd paseto-cli

# Install dependencies
npm install

# Build the project
npm run build
```

### Testing

Tests are written with [Vitest](https://vitest.dev/). The test suite includes unit tests for the CLI functionality.

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Project Structure

- `src/index.ts` - CLI entry point
- `src/cli.ts` - CLI functionality implementation
- `test/` - Test files

## License

MIT 