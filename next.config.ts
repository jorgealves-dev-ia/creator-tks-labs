import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The Next.js dev badge, off.
   *
   * It is a fixed circle in the bottom-left corner of the viewport — which is
   * exactly where the Arsenal rail's last item sits. On 11/08/2026 it cost a
   * bug report and an investigation: the badge was read as a character avatar
   * that had replaced the Input de Character Sheet icon, because it sits on top
   * of whichever rail item happens to be under it and the rail's spacing had
   * just changed.
   *
   * Development only — it never existed in production, which is the other half
   * of why it is worth removing: a mark that only appears in the environment
   * where the screen is validated is a mark that can only ever mislead the
   * validation.
   */
  devIndicators: false,
};

export default nextConfig;
