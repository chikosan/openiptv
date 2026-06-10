// BUILD_TARGET env var selects the build: "tv" (default) or "phone"
// Set automatically by build-apk.sh — do not hardcode.
import type { CapacitorConfig } from "@capacitor/cli";

const isTV = process.env.BUILD_TARGET !== "phone";

const config: CapacitorConfig = {
  appId: "com.openiptv.app",
  appName: isTV ? "OpenIPTV TV" : "OpenIPTV",
  webDir: "public",
  server: {
    url: isTV ? "http://192.168.10.124:3000/?tv=1" : "http://192.168.10.124:3000",
    cleartext: true,
  },
  android: {
    backgroundColor: "#000000",
  },
};

export default config;
