// Printed books ship to US addresses only, so visitors elsewhere are shown the PDF first.
// The time zone is a good, permission-free hint; when it's unknown we assume the US.

const US_TIME_ZONES = new Set([
  "America/New_York", "America/Detroit", "America/Chicago", "America/Denver", "America/Boise",
  "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "America/Juneau", "America/Sitka",
  "America/Metlakatla", "America/Yakutat", "America/Nome", "America/Adak", "America/Menominee",
  "Pacific/Honolulu", "America/Puerto_Rico", "Pacific/Guam", "America/St_Thomas",
  "US/Eastern", "US/Central", "US/Mountain", "US/Pacific", "US/Alaska", "US/Hawaii", "US/Arizona",
]);

export function likelyInUS(): boolean {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!zone) return true;
    return US_TIME_ZONES.has(zone) || /^America\/(Indiana|Kentucky|North_Dakota)\//.test(zone);
  } catch {
    return true;
  }
}
