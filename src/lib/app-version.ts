import pkg from '../../package.json';

/** App version string from package.json — used as `client.version` on outbound sync calls. */
export const APP_VERSION: string = pkg.version;
