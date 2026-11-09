# Contributing

This is a manual-install preview. Keep changes scoped to this dashboard and preserve the native HA interface outside `/glass-dashboard`.

Run `python tests/validate.py` and `node tests/portable.cjs` before submitting changes. There are no runtime package-manager dependencies. Browser fixture testing is available with `python tests/serve.py`, then `/glass-dashboard/overview` on localhost port 8771. The fixture simulates HA card helpers; also test against a real HA frontend before declaring a release stable.

For layout reports, include HA version, browser/app version, device dimensions and orientation, reproduction steps and a redacted screenshot. Remove personal photos, addresses, tokens and private service URLs. Do not post personal configuration exports publicly.

Feature changes should preserve reviewed imports, backup recovery, optional modules and keyboard accessibility. Do not add code that reads account credentials, changes HA permissions or automatically creates integrations. New background assets must have documented redistribution rights.

Changes to storage or import schema need migration notes and tests. Release updates should bump the resource and imported module cache versions together. The project uses the MIT license in LICENSE; third-party assets retain their own licenses.
