# Issue 1 — Clean dynamic stop suggestions

- Demo transport data is no longer created by `npm run seed`.
- Run `npm run clean-demo` once against an existing database to remove the original seeded HYD-VJA buses/route.
- User stop suggestions come only from stops belonging to active buses.
- Suggestions are sorted A–Z by stop name, then city, then route/stop order.
- Dashboard no longer contains fake recent journey data.

## One-time migration

From `backend/` with `.env` configured:

```bash
npm run clean-demo
```

Then restart:

```bash
npm start
```

No waiting period is required after an Admin saves a bus. The user dashboard reads the current database data.
