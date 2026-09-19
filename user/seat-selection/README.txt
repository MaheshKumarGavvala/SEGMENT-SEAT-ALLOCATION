SMART SEGMENT — UPGRADED FULL-JOURNEY SEAT SELECTION

UI improvements:
- Cleaner premium booking layout with 5-step progress indicator.
- Better trip summary and live availability indicator.
- Responsive seat-map card with clearer hierarchy.
- Compact seat filters: All / Window / Aisle.
- Availability counters for available, occupied, and selected seats.
- Improved selected-seat preview with position/details.
- Dark/light theme retained with localStorage persistence.
- Mobile responsive layout.

Functionality:
- Select one available seat.
- Click the selected seat again to deselect.
- Selecting another available seat switches the selection.
- Escape clears the selection.
- Restores a previously selected seat from sessionStorage.
- Persists selected seat, fare, mode, and seat position.
- Continue button navigates to passenger details.
- Segment Seat Selection buttons preserve the existing flow.
- Existing embedded host-shell postMessage navigation is preserved.
- URL/sessionStorage bus and journey data are still supported.

V2 changes: redesigned as a true 2+2 bus seat layout with two adjacent seats on each side of a central aisle, premium coach shell, quick seat actions, improved seat states, and stronger responsive behavior.

V3: Exact 2+2 seating layout matching the reference image: columns 1-2 are adjacent, a clear central aisle separates them from columns 3-4. Removed Pick first available and Surprise me. Segment Seat Selection now has a strong blue CTA treatment.
