# Current Stable Snapshot

- Date: 2026-04-22
- Branch: main
- Commit: 0c7a20d

This snapshot marks the current working platform state after restoring owner access and keeping the order/cart/search flow stable with immediate refreshes.

## What is considered stable here

- Order and cart flow with immediate row highlighting.
- Replacement via loupe with immediate best-price refresh.
- Order search screen behaving like the order flow.
- Owner panel recovery and owner-role protection.
- Immediate refresh helper for order/search/cart workspace updates.
- Delivery window in order creation and Excel export.
- Platform protection rules in `PLATFORM-PROTECTION.md`.

## Working rules

- Make only small, isolated changes from this snapshot.
- Do not let empty or partial state overwrite live business data.
- Keep auth, business state, and UI features separate.
- Verify owner access, order/cart, and search behavior after any change.
