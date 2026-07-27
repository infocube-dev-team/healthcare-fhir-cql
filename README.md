# healthcare-fhir-cql

[![skills.sh](https://skills.sh/b/infocube-dev-team/healthcare-fhir-cql)](https://skills.sh/infocube-dev-team/healthcare-fhir-cql)

This repository provides a native skill (`healthcare-fhir-cql`) for agentic AI coding assistants (Claude Code, Cursor, GitHub Copilot, etc.) to generate, debug, and package spec-correct Clinical Quality Language (CQL) for FHIR R4.

## Installation

Install with the `skills` CLI:

```bash
npx skills add infocube-dev-team/healthcare-fhir-cql
```

## Configuration

To use the validation step automatically, create a `.env` file in your workspace and set `CQL_SANDBOX_URL` to your target `$cql` endpoint:

```bash
# .env
CQL_SANDBOX_URL=<your-endpoint-url>
```

Example endpoints:

- Local environment: `http://localhost:8080/fhir/$cql`
- Alphora Sandbox: `https://cloud.alphora.com/sandbox/r4/cds/fhir/$cql`

The skill reads this variable at validation time. If it is not set, the agent stops and asks you to provide the endpoint URL.

## Usage

Invoke the skill in your AI agent's chat or prompt:

> "use healthcare-fhir-cql"
> or type `/healthcare-fhir-cql`

The agent loads the behavioral directives in [SKILL.md](skills/healthcare-fhir-cql/SKILL.md) and follows the clinical querying workflows defined there.

## Core files

Skill files live under [`skills/healthcare-fhir-cql/`](skills/healthcare-fhir-cql/).

### [SKILL.md](skills/healthcare-fhir-cql/SKILL.md)

Behavioral directives, constraints, and validation workflows used by agentic AI coding assistants during CQL development.

- **Orchestration workflow** — a strict, multi-step process for clinical querying: clarify clinical intent, map terminologies, construct queries, verify logic, compile results.
- **Sandbox verification** — enforces compile-clean checks and execution testing against local patient bundle test fixtures via the sandbox API.
- **Logic packaging** — bundles the final CQL code and ELM translation output into a conformant FHIR `Library` resource for distribution.

### [CQL_REFERENCE.md](skills/healthcare-fhir-cql/CQL_REFERENCE.md)

Standard FHIR R4 to CQL type mappings, terminology bindings, retrieval patterns, and compiler sandbox request schemas.

- **CQL-to-FHIR type mappings** — resolves common semantic compilation mismatches by mapping CQL system types (e.g., `System.DateTime`) to FHIR primitive types (e.g., `FHIR.Period`).
- **Terminology bindings** — standard coding URIs for SNOMED CT, LOINC, RxNorm, and ICD-10.
- **Retrieval boilerplate** — verified code snippets for common clinical decision support patterns, such as fetching the most recent observation, verifying condition verification statuses, and handling period overlaps.
- **Sandbox API interface** — the FHIR `Parameters` schema required to interact with configurable `$cql` compile-and-execute endpoints (localhost, Alphora, or custom).
