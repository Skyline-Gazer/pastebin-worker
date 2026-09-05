# Phase 6 — Single completion actions TODO

Status: CONTINUOUS-MODE STOP — implementation blocked pending owner-approved browser authorization / scope resolution

Active planning checklist for [Phase 6](phase6-spec.md). This is not implementation authorization. Do not create a public completion adapter, add a browser request, or alter lifecycle storage until the owner resolves SPEC §3.13 and §10.5 updates these artifacts.

## 0. Owner decision required

- [ ] Owner selects/approves the existing Add-on browser authentication boundary and server-side principal-to-scope authorization rule.
- [ ] Record credential verification, scope ownership rule, origin/CSRF policy where applicable, expiry/revocation, deployment configuration, sanitized errors, and required negative tests in the revised SPEC.
- [ ] Run SPEC change control and internal consistency review; refresh this PHASE/TODO before implementation.

## 1. Phase 6.1 preflight — blocked

- [ ] Start only from refreshed `downstream/main` after Phase 6.0 is resolved; create `feat/feishu-single-completion` (or equivalent).
- [ ] Confirm additive migration feasibility and upstream metadata shape for `e=max`; no reset, browser expiry arithmetic, or root/upstream changes.
- [ ] Record TDD RED evidence before behavior code.

## 2. Phase 6.1 TDD / implementation — blocked

- [ ] Add failing scoped authorization and adapter tests: no browser `scopeId`, unauthenticated/forbidden/cross-scope denial before upstream activity, and method/body/action/idempotency validation.
- [ ] Add failing service/store/client tests for permanent/timed/delete state, exact validated `expiresAt`, source precision, claims/replay/conflicts, and uncertain-result reconciliation.
- [ ] Implement only the approved authentication adapter and narrow completion path; preserve server-only credentials and public allowlisting.
- [ ] Add additive lifecycle persistence only if validated by the prior tests; preserve existing bindings and no full body copy.
- [ ] Record GREEN/REFACTOR/REGRESSION evidence and run focused/full Add-on Worker checks, type/lint/format/build, and required current-HEAD review gate.

## 3. Phase 6.2 UI — blocked on merged 6.1

- [ ] Branch from merged/refreshed 6.1; write failing chooser, cancel, destructive-confirmation, pending, result-only state movement, Archive, and no-secret tests.
- [ ] Implement compact accessible chooser and delete confirmation; keep other Markdown tasks inert content and no optimistic lifecycle update.
- [ ] Render permanent/timed Archive results from returned state, retaining exact `expiresAt`; do not add Phase 7 timer/restore or Phase 8 batch UI.
- [ ] Record TDD and regression evidence; complete current-HEAD checks/review gate before an authorized merge.

## Evidence

### TDD

Blocked: no RED/GREEN implementation evidence exists because continuous mode must STOP for the unresolved browser trust boundary. Planning-only review found no safe implementation increment before owner direction.

## Internal consistency review

This checklist is implementation-sized after unblocking, preserves required phase sequencing, and does not misrepresent Phase 4's callback authentication as browser authorization. It keeps the locked action/lifecycle/security rules and makes the owner decision a hard prerequisite.

Status: CONTINUOUS-MODE STOP — implementation blocked pending owner-approved browser authorization / scope resolution

Implementation has NOT started.
