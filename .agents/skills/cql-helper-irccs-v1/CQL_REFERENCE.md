# CQL Reference — FHIR R4, IRCCS conventions

These patterns assume FHIRHelpers is included. FHIRHelpers supplies implicit
conversions between FHIR types and CQL system types, but per IRCCS conventions we
always use explicit `.value` access on FHIR primitives.

## Library boilerplate

Minimal header — no `codesystem` or `valueset` declarations:

```cql
library MyTrialLogic version '1.0.0'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers

context Patient
```

## CQL ↔ FHIR type mappings

Align every comparison with these mappings; always access the CQL system type
through `.value`.

| CQL system type | FHIR type | Access pattern |
|---|---|---|
| `System.Boolean` | `FHIR.boolean` | `O.value = true` |
| `System.String` | `FHIR.string` | `O.code.coding[0].code.value` |
| `System.DateTime` | `FHIR.dateTime` | `O.issued.value`, `E.period.start.value` |
| `Interval<System.DateTime>` | `FHIR.Period` | `E.period` (comparison via `.start.value` / `.end.value`) |

## Code matching pattern

Match clinical concepts against `Observation.code.coding[0].code.value` using
string equality. This is the IRCCS default — no terminology declarations needed:

```cql
define "Adult Check":
  exists([Observation] O
    where O.code.coding[0].code.value = 'is_adult'
      and O.issued.value >= startEncounter.value
      and O.value = true
  )
```

For multiple criteria combined with AND/OR:

```cql
define IsEligible:
  (
    exists([Observation] O where O.code.coding[0].code.value = 'criterion_a' and O.issued.value >= startEncounter.value and O.value = true)
    and exists([Observation] O where O.code.coding[0].code.value = 'criterion_b' and O.issued.value >= startEncounter.value and O.value = true)
  )
  and not (
    exists([Observation] O where O.code.coding[0].code.value = 'exclusion_x' and O.issued.value >= startEncounter.value and O.value = true)
    or exists([Observation] O where O.code.coding[0].code.value = 'exclusion_y' and O.issued.value >= startEncounter.value and O.value = true)
  )
```

## Time anchor pattern

Anchor time-based criteria to the start of the most recent Encounter:

```cql
define startEncounter: Last([Encounter] E sort by period.start.value).period.start
```

Then reference it with `.value` in comparisons: `O.issued.value >= startEncounter.value`.

> **Sort-key pitfall:** do not `sort by period.start` (or any raw FHIR element). Some engines —
> including the Alphora reference engine — compare the FHIR type directly and fail with
> `Type org.hl7.fhir.r4.model.DateTimeType is not comparable`. Always sort on the primitive's
> `.value`, which is a true `System.DateTime`: `sort by period.start.value`.

## Common building blocks

| Goal | CQL pattern |
|---|---|
| At least one exists | `exists([Observation] O where O.code.coding[0].code.value = '<code>' and O.value = true)` |
| Most recent Encounter | `Last([Encounter] E sort by period.start.value)` |
| Count | `Count([Encounter])` |
| Numeric value from singleton | `(singleton from "SomeDefine").value as Quantity` |
| Boolean stub placeholder | `define myStub: false` |

## Validation and execution — the Alphora `$cql` loop

Raw CQL cannot be executed by FHIR evaluation engines — engines run the compiled
Expression Logical Model (ELM). The Alphora sandbox translates and executes in one
call: its response carries either translation errors or per-define results, making it
both the compiler feedback loop and the execution engine. It is the sole validation
channel in this workflow; if it is unreachable, report the blocker to the user.

Run the loop until clean: POST → read each error's message, line, and type → fix the
named define → bump the version → re-POST. A library is **compile-clean** only at zero
errors. Hallucinated function or operator names — the signature LLM failure mode in CQL
generation — surface as `Could not resolve call to operator <name> with signature (...)`;
check the CQL spec for the real name rather than guessing a variant. Once clean, compare
each define's returned value against the stated clinical intent for every test fixture.

POST to `https://cloud.alphora.com/sandbox/r4/cds/fhir/$cql` (system-level operation).

