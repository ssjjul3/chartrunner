# M7 — RUN-tube · Streaming + display layer

**Status:** 🟡 PARTIAL (RUN-tube + Display already shipped early in v0.9.27)
**Theme:** Two-part. (a) RUN-tube — draggable PIP webcam + inline file viewer (already live, used for demo + pitch recording). (b) Full streaming connectors (YouTube / Twitch / Kick / X Live) ship at milestone proper.

## Completion condition (all required)

- [x] RUN-tube PIP webcam widget shipped (v0.9.27)
- [x] Docs PIP inline file viewer shipped (v0.9.27)
- [ ] YouTube Live connector (embed live stream as widget, OR push game frame to YouTube Live)
- [ ] Twitch connector (same pattern)
- [ ] Kick connector
- [ ] X Live connector
- [ ] Creator dashboard: select stream destination, manage stream key, in-game overlay tools (chat read, gift alerts)

## Imminent-solvables

### Ready bucket

> **All 3 Ready-bucket items done 2026-05-20** (auto-resolve sweep).

- [x] 2026-05-20 — `[D]` Streaming API comparison — `docs/architecture/M7-streaming-apis.md`. YouTube/Twitch/Kick/X compared; key insight: **embed** is browser-only/days of work, every **broadcast** target needs one shared RTMP relay. Recommended connector order included.
- [x] 2026-05-20 — `[D]` Creator economy research — `docs/architecture/M7-creator-economy.md`. Crypto-trader × streamer overlap (live memecoin traders on Twitch, Kick/Stake spectators); first wave = mid-size (~100–500 viewer) live traders.
- [x] 2026-05-20 — `[O]` RUN-tube audit — `docs/architecture/M7-runtube-audit.md`. The shipped rig is **local-only** (zero stream code). Cleanest hook for real stream embeds = the content-type switch in `_pitchOpenIdx` (L37500); the PIP `iframe` CSS already exists (L4609), so only the JS branch is missing.

### Blocked bucket

- [ ] `[D]` YouTube Live connector implementation — **BLOCKED:** API research + RUN-tube hook points done.
- [ ] `[D]` Twitch connector — **BLOCKED:** YouTube pattern proven.
- [ ] `[D]` Kick connector — **BLOCKED:** Twitch pattern proven.
- [ ] `[D]` X Live connector — **BLOCKED:** Kick pattern proven.
- [ ] `[D]` Creator dashboard UI — **BLOCKED:** at least 2 connectors live.

### Done bucket

- [x] 2026-05-XX — v0.9.27 RUN-tube draggable PIP webcam
- [x] 2026-05-XX — v0.9.27 Display inline file viewer

## State

- Progress: 5/9 done — RUN-tube + Display shipped (v0.9.27), and all 3 Ready-bucket research/audit items written 2026-05-20. Remaining 4 are the Blocked-bucket connectors (YouTube → Twitch → Kick → X) + the creator dashboard, all gated on the now-identified hook point.
- Blockers active: 5
- Scheduled today: 0

## Notes

- RUN-tube has been carrying its weight already (demo + pitch recording rig). M7 expands it from "creator's own webcam" to "creator's own live stream destination".
- M7 sets up M8 (token launch tournaments are inherently streaming events).
- Distribution flywheel: streamer launches token → audience trades against streamer in-game → streamer wins/loses on-chain → highlight reel auto-clipped → repeat.
