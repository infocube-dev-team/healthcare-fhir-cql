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
