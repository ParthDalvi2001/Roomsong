# ADR-001 — Immersive Web SDK (WebXR) over Unity

**Status:** Accepted · **Date:** 2026-10-09 · **Deciders:** human, software-architect

## Context
The contest allows Unity, Unreal, Android and IWSDK (WebXR). Our team is one human plus Claude agents working in parallel. Unity has the highest graphics ceiling but much of its workflow is Editor-GUI driven, which agents cannot automate well, and it needs APK builds and a release channel.

## Decision
Build with **IWSDK + Three.js + TypeScript**, deployed as a static WebXR site.

## Consequences
+ Agents can scaffold, code, unit-test, run the IWER emulator through Playwright MCP, and deploy without a human.
+ Judges open a URL; no APK/release channel friction.
+ Supports hands, passthrough, planes, meshes, hit-test, anchors in Quest Browser.
− Lower rendering ceiling and fill-rate sensitivity → strict perf budgets (HLD §7), no post-processing.
− Persistent anchors / mesh detection support must be verified early (T-003); fallbacks designed in.
− Store launch later uses the PWA path (`hz-store-pwa`).
