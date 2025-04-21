# home-base

home-base is a base set of TypeScript and Svelte and style files for use with the
blogging platform.

See <https://home.bearcove.eu>

## Internals

We use pnpm, not npm.

Everything is re-exported from `src/lib/index.ts`. Because we're exporting
Svelte components, we're using
[`svelte-package`](https://kit.svelte.dev/docs/packaging) to package everything.

We're using [Vitest](https://vitest.dev/) for testing components. We're using
the [`np`](https://github.com/sindresorhus/np) command line utility to release a
new version.

To release a new version, run:

```bash
# releases a patch version
pnpm dlx np patch
```

This will use `np` to bump the version number, create a git tag, and publish the
package to npm.
