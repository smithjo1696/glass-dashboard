# Security and privacy

Keep HA authentication and service credentials in HA integrations. This dashboard does not need a long-lived API token or a service password. Background uploads use the signed-in HA session and its normal image library.

NWS lookup sends the selected coordinates to `api.weather.gov`. Uploads remain on the HA instance. Appearance and setup preferences stay in browser storage. Shareable exports omit known personal references; inspect every export before posting it. Personal exports are explicitly opt-in and may contain private hostnames, device names and image paths.

Do not report exposed credentials in a public issue. If you find a vulnerability, use a private maintainer contact when one is published, or GitHub private vulnerability reporting if enabled. No private reporting channel is configured in this local preview yet.

Recovery is available by adding `?disable_ios_shell` and reloading. Uninstalling this package does not remove uploaded images or HA integrations.
