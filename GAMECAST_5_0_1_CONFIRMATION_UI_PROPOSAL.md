# Proposed GameCast 5.0.1 confirmation UI change

Status: APPROVED by Gary in the conversation on 2026-10-14; implemented in fdea1b8e7074bdf219bb92036d599f65bbb021cd.
Reason for approval: GAMECAST_PROJECT_INSTRUCTIONS.md requires asking before an ambiguous design choice materially changes UI behavior. The owner subsequently explicitly approved this concrete replacement interface.

## Concrete change
Replace native browser confirm popups with an accessible in-page modal for these six action families only:
1. Call Final.
2. Unlock.
3. Accept (QA acceptance must continue to be rejected by the server).
4. Arm/Rearm Deadman for one game.
5. Arm/Rearm Deadman for selected games.
6. Disarm Deadman.

Each modal displays the existing warning plus the targeted game(s), with Cancel and a clearly named confirmation action. Cancel is initially focused; Escape cancels; focus returns to the originating control. Only one modal is open at a time. Repeated confirmation cannot send duplicate commands.

Capture the intended target and action when opening. If the targeted game changes before confirmation, require a fresh confirmation; preserve server game witnesses, expected versions, idempotency, and existing request limits. Background render must not dismiss or accidentally approve the modal.

Maintain existing authentication, credential handling, backend confirmation flags and authorization checks. This change does not alter browser security. All other native prompts/confirmations and football/rating/weather behavior retain their existing implementation.

## Required engineering acceptance after approval
- Confirm and Cancel paths for all six action families.
- Escape, initial focus, focus return, keyboard use, stale-target and double-click protection.
- Real hosted Final/Lock/Unlock and server rejection of QA Accept.
- Complete hosted Deadman arm/trigger/launch-once/feedback and safe teardown.
- Remaining hosted performance measurements.
- Regression CI and exact deployed-source verification.

These tests belong to engineering. Gary provides approval of the proposed interaction change and final product acceptance, not technical test execution.
