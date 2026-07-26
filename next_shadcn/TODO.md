# TODO

- [ ] **Verify timezone math in `calculateScheduleWindow`** (`lib/vapi-contact-tracker.ts`).
  `setHours(...)` is applied to the result of `toZonedTime(now, timezone)`, which sets
  the wall-clock hour in the zoned *representation*, but `.toISOString()` / `.getTime()`
  read the underlying instant. The intended 10am–4pm call window may be offset from the
  lead's actual local time. Not related to the earlier dispatch bugs — needs a dedicated
  check that scheduled `earliestAt`/`latestAt` land at the correct local hour.
