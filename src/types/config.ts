export interface Config {
  port: number;
  database: {
    path: string;
  };
  validation: {
    maxEventSize: number; // bytes
    maxCustomParams: number;
    maxParamNameLength: number;
    maxParamValueLength: number;
  };
  throttling: {
    pageviewWindowSeconds: number;
  };
  ignoreRules: {
    allowLocalhost: boolean;
    allowFileProtocol: boolean;
    allowIframes: boolean;
  };
  botDetection: {
    enabled: boolean;
  };
}

