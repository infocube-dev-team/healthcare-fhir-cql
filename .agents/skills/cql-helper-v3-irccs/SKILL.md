---
name: cql-helper-v3-irccs
description: Generates or debugs CQL (Clinical Quality Language / FHIR R4) using IRCCS conventions — Observation-based data modeling, string-based code matching, minimal headers. Validated and executed against the Alphora reference engine ($cql sandbox). User-invoked only — say "use cql-helper-v3-irccs" or type /cql-helper-v3-irccs.
disable-model-invocation: true
---

Use **scaffold** for new queries, **trace** for broken ones, **package** to wrap a finished query into a deployable FHIR Library. Syntax patterns, type mappings, and the Library resource shape live in [CQL_REFERENCE.md](CQL_REFERENCE.md).

This skill writes CQL following IRCCS conventions for any conformant FHIR R4 engine. Validation and execution have a single channel: the Alphora `$cql` sandbox, called over HTTPS with Node's native `fetch`. Its response carries both translation errors and per-define results, so one call serves as compiler and execution engine. If the sandbox is unreachable, stop and tell the user — there is no fallback.

## IRCCS conventions

These are the default patterns for all CQL produced by this skill. They differ from standard CQL practice — see [CQL_REFERENCE.md](CQL_REFERENCE.md) for the full reference.

- **No terminology declarations.** Skip `codesystem` and `valueset` declarations in the header. Match codes directly against `O.code.coding[0].code.value` using string equality.
- **Observation is the default resource.** Model clinical concepts as `Observation` resources carrying boolean values (`O.value = true`). Reserve `Condition`, `Encounter`, and other resources only when Observation is clearly insufficient.
- **Explicit `.value` access.** Always access FHIR primitives through `.value` — e.g., `O.issued.value`, `E.period.start.value`, `O.code.coding[0].code.value`. Do not rely on FHIRHelpers implicit conversions for comparisons, even though FHIRHelpers is always included.
- **No status filters.** Do not filter `Observation.status`, `Condition.clinicalStatus`, or `Encounter.status` unless the user explicitly asks for it. Assume the data source is pre-filtered.
- **Minimal header.** The header has exactly: `library` declaration with version, `using FHIR version '4.0.1'`, `include FHIRHelpers version '4.0.1' called FHIRHelpers`, `context Patient`. Nothing else.
- **Stub defines are acceptable.** A placeholder define returning a literal (e.g., `define attributeStats: false`) is fine when the user hasn't specified what to compute. Include one by default as a hook for future logic.
- **One file per CQL module.** When a study/cohort contains multiple distinct outcomes (e.g., general study eligibility, group assignments, subprogram enrollment), do not write them in a single monolithic file. Instead, create a separate self-contained CQL file for each outcome.
- **Include `IsEligible` entry point in EVERY CQL file.** Every single generated CQL file/library must define a primary entry point named `IsEligible` (PascalCase) representing that specific module's outcome (e.g., general study eligibility, group assignment, or program/therapy assignment). This allows the application to evaluate any module using the common entrypoint name `IsEligible`.



## Scaffold — generating a CQL query

**Step 1: Clarify clinical intent.**
Ask until you know: the target patient population, the clinical data to retrieve or compute, and the relevant time window. State the intent back in one sentence and get confirmation before writing anything.
_Done when_: you can state the intent in one sentence the user confirms.

**Step 2: Map to FHIR R4 resources.**
List every FHIR R4 resource the query will touch — default to `Observation` for each clinical concept unless another resource is clearly needed. Assign each concept a short string code (e.g., `'is_adult'`, `'has_advanced_hcc'`) that will be matched against `O.code.coding[0].code.value`. No terminology URLs or value set expansions — just the code string.
_Done when_: every clinical concept maps to a resource type and a code string.

**Step 3: Scaffold the library header.**
Write the header in exactly this order: `library` declaration with version, `using FHIR version '4.0.1'`, `include FHIRHelpers version '4.0.1' called FHIRHelpers`, `context Patient`. No `codesystem` or `valueset` declarations. The canonical template is in [CQL_REFERENCE.md](CQL_REFERENCE.md).
_Done when_: the header compiles without undefined references and includes FHIRHelpers.

**Step 4: Write define statements.**
Build bottom-up. Generate a separate, self-contained CQL file/library for each distinct outcome/decision module (e.g., general study eligibility, each group assignment, and each subprogram/therapy assignment).

For each file, start with a helper define that anchors the time window (e.g., the start of the last Encounter). Then write the define statements for the clinical concepts checked by that module using the pattern:

```
exists([Observation] O where O.code.coding[0].code.value = '<code>' and O.issued.value >= <anchor>.value and O.value = true)
```

For negative criteria (exclusions), wrap them in `not (...)`. For alternative criteria within exclusions, use `or` inside the `not`. Every concept from Step 2 must have a corresponding filter clause in its relevant module. Every single generated CQL library/file must include a primary entry point named `IsEligible` (PascalCase) representing the eligibility or status of that specific module. End with a stub define (e.g., `define attributeStats: false`) as a hook for future logic.

Align every comparison with the CQL↔FHIR type mapping table in [CQL_REFERENCE.md](CQL_REFERENCE.md). All date/time comparisons use explicit `.value` access on both sides.
_Done when_: all Step 2 concepts are mapped, each module has its own CQL file, and the output define `IsEligible` in each file returns a Boolean.


**Step 5: Build test patient bundles.**
Write fixture Bundles (type `collection`) — at minimum one patient that should satisfy the intent and one control patient that should fail it, so the run proves the logic discriminates rather than returning `true` for everyone. Each Observation in the fixture must carry the exact code string from Step 2 in `code.coding[0].code` and have `valueBoolean: true`. Give datetime fields full precision (e.g., `2025-12-30T20:00:00Z`), since date-only values can compare as null against DateTime intervals.
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
