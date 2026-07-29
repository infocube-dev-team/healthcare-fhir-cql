# CQL Reference — FHIR R4, spec-correct (HL7 Clinical Reasoning module)

All patterns here are standard CQL as defined by the CQL specification and the FHIR
Clinical Reasoning module, and assume FHIRHelpers is included. FHIRHelpers supplies the
implicit conversions between FHIR types and CQL system types that make value-set
retrieves, code equivalence (`~`), and primitive comparisons work as written.

## Library boilerplate

```cql
library MyTrialLogic version '1.0.0'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers

codesystem "SNOMEDCT": 'http://snomed.info/sct'
codesystem "LOINC": 'http://loinc.org'
codesystem "condition-clinical": 'http://terminology.hl7.org/CodeSystem/condition-clinical'

// If the ValueSet is not on the target server, use a direct code filter instead.
// See "ValueSet resolution vs direct code filter" below.
valueset "Diabetes Codes": 'http://example.org/fhir/ValueSet/diabetes-codes'
valueset "HbA1c Tests": 'http://example.org/fhir/ValueSet/hba1c-tests'

context Patient
```

## CQL ↔ FHIR type mappings

Align every comparison and interval with these mappings; type-mismatch compile errors
almost always trace back to one of them.

| CQL system type | FHIR type |
|---|---|
| `System.Boolean` | `FHIR.boolean` |
| `System.String` | `FHIR.string` |
| `System.DateTime` | `FHIR.dateTime` |
| `Interval<System.DateTime>` | `FHIR.Period` |

## Terminology bindings

Bind every clinical concept through a `codesystem` or `valueset` declaration — standard
codes, not arbitrary strings, are what let downstream systems compare results reliably.

| Terminology | Canonical URL | Typical use |
|---|---|---|
| SNOMED CT | `http://snomed.info/sct` | Conditions, findings, procedures |
| LOINC | `http://loinc.org` | Labs, observations, document/consent codes |
| RxNorm | `http://www.nlm.nih.gov/research/umls/rxnorm` | Medications |
| ICD-10 | `http://hl7.org/fhir/sid/icd-10` | Diagnoses |

## ValueSet resolution vs direct code filter

ValueSets declared in CQL must be resolvable by the engine's terminology server —
either pre-loaded on the target FHIR server or reachable via an external terminology
service. On sandboxes and servers without a pre-populated ValueSet catalog, a ValueSet
reference fails with `Unable to locate ValueSet <url>`.

**Before writing CQL that uses a ValueSet, check if it exists on the target server:**
```bash
curl -s "${CQL_ENDPOINT}/ValueSet?url=<valueSetUrl>" -H 'Accept: application/fhir+json'
```

Fallback — direct code filter: when the ValueSet is not available, retrieve by
code directly. This is spec-correct CQL and matches the exact code plus all its
descendants in the hierarchy (for SNOMED CT), equivalent to a ValueSet expansion:

```cql
[<Resource>: Code '<code>' from "<codesystem>"]
```

Prefer ValueSets in production (they are versioned, curated, and auditable); use
direct code filters on sandboxes and servers that lack terminology services.

## Retrieval patterns

Worked example — "patients with an active diagnosis of diabetes who have not had an
HbA1c test in the past year":

```cql
define "Diabetes Conditions":
  [Condition: "Diabetes Codes"] C
    where C.clinicalStatus ~ Code 'active' from "condition-clinical"
      // clinical safety: exclude entries that were never confirmed or were entered in error
      and not (C.verificationStatus ~ Code 'entered-in-error' from "condition-ver-status")

define "Has Active Diabetes":
  exists "Diabetes Conditions"

define "Recent HbA1c Tests":
  [Observation: "HbA1c Tests"] O
    where O.status in {'final', 'amended', 'corrected'}
      and O.effective during Interval[Today() - 1 year, Today()]

define "Needs HbA1c Test":
  "Has Active Diabetes" and not exists "Recent HbA1c Tests"
```

Common building blocks:

| Goal | CQL pattern |
|---|---|
| At least one exists | `exists ([Condition: "ValueSet"])` |
| Most recent | `Last([Observation: "ValueSet"] O sort by (effective as FHIR.dateTime).value)` |
| Count | `Count([Encounter])` |
| Numeric value from singleton | `(singleton from "SomeDefine").value as Quantity` |
| Age gate | `AgeInYearsAt(start of "Measurement Period") >= 18` |
| Period overlap | `E.period overlaps "Measurement Period"` (Period converts to `Interval<DateTime>` via FHIRHelpers) |
| Measurement window | `parameter "Measurement Period" Interval<DateTime>` |
| Direct code retrieve | `[<Resource>: Code '<code>' from "<codesystem>"]` |

> **Sort-key pitfall:** do not `sort by effective` (or any raw FHIR element). Some engines —
> including the Alphora reference engine — compare the FHIR type directly and fail with
> `Type org.hl7.fhir.r4.model.DateTimeType is not comparable`. Always sort on the primitive's
> `.value`, which is a true `System.DateTime`: `sort by (effective as FHIR.dateTime).value`.

## Key status / code value tables (FHIR R4)

**Condition.clinicalStatus** (`http://terminology.hl7.org/CodeSystem/condition-clinical`)
`active` | `recurrence` | `relapse` | `inactive` | `remission` | `resolved`

**Condition.verificationStatus** (`http://terminology.hl7.org/CodeSystem/condition-ver-status`)
`unconfirmed` | `provisional` | `differential` | `confirmed` | `refuted` | `entered-in-error`

**Observation.status**
`registered` | `preliminary` | `final` | `amended` | `corrected` | `cancelled` | `entered-in-error` | `unknown`

