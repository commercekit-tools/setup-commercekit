# Third-party notices

The committed JavaScript bundle includes open-source dependencies from the npm
registry. The complete license text generated for the bundled production
dependencies is committed as `dist/licenses.txt`.

Direct runtime dependencies include:

| Dependency                                 | License | Project                                           |
| ------------------------------------------ | ------- | ------------------------------------------------- |
| `@actions/core`                            | MIT     | <https://github.com/actions/toolkit>              |
| `@actions/tool-cache`                      | MIT     | <https://github.com/actions/toolkit>              |
| `semver`                                   | ISC     | <https://github.com/npm/node-semver>              |
| `@commercekit-tools/notification-contract` | MIT     | <https://github.com/commercekit-tools/action-kit> |

These notices do not replace the license terms shipped in the generated bundle
or the dependencies' source distributions.

The reporting implementation consumes the exact published shared contract and
its runtime dependencies. The regenerated `dist/licenses.txt` accompanies the
standalone registry-backed bundle; runtime consumers install no packages.
