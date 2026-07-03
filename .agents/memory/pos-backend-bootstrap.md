---
name: POS backend missing bootstrap files
description: The Sri Murugan Store POS Node backend had no entrypoint/config files at all; how they were reconstructed.
---

The Node/Express backend at `Point-Of-Sale-System/backend` had every controller and route file, but was missing:
- `src/index.ts` (app bootstrap, no listen call anywhere)
- `src/config/env.ts` and `src/config/db.ts` (referenced everywhere via `../config/db.js` / `../config/env.js` but did not exist)
- `src/controllers/cashout.controller.ts` (route file imported functions that had no implementation)

**Why:** Likely dropped during an earlier export/copy step. Without these, `tsc` fails and there's no way to start the server — this isn't a config issue, the code was incomplete.

**How to apply:** When a Node backend has routes/controllers but `tsc --noEmit` or `npm run build` fails on missing `config/*` or a specific `*.controller.ts`, don't assume misconfiguration — check whether the file simply doesn't exist and needs to be authored from the surrounding conventions (pool usage patterns in sibling controllers, env var names in `.env`, migration schema for table/column names). Also remember `tsc` won't copy non-`.ts` assets (like `src/db/migrations/*.sql`) into `dist/` — add an explicit copy step to the build script if migrations are run from compiled output.
