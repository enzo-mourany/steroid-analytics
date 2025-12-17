import { Config } from './types/config';

export const defaultConfig: Config = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  database: {
    path: './analytics.db'
  },
  validation: {
    maxEventSize: 100 * 1024, // 100KB
    maxCustomParams: 10,
    maxParamNameLength: 100,
    maxParamValueLength: 1000
  },
  throttling: {
    pageviewWindowSeconds: 60 // 1 minute
  },
  ignoreRules: {
    allowLocalhost: false,
    allowFileProtocol: false,
    allowIframes: false
  },
  botDetection: {
    enabled: true
  }
};

