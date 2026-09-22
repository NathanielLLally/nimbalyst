import fs from 'fs';
import path from 'path';

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const envContent = fs.readFileSync(filePath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#') && valueParts.length) {
      let value = valueParts.join('=').trim();
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key.trim()] = value;
    }
  });
}

// Load .env file (base configuration)
loadEnvFile(path.resolve(process.cwd(), '.env'));

// Load .env.tests file (test-specific overrides, takes precedence)
// Use this for integration testing with real SMTP servers or other external services.
//
// Set NO_INTEGRATION=1 to skip it and force the hermetic unit suite, e.g.
//   NO_INTEGRATION=1 npm test
// Without this escape hatch, merely having .env.tests on disk makes it
// impossible to run the mocked tests at all.
if (!process.env.NO_INTEGRATION) {
  loadEnvFile(path.resolve(process.cwd(), '.env.tests'));
}
