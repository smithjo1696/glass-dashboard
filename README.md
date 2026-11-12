# Glass Dashboard

A customizable Home Assistant dashboard with compact navigation, translucent cards, local appearance controls and a guided setup. Preview release **0.1.6**. No third-party cards, HACS, kiosk-mode plugin or card-mod are required.

## Single-file installation

`dist/glass-dashboard.js` contains the complete frontend, including its MIT notice. Copy that one file to `/config/www/glass-dashboard.js`, then add `/local/glass-dashboard.js?v=0.1.6` as a JavaScript module resource. Follow dashboard configuration steps 4–6 below. The multi-file method below is also supported; choose one loader, not both.

### HACS compatibility preview

This repository layout includes `hacs.json` and `dist/glass-dashboard.js`, following the [official dashboard plugin structure](https://www.hacs.dev/docs/publish/plugin/). HACS installation and catalog review are pending.

For experimental HACS testing, add this repository as a custom **Dashboard** repository. HACS installs the JavaScript bundle; you still create the dashboard and paste `dashboard.yaml` into its raw editor. Check HA Resources for `/hacsfiles/glass-dashboard/glass-dashboard.js`; add that module only if it is missing. The configuration uses the fixed dashboard URL `glass-dashboard`. Updates to dashboard YAML still require review and manual merging.

Use the manual installation below for the verified setup path.

## Install

1. Back up your current dashboard and configuration. Keep your existing default dashboard during testing.
2. Copy the complete `www/glass-dashboard` directory into `/config/www/glass-dashboard`. Every JavaScript file in that directory is required.
3. In **Settings → Dashboards → Resources**, add `/local/glass-dashboard/glass-dashboard.js?v=0.1.6` as a **JavaScript module**. Enable Advanced mode in your HA profile if Resources is hidden. HA safe mode does not load custom resources.
4. Create a new dashboard titled **Glass Dashboard**, with URL **glass-dashboard**. Choose an empty dashboard, open its raw configuration editor, and replace its content with `dashboard.yaml`. The file is JSON, which is also valid YAML. Save, then reload the browser.
5. Open `/glass-dashboard/overview`. The initial demonstration needs no weather, camera, photo, media or server integrations.
6. Open **Settings → Setup**. Enable the modules you want and choose your own entities. Then save. Settings remains reachable even when every optional module is disabled.

This release uses the fixed URL `glass-dashboard`. Do not rename it without updating the module routes too. Do not install two copies with different URLs in one browser.

### YAML-managed installation

Merge the `lovelace.dashboards` entry from `configuration.example.yaml` into your existing configuration. Copy `dashboard.yaml` to `/config/glass-dashboard/dashboard.yaml`. Do not overwrite your existing `lovelace` or `frontend` sections. When resources are YAML-managed, merge this into the existing section:

```yaml
lovelace:
  resource_mode: yaml
  resources:
    - url: /local/glass-dashboard/glass-dashboard.js?v=0.1.6
      type: module
```

Preserve every existing resource and dashboard entry. YAML configuration changes may require an HA restart; the UI-managed installation does not. Follow your usual configuration check and restart procedure.

## Optional modules

| Module | Configuration | When omitted |
| --- | --- | --- |
| Weather | Select an existing `weather.*` entity | Weather section hidden |
| Nearby stations | NWS lookup from HA's home coordinates or manual coordinates | Existing forecast selection remains available |
| Cameras | Select `camera.*` entities | Camera section hidden |
| Media | Select `media_player.*` entities | Playback section hidden |
| Photos | Enter a photo service link | Photos page hidden |
| Services | Add labels, icons and HTTP(S) links | Empty links omitted |
| System | Select `sensor.*` entities | Missing sensor readings omitted |

Photos in this release are a service shortcut, not an embedded Immich carousel or access to a photo library. Camera cards use native snapshots/auto mode; opening a camera uses HA's normal controls and permissions. Authentication remains in HA integrations. No service passwords are entered in the dashboard.

## Appearance and backgrounds

Settings provides colors, opacity, fonts, crop/focal position, solid backgrounds and separate portrait/landscape uploads. Files upload to HA's native image library only when **Apply** is pressed. No artwork, quotations or fonts are downloaded by default. Use images you have permission to share.

The native dashboard background layer displays the selected image and crop on HA 2026.11 as well as older supported versions. The corresponding home deployment was owner-confirmed; generic-package native/physical-device revalidation remains pending.

The shell hides the native header/sidebar only within `/glass-dashboard`. Other dashboards and native administration pages keep their normal layout. Compact buttons and card spacing remain responsive; content scrolls below the fixed navigation. When opened from Glass Dashboard, the main native Settings page provides a back arrow to dashboard Settings. Native submenus retain their own back/search controls; the custom navigation is not overlaid there.

## Backup and sharing

**Backup & sharing** exports appearance, navigation and module preferences as a versioned JSON file. Imports always require review and entity mapping before Apply. `examples/shareable-preset.json` demonstrates mapping without identifying any real devices.

The default shareable export omits personal entity IDs, service names/URLs, custom navigation and custom image paths. A personal export is opt-in and can contain private device names, hostnames and image paths; inspect it before posting publicly. Images and integrations are not bundled. Nearby station selection is retained by local recovery backups, but is not in the exported file.

Settings live in this browser, under keys beginning `glass-`. They are separate from other dashboard preferences. Different users/devices can have different layouts. Clearing site data removes them. Applying an import, preset or reset keeps one previous local backup, recoverable through **Restore previous local backup**. Download a personal export for a durable backup.

## Updates, recovery and uninstall

Keep a copy of the current module directory and dashboard configuration before updating. Replace all package files together, update the resource cache version to the release version and reload. Avoid mixing versions; compatibility migrations are not yet guaranteed in this preview.

Recovery URL: `/glass-dashboard/overview?disable_ios_shell`. Reload to bypass this package's shell, then use HA's normal editor. The switch does not change or remove preferences. Native dashboards remain accessible at their usual URLs.

Rollback: restore the saved module directory, previous resource URL and previous dashboard configuration. For uninstall, switch your default dashboard back first, remove this dashboard and its one resource entry, then remove the installed bundle at `/config/www/glass-dashboard.js` or the installed module directory `/config/www/glass-dashboard/`. Clearing `glass-` browser storage is optional. Uploaded backgrounds stay in HA's image library; this package never deletes them.

## Release status and scope

See `VALIDATION.json` for the actual tested version, checks and limitations. This preview is an independent Home Assistant dashboard. Manual installation has been verified on a fresh HAOS VM. NWS station discovery currently covers the US; other countries can use any compatible weather integration already configured in HA. The example assumes this package's fixed routes, and optional service integrations must be installed independently.

No personal server monitoring templates, notification automations, private URLs, photo albums or account secrets are included.

## Development checks

No compilation is required. `python tests/validate.py` checks the package manifest, custom elements, syntax and private-reference exclusions. `node tests/portable.cjs` checks schema validation and shareable-export filtering. Browser and native HA smoke-test results are recorded separately; a static check alone is not a functional installation test.

References: [HA dashboard configuration](https://www.home-assistant.io/dashboards/dashboards/), [custom resources](https://contributors.home-assistant.io/frontend/custom-ui/resources/), [NWS integration](https://www.home-assistant.io/integrations/nws/).

## License

Glass Dashboard is available under the MIT license. See LICENSE. Personal background artwork is not part of the package.
