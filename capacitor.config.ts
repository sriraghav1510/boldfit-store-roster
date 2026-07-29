import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.boldfit.roster",
  appName: "Boldfit Roster",
  webDir: "android-web",
  server: {
    androidScheme: "https",
  },
};

export default config;
