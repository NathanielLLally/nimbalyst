/**
 * Standalone one-shot runner for the Vapi contact processor.
 *
 * Invoked by the htpc-contacts.timer systemd unit. Runs exactly ONE
 * processing pass and exits, so there is no long-lived event loop that can
 * wedge the way the in-process /api/vapi-process path did (the web-server
 * hang that took the whole site down, 2026-06). systemd's TimeoutStartSec is
 * the outer backstop; this inner guard fails a stuck pass a little sooner and
 * with a clearer message.
 *
 * State lives entirely in Google Sheets, so each run is independent — nothing
 * is carried in memory between ticks.
 */
import { processContacts } from '../lib/vapi-contact-tracker';

const MAX_RUN_MS = Number(process.env.CONTACT_RUN_TIMEOUT_MS ?? 25_000);

async function main(): Promise<void> {
  let guardTimer: ReturnType<typeof setTimeout> | undefined;
  const guard = new Promise<never>((_, reject) => {
    guardTimer = setTimeout(
      () => reject(new Error(`contact pass exceeded ${MAX_RUN_MS}ms`)),
      MAX_RUN_MS,
    );
  });

  try {
    await Promise.race([processContacts(), guard]);
  } finally {
    if (guardTimer) clearTimeout(guardTimer);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error(
      '❌ contact-runner failed:',
      err instanceof Error ? err.message : err,
    );
    process.exit(1);
  });
