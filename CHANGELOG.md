# Changelog

## 0.1.6 - preview

- Render selected images on Home Assistant's native view background layer, so an opaque native background cannot hide them after frontend updates.
- Add a main native Settings back arrow after entering from Glass Dashboard; retain unobstructed native submenu controls.
- Preserve portrait/landscape selection, focal position, fit, dimming and solid-color preferences.
- Keep background changes scoped to this dashboard and restore the native styles when leaving it.
- The corresponding production fix was owner-confirmed on HA Core 2026.11.1; this generic package has automated regression coverage, not a fresh physical-device validation.

## 0.1.5 - preview

- Wait for native lazy card registration and configuration before assigning Home Assistant data or attaching the card.
- Cancel pending card attachment when the section disconnects or its configuration changes.
- Reproduced media progress errors on 0.1.4; verified fresh native load and navigation without those errors after the fix.
- Added delayed-loading and disconnected-section regressions.


## 0.1.4 - preview

- Tested on a fresh HAOS 18.4 / HA 2026.10.4 VM using synthetic data.
- Fixed background preview logic being overwritten by the native card preview boolean.
- Made the native view background transparent while this dashboard is active, including the default HA theme.
- Added the native preview contract regression test.
- Native media progress console errors during rebuild remain under investigation; see VALIDATION.json.

## 0.1.2 — preview

- Added a deterministic standalone JavaScript bundle and HACS metadata.
- Documented single-file manual installation and the future HACS custom-repository workflow.
- Added source/bundle parity and no-sibling-import checks to local validation and CI.
- Browser-fixture tested the bundle's background saving, reset and optional module pages.

## 0.1.1 — preview

- Added the MIT license to the local release draft, contribution/privacy guidance and a validation workflow with pinned GitHub Actions.
- Fixed import validation for the maximum 73 mappings: one weather entity and up to 24 cameras, players and system sensors each.
- Added release packaging that excludes Git metadata and test runtime data.

## 0.1.0 — preview

- Neutral module names, storage keys, routes and solid background defaults.
- Optional weather, camera, media, photo-service, service-link and system-sensor modules.
- Appearance, backgrounds, navigation, setup, nearby station discovery and portable preference controls.
- Native administration and other dashboards retain their original shell.
- Manual UI/YAML installation, recovery and rollback instructions; generic mapping example.

This package contains no personal artwork or integration configuration. Test status is recorded in VALIDATION.json.
