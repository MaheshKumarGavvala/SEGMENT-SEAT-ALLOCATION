# Smart Segment Seat Allocation — Current Update

This version includes the agreed Issue #1 and Admin UI fixes.

## Stop search behavior
- Empty search field shows no suggestions.
- Non-empty search filters by stop name (substring match).
- Matching names are sorted A–Z, then city/route/stop order.
- Only stops belonging to active buses are returned.
- No demo transport data is created by the seed script.

## Admin bus management
- Add/Modify modal has an independently scrollable body.
- Save/Cancel actions remain reachable.
- Form text uses readable 14–16px sizes.
- Prevents accidental double submission.
- Existing route stops are updated by position when safe, preserving stop IDs/codes.
- Shared routes, routes with booking history, or changed stop counts are cloned before structural edits to protect existing bookings.

## Existing database
If an older database still contains the previous demo services, run once:

    npm run clean-demo

This removes only the known original demo services and keeps users/admin accounts.

## Start

    npm start

Then open http://localhost:3000