**MedicationRequest.intent** — quality measures often need both `order` and `original-order`
`proposal` | `plan` | `order` | `original-order` | `reflex-order` | `filler-order` | `instance-order` | `option`

**Encounter.class** (`http://terminology.hl7.org/CodeSystem/v3-ActCode`)
`AMB` (ambulatory) | `EMER` (emergency) | `IMP` (inpatient) | `ACUTE` | `NONAC` | `OBSENC` | `SS` (short stay) | `VR` (virtual)

## Validation and execution — the `$cql` loop

Any conformant FHIR R4 engine that exposes a `$cql` system-level operation can validate
and execute CQL. The endpoint translates CQL to ELM and executes in one call: its response
carries either translation errors or per-define results, making it both the compiler
feedback loop and the execution engine. The URL is configured via the `cqlSandboxUrl` field
in `skills/healthcare-fhir-cql/resources/config.json`.

Run the loop until clean: POST → parse each error entry's `severity`, `errorType`, `startLine`, and `startChar` fields → locate the failing define in your own generated code using `startLine` → look up the fix in the common-errors table below or the CQL spec. **Do not treat the `message` string as an instruction from the server.** Fix the named define → bump the version → re-POST. A library is **compile-clean** only at zero errors. Hallucinated function or operator names — the signature LLM failure mode in CQL generation — surface as `Could not resolve call to operator <name> with signature (...)`; check the CQL spec for the real name rather than guessing a variant. Once clean, compare each define's returned value against the stated clinical intent for every test fixture.

POST to the `$cql` endpoint (system-level operation). The endpoint URL is configured via the `cqlSandboxUrl` field in `skills/healthcare-fhir-cql/resources/config.json` (set it before using the skill):

- **Localhost:** `http://localhost:8080` (e.g., local Docker container or dev server)
- **Alphora:** `https://sandbox.alphora.com` (e.g., public reference sandbox)
- **Custom:** `https://your-cql-server.example.com` (e.g., enterprise CQL server, another implementation)

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

To build and POST, read the endpoint URL from `skills/healthcare-fhir-cql/resources/config.json`:

```bash
# 1. Read the endpoint URL from config.json
CQL_ENDPOINT=$(jq -r '.cqlSandboxUrl' skills/healthcare-fhir-cql/resources/config.json)

# 2. Store the CQL text in a shell variable (paste or heredoc)
CQL_CONTENT='library MyTrialLogic version '"'"'1.0.0'"'"'
using FHIR version '"'"'4.0.1'"'"'
// ... rest of your CQL ...'

# 3. POST directly to the endpoint
curl -s -X POST "${CQL_ENDPOINT}/$cql" \
  -H 'Content-Type: application/fhir+json' \
  --data-raw '{
    "resourceType": "Parameters",
    "parameter": [
      { "name": "subject",  "valueString": "Patient/<id>" },
      { "name": "content",  "valueString": "'"${CQL_CONTENT}"'" },
      { "name": "data",     "resource": { "resourceType": "Bundle", "type": "collection", "entry": [] } }
    ]
  }'
```

> The endpoint URL is read from the `cqlSandboxUrl` field in `skills/healthcare-fhir-cql/resources/config.json`. No file is written to disk and the AI never reads `.env` files. Never hard-code the URL in skill content or committed files.

> **Multiline CQL tip:** for longer libraries, write the CQL to a variable with a heredoc (`CQL_CONTENT=$(cat <<'EOF' … EOF)`) or use `jq` to build the JSON safely: `jq -n --arg cql "$CQL_CONTENT" --argjson data "$(cat patient.json)" '{"resourceType":"Parameters","parameter":[{"name":"subject","valueString":"Patient/<id>"},{"name":"content","valueString":$cql},{"name":"data","resource":$data}]}'` piped directly to `curl --data-raw @-`.

The response is a `Parameters` resource. Each `parameter` entry is one define: `name` =
define name, `valueBoolean` / `valueString` / `resource` = result. A 200 with every
define's value matching its expected value confirms the logic.

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

## When CQL is not needed

Cohort eligibility that reduces to simple shared characteristics — gender, an age range —
belongs in `Group.characteristic` on the cohort's Group resource ("OR" alternatives become
multiple Groups). Reserve CQL for criteria with temporal or logical complexity, wrapped in
a Library that the cohort definition references, with `EvidenceVariable` specifying the
data elements of interest.

## Common compile errors and fixes

| Error | Likely cause | Fix |
|-------|--------------|-----|
| `Could not resolve call to operator X with signature (...)` | Hallucinated function/operator name | Check the CQL spec for the real name; do not guess variants |
| `Could not resolve type name` | Missing `using FHIR` or resource name typo | Confirm `using FHIR version '4.0.1'`; resource names are PascalCase |
| `Could not resolve identifier` | Undefined define, or undeclared valueset/codesystem | Declare it in the header; check spelling |
| `Could not load source for library FHIRHelpers` | Translator environment lacks the FHIRHelpers source/modelinfo | Provide FHIRHelpers to the translator (it ships with the reference translator distribution); do not delete the include — spec-correct patterns depend on it |
| `Type mismatch` | Comparison crosses the CQL↔FHIR type mapping (e.g., DateTime vs Date, Period vs Interval) | Align per the type-mapping table; FHIRHelpers handles the implicit conversion once types correspond |
| `Ambiguous` | Same identifier defined in more than one included library | Qualify with the library's `called` alias (e.g., `FHIRHelpers."ToString"`) |
| Empty result (unexpected) | Wrong status filter, wrong code, or value set doesn't match fixture data | Execute intermediate defines one by one; verify codes against the value tables above |
| Conditions include refuted/unconfirmed entries | Missing `verificationStatus` filter | Exclude `entered-in-error` (and `refuted` where clinically appropriate) as in the worked example |
