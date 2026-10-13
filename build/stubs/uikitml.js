// Stand-in for @drawcall/uikitml 0.1.8 (T-171). vite.config.ts aliases the package to this file, in the dev server
// and in the build. Why: the package has no licence (specs/06-release/THIRD_PARTY_LICENSES.md §0), so its code
// must not ship. @iwsdk/core 1.0.1 imports it statically whatever iwsdk.config.json says: ui/uikitml.js imports
// the three names below, and grab/grab-system.js, transform/transform.js and level/level-component-applier.js
// import it bare. Only IWSDK's UIKitML panels call them (world.features.spatialUI, a .uikitml asset or a PanelUI
// component); Roomsong uses none of those. If an IWSDK update imports another name, the build stops with
// '"<name>" is not exported by "build/stubs/uikitml.js"'.

function removed(name) {
  return () => {
    const error = new Error(
      `@drawcall/uikitml ${name}() is not in this build: the package has no licence, so vite.config.ts replaces ` +
        'it with build/stubs/uikitml.js (THIRD_PARTY_LICENSES.md §0). Roomsong draws no UIKitML panel.',
    );
    error.name = 'UIKitMLRemovedError';
    throw error;
  };
}

export const parse = removed('parse');
export const instantiate = removed('instantiate');
export const resolveKitComponentSets = removed('resolveKitComponentSets');
