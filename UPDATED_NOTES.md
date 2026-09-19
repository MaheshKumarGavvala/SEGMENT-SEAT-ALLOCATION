# Smart Segment Seat Allocation — Updated Build

This build fixes the main integration issues identified in the uploaded project.

## Key fixes
- Dashboard stop search now loads live stops from `/api/stops` instead of hardcoded stop names.
- Dashboard requires a valid login session and Sign out now clears the session and returns to login.
- Bus search no longer silently displays fake/demo buses when the backend fails; it shows an error and Retry action.
- Bus search displays the actual selected boarding and destination names.
- Segment fare calculation now uses the route's first and last stop orders, so routes starting at order 1 calculate correctly.
- Checkout validates travel date and passenger information on the server.
- Admin bus creation avoids changing a shared route when supplied stops differ from that route's existing stops.
- Admin bus editing clones a shared route before changing its stops, preventing one bus from unexpectedly changing another bus's route.
- Booking confirmation now displays every seat/segment allocation instead of only the first seat.
- The distributable build does not include the local `.env` file or `node_modules`.

## Run
1. Copy `backend/.env.example` to `backend/.env`.
2. Set your MySQL credentials and a strong `JWT_SECRET`.
3. Create/import the database using `backend/sql/schema.sql` and the project seed script if required.
4. Run `npm install` inside `backend`.
5. Start with `npm start` (or the command defined in `backend/package.json`).
6. Open `http://localhost:3000`.

Payment remains a simulated college-project checkout; it is not connected to a real payment gateway.

- Cancellation release: cancelling a confirmed booking changes its status to cancelled; live seat availability counts only confirmed booking segments, so the cancelled seat/segments are available to other users on the next availability check.
