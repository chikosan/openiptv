// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.openiptv.app",
  appName: "OpenIPTV",
  webDir: "public",
  server: {
    url: "http://192.168.10.124:3000/?tv=1",
    cleartext: true,
  },
  android: {
    backgroundColor: "#000000",
  },
};

export default config;