> **Shell pitfall:** `$cql` is interpolated as an empty variable by bash and PowerShell
> when double-quoted. Always use **single quotes** around the URL. Single quotes do NOT
> work in cmd.exe (which Node's `execSync` uses on Windows) — there, prefer Node's native
> `fetch` over shelling out to curl.

> **Caching pitfall:** the sandbox caches libraries by **name + version** and silently
> reuses the cached copy, ignoring the CQL you just posted. A fix that "has no effect" —
> the identical error returns after a correct edit — usually means you re-posted under the
> same version. Bump the library version string on **every** re-submission.

Request body — a FHIR `Parameters` resource with three parameters:

```json
{
  "resourceType": "Parameters",
  "parameter": [
    { "name": "subject",  "valueString": "Patient/<id>" },
    { "name": "content",  "valueString": "<raw CQL text>" },
    { "name": "data",     "resource": <test patient Bundle> }
  ]
}
```

To build and POST:

```bash
node -e "
const fs = require('fs');
const body = {
  resourceType: 'Parameters',
  parameter: [
    { name: 'subject',  valueString: 'Patient/<id>' },
    { name: 'content',  valueString: fs.readFileSync('<file>.cql','utf8') },
    { name: 'data',     resource: JSON.parse(fs.readFileSync('<patient>.json','utf8')) }
  ]
};
fs.writeFileSync('cql-request.json', JSON.stringify(body));
"
curl -s -X POST 'https://cloud.alphora.com/sandbox/r4/cds/fhir/$cql' \
  -H 'Content-Type: application/fhir+json' \
  -d @cql-request.json
```

The response is a `Parameters` resource. Each `parameter` entry is one define: `name` =
define name, `valueBoolean` / `valueString` / `resource` = result. A 200 with every
define's value matching its expected value confirms the logic.

## Fixture pattern

Test patient Bundles use this Observation shape — note `valueBoolean: true` and the
code string in `coding[0].code`:

```json
{
  "resourceType": "Bundle",
  "type": "collection",
  "entry": [
    {
      "resource": {
        "resourceType": "Patient",
        "id": "test-patient"
      }
    },
    {
      "resource": {
        "resourceType": "Encounter",
        "id": "test-encounter",
        "status": "finished",
        "class": { "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode", "code": "AMB" },
        "subject": { "reference": "Patient/test-patient" },
        "period": { "start": "2025-12-30T20:00:00Z" }
      }
    },
    {
      "resource": {
        "resourceType": "Observation",
        "id": "test-obs-adult",
        "status": "final",
        "code": { "coding": [ { "code": "is_adult" } ] },
        "subject": { "reference": "Patient/test-patient" },
        "issued": "2025-12-30T20:00:00Z",
        "valueBoolean": true
      }
    }
  ]
}
```

## Packaging into a FHIR Library resource

The Library resource is the distribution container for the logic. Store both payloads
base64-encoded — the raw CQL stays human-readable for clinical review and auditing, the
ELM stays instantly executable:

```json
{
  "resourceType": "Library",
  "id": "my-trial-logic",
  "version": "1.0.0",
  "status": "active",
  "type": {
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/library-type",
      "code": "logic-library"
    }]
  },
  "content": [
    { "contentType": "text/cql", "data": "<base64 of the raw CQL>" },
    { "contentType": "application/elm+json", "data": "<base64 of the compiled ELM>" }
  ]
}
```

> **ELM payload:** this workflow produces raw CQL only. Ship the Library with the
> `text/cql` entry and tell the user the target server must translate on ingest
> (cqf-ruler/HAPI CR do this automatically); include the ELM entry only if the user
> supplies compiled ELM from their own pipeline.

Workflow wiring: a `PlanDefinition` orchestrates when the logic runs — a
`TriggerDefinition` fires the evaluation, `action.condition` references a named Boolean
define expression in this Library, and the `action` points at an `ActivityDefinition`
(or a Questionnaire) to perform when the condition is true. Applying the PlanDefinition
to a patient via `$apply` yields a CarePlan or RequestGroup with the concrete directives.

## Common compile errors and fixes

| Error | Likely cause | Fix |
|-------|--------------|-----|
| `Could not resolve call to operator X with signature (...)` | Hallucinated function/operator name | Check the CQL spec for the real name; do not guess variants |
| `Could not resolve type name` | Missing `using FHIR` or resource name typo | Confirm `using FHIR version '4.0.1'`; resource names are PascalCase |
| `Could not resolve identifier` | Undefined define, or undeclared valueset/codesystem | Check spelling of define names |
| `Could not load source for library FHIRHelpers` | Translator environment lacks the FHIRHelpers source/modelinfo | Provide FHIRHelpers to the translator (it ships with the reference translator distribution); do not delete the include |
| `Type mismatch` | Comparison crosses the CQL↔FHIR type mapping (e.g., comparing `FHIR.dateTime` to `System.DateTime` without `.value`) | Use explicit `.value` on FHIR primitives on both sides of the comparison |
| `Ambiguous` | Same identifier defined in more than one included library | Qualify with the library's `called` alias (e.g., `FHIRHelpers."ToString"`) |
| `List is empty` / null result | `O.code.coding[0]` on an Observation with no codings | Ensure fixture data always includes at least one coding; in production data, consider `exists(O.code.coding)` guard |
| Empty result (unexpected) | Wrong code string or fixture doesn't match the CQL | Execute intermediate defines one by one; verify code strings match exactly between CQL and fixture |
| Sort fails with `Type ... is not comparable` | `sort by` on a raw FHIR element | Always sort on `.value`: `sort by (effective as FHIR.dateTime).value` or `sort by period.start.value` |
