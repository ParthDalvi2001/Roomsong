# Research brief (from Parth, 2026-10-10) — required structure of the final report

## Project context (confirmed facts; read-only source files)
- Project: **Roomsong** (formerly Bloomtone). Entry to the **Meta VR Start Developer Competition 2026** (Devpost: https://start-developer-competition-26.devpost.com). Entry period 2026-09-24 → 2026-11-18 12:00 PT. Track: Entertainment. Division: New Experience.
- Concept: hands-first mixed-reality music garden on the player's real table (ring-shaped bed 0.12–0.30 m, 5 pitch rings × 16 steps; plant seeds by pinch; a tide of light plays them; pull to grow, drag to move, drag-off to remove; Listen mode with dimming/halo/vines; local save; daily seed). Differentiator proposal: **room signature** (room geometry → key/mode/tempo/reverb; tuning ripple shows which surface made which note).
- Stack (established, treat as a constraint to assess): Immersive Web SDK (IWSDK) + Three.js + TypeScript + Web Audio, running in Meta Quest Browser (WebXR immersive-ar). Static hosting (to be chosen).
- Team: Parth (developer, macOS, Claude Code agents), Chinmay (PM, Devpost Representative, Windows). **No Quest headset on the team as of 2026-10-10.** India-based.
- Judging: 4 equal criteria (Innovation & Creativity, Experience Design, Technical Implementation, Polish & Presentation); hard requirement hands-first; guidelines seated / ≤10-min / original-not-wrapper; ≥60 fps on Quest; purposeful passthrough; FoV-aware. Special awards: Social & Multiplayer, Agentic Interaction, Reason to Come Back, First Five Minutes, Accessibility Forward, Boldest Original Concept, Judge's Choice.
- Authoritative project docs (read-only during research): `specs/08-status/REPLAN_2026-10-10.md`, `specs/00-hackathon/WINNING_STRATEGY.md`, `specs/00-hackathon/HACKATHON_RULES.md`, `specs/02-requirements/PRD.md`.
- Hard rule for this phase: **do not modify any project file**; research outputs go only under `specs/09-research/`.

## Required final-report structure (Deliverables 1–15, in this order)
1. Executive summary
2. Project understanding (confirmed requirements / assumptions / constraints / unanswered questions kept separate)
3. Research findings table: | Research area | Key finding | Evidence/source | Confidence | Impact on our project | Recommended action |
4. Previous-session winner directory (year-by-year, category-by-category, every verifiable winner/finalist with links): | Year/session | Competition/category | Winning team/project | Placement | Problem solved | Main solution | AR/VR glasses used? | Technology stack | Interaction method | Public evidence | Lessons for us |
5. Headset-free solution analysis: | Project | Evidence of success | Hardware required | Glasses/headset required? | Core interaction | Implementation approach | Strengths | Limitations | Applicability to our project | — separate genuine AR from 3D simulation / "immersive" marketing
6. Winner success-factor analysis: | Success factor | Supporting winner/example | Evidence | Why it mattered | Can we adopt it? | How we should adapt it | — use official rubrics; label hypotheses
7. Competitor matrix: | Competitor/reference | Target audience | Core functionality | Interaction model | Hardware requirements | Strengths | Weaknesses | Features worth learning from | Opportunity for differentiation |
8. Complete feature inventory with categories A Must / B Should / C Could / D Should-not / E Validate-before-building: | Feature | User problem addressed | Research evidence | Category | User value | Implementation complexity | Dependencies | Risk | Decision and rationale |
9. Recommended technical strategy incl. architecture comparison of ≥4 approaches (conventional web; mobile/camera; immersive; hybrid): | Approach | User benefit | Required hardware | Suggested technology | Feasibility | Risks | Estimated effort | Best use case | Recommendation | — distinguish confirmed compatibility from needs-PoC
10. User journey and architecture plan: | Step | User action | System response | Required UI/component | Data or API requirement | Error/edge cases | Success condition |
11. Prioritized product roadmap (phases: research/validation → PoC → core → experience/differentiation → testing/competition readiness → evaluation/future): | Phase | Deliverable | Tasks | Dependencies | Acceptance criteria | Estimated effort (ranges) | Risks | — plus a priority table with stated weights: | Feature/initiative | User impact | Differentiation | Feasibility | Effort | Risk | Priority | Reason |
12. Validation and testing plan: | Hypothesis | Validation method | Test participants/environment | Success threshold | Evidence to collect | Status |
13. Risk register: | Risk | Probability | Impact | Evidence or uncertainty | Mitigation | Validation experiment | Priority |
14. Master comparison tables (consolidated: winners, headset-free alternatives, competitors, feature decisions, technology options, success factors, risks, roadmap/priorities)
15. Final recommendation answering 10 questions (what to build; what to avoid; highest-value features; do we genuinely need AR/VR glasses; best alternative if not; lessons from winners; differentiation; validate-before-coding; minimum reliable demo; implementation order) + a single master decision table: | Decision area | Recommended decision | Evidence/reason | Priority | Action required | Expected outcome |
Plus a **source register**: | Source ID | Title | Organization/author | Publication date | Source type | URL | Claim supported | Reliability notes |

## Evidence rules (apply throughout)
Cite immediately after claims with direct links and dates; separate facts / inferences / hypotheses; never invent URLs, names, rankings, stats; mark inaccessible/dead sources (try archives); do not treat a repo's existence as proof the app works; do not claim comprehensive coverage if editions are inaccessible; treat promotional claims as claims. Tables extensively. Professional product-discovery tone, not a brainstorm.
