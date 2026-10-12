// Set empty values in Node (PowerShell 5 removes empty environment variables).
process.env.DATABASE_URL = '';
process.env.NEXT_PUBLIC_ACCOUNTS_ENABLED = '0';
process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID = '';
process.env.NEXT_TELEMETRY_DISABLED = '1';
process.chdir('C:/Users/QuLeR/black-grimoire-web');
require('C:/Users/QuLeR/black-grimoire-web/node_modules/next/dist/bin/next');
