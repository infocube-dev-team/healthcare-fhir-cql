---
name: cql-helper-v1
description: Generates or debugs spec-correct CQL (Clinical Quality Language / FHIR R4) per the HL7 Clinical Reasoning architecture — FHIRHelpers-based, validated through a compile-to-ELM loop and cross-checked against the Alphora reference engine, optionally packaged as a FHIR Library resource. User-invoked only — say "use cql-helper-v1" or type /cql-helper-v1.
disable-model-invocation: true
---

Use **scaffold** for new queries, **trace** for broken ones, **package** to wrap a finished query into a deployable FHIR Library. Syntax patterns, type mappings, terminology bindings, and the Library resource shape live in [CQL_REFERENCE.md](CQL_REFERENCE.md).

This skill writes standard, spec-correct CQL for any conformant FHIR R4 engine. Validation and execution have a single channel: the Alphora `$cql` sandbox, called over HTTPS with Node's native `fetch`. Its response carries both translation errors and per-define results, so one call serves as compiler and execution engine. If the sandbox is unreachable, stop and tell the user — there is no fallback.

## Scaffold — generating a CQL query

**Step 1: Clarify clinical intent — and confirm CQL is the right tool.**
Ask until you know: the target patient population, the clinical data to retrieve or compute, and the relevant time window. If the criterion is simple demographics (gender, an age range), say so — that belongs in a `Group.characteristic` on the cohort definition, not in CQL. Reserve CQL for temporal or logical complexity (e.g., "three adverse events within a six-month rolling window").
_Done when_: you can state the intent in one sentence the user confirms, and CQL is confirmed as the right representation.

**Step 2: Map to FHIR R4 resources and terminology.**
List every FHIR R4 resource the query will touch. Bind every clinical concept to a standard terminology — SNOMED CT for conditions/findings, LOINC for labs and observations, RxNorm for medications, ICD-10 for diagnoses — via `codesystem` and `valueset` declarations, never arbitrary strings. Flag missing codes or value set URLs as blockers before writing.
_Done when_: every clinical concept in the intent maps to a named resource and a terminology-bound value set or code.

**Step 3: Scaffold the library.**
Write the header in this order: `library` declaration with version, `using FHIR version '4.0.1'`, `include FHIRHelpers version '4.0.1' called FHIRHelpers` (it provides the implicit conversions between FHIR types and CQL system types that the retrieval patterns rely on), `codesystem` and `valueset` declarations, `context Patient`. The canonical template is in [CQL_REFERENCE.md](CQL_REFERENCE.md).
_Done when_: the header has no undefined references and includes FHIRHelpers.

**Step 4: Write define statements.**
Build bottom-up — value set retrieves first, population filters next, the output define last. Name each define for what it represents. Align every comparison with the CQL↔FHIR type mapping table in [CQL_REFERENCE.md](CQL_REFERENCE.md) (e.g., `Interval<System.DateTime>` for a `FHIR.Period`). Every concept from Step 1 must have a corresponding define, and the output define must return the intended type (Boolean, `List<Resource>`, Integer, Decimal).
_Done when_: all Step 1 concepts are covered and each define's return type matches its intended use.

**Step 5: Build test patient bundles.**
Write fixture Bundles (type `collection`) in the scratchpad — at minimum one patient that should satisfy the intent and, when the output define is Boolean, one control patient that should fail it, so the run proves the logic discriminates rather than returning `true` for everyone. Resources, codes, and units in the fixtures must match the Step 2 mappings exactly; give datetime fields full precision (e.g., `2025-12-30T20:00:00Z`), since date-only values can compare as null against DateTime intervals.
_Done when_: each fixture has an expected value for every define, stated before running.

**Step 6: Validate and execute against the Alphora reference engine.**
POST the raw CQL and each test bundle to the Alphora `$cql` sandbox (request shape, Node-fetch transport, and the shell/caching pitfalls are in [CQL_REFERENCE.md](CQL_REFERENCE.md)). Translation errors come back in the response: treat each as a corrective prompt — read the message, fix the define, **bump the library version string**, and re-POST until clean. Watch specifically for hallucinated function names — they surface as `Could not resolve call to operator <name> with signature (...)`; see the common-errors table. Once clean, compare every define's returned value against the expected values from Step 5 for both fixtures.
_Done when_: the response reports zero errors and every define's value matches its expected value for every fixture.

**Step 7: Present and explain.**
Output the complete library. Follow with a plain-English breakdown of each non-trivial define — one line per define, written for a clinician who does not know CQL, citing its verified value from Step 6 where useful. The clinician reviews and approves before the artifact goes anywhere.
_Done when_: user confirms the query matches their intent.

## Package — wrapping into a FHIR Library resource

Only when the user needs a deployable artifact (for a PlanDefinition, cohort definition, or FHIR server). Build a `Library` resource of type `logic-library` carrying both payloads base64-encoded in `content`: the raw CQL as `text/cql` and the compiled ELM as `application/elm+json` — human-readable for clinical review, instantly executable by the engine. If the logic drives a workflow, point `PlanDefinition.action.condition` at a named Boolean define in this Library. Exact resource shape in [CQL_REFERENCE.md](CQL_REFERENCE.md).
_Done when_: the Library validates as FHIR R4 and both content entries decode back to the reviewed CQL and its ELM.

## Trace — debugging a broken CQL query

**Step 1: Classify the error.**
Determine whether the failure is:
- **Syntax** — translation rejected the query (unexpected token, missing keyword)
- **Semantic** — accepted but types mismatch, a symbol is undefined, or a function signature is wrong
- **Logic** — compiles and runs but returns wrong results

Ask for the error output or unexpected result if not provided.
_Done when_: the error class is known.

**Step 2: Trace to the failing define.**
For syntax/semantic: locate the specific define and line from the error entry in the Alphora response. For logic: identify which define returns the wrong value and what it actually returns — run intermediate defines through the sandbox if needed.
_Done when_: the broken define is named.

**Step 3: Fix and re-validate.**
Correct the define, then re-run the Alphora `$cql` call (Scaffold Step 6) on the revised library with the test bundle — **bumping the library version string on every re-POST**, or the sandbox silently serves the cached previous copy. Iterate until the response is error-free and the results match intent. State in one sentence what was wrong and why the fix is correct. If the fix changes semantics (not just syntax), confirm with the user before presenting the revised query. Consult the common-errors table in [CQL_REFERENCE.md](CQL_REFERENCE.md) if the pattern is familiar.
_Done when_: the response reports zero errors and the executed result matches the stated clinical intent.
