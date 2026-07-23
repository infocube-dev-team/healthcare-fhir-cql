# CQL Generation Skill (cql-helper)

[![skills.sh](https://skills.sh/b/infocube-dev-team/healthcare-fhir-cql)](https://skills.sh/infocube-dev-team/healthcare-fhir-cql)

This repository provides a custom native skill (`cql-helper`) for agentic AI coding assistants (like Claude Code, Cursor, GitHub Copilot, etc.) to generate, debug, and package spec-correct Clinical Quality Language (CQL) for FHIR R4.

---

## 🚀 Installation

You can install this skill directly into your local AI environment using the `skills` CLI. Run the following command in your project's terminal:

```bash
npx skills add infocube-dev-team/healthcare-fhir-cql
```

## ⚙️ Configuration

To use the validation step automatically, create a `.env` file in your workspace and define the `CQL_SANDBOX_URL` variable pointing to your target `$cql` endpoint:

```bash
# .env
CQL_SANDBOX_URL=<your-endpoint-url>
```

**Example endpoints:**

- **Local environment:** `http://localhost:8080/fhir/$cql`
- **Alphora Sandbox:** `https://cloud.alphora.com/sandbox/r4/cds/fhir/$cql`

The skill will read this variable at validation time. If it is not set, the agent will stop and ask you to provide the endpoint URL.

## 💡 How to Use

Once installed, you can invoke the skill in your AI agent's chat or prompt by simply saying:

> "use cql-helper"  
> *or typing* `/cql-helper`

The agent will automatically load the behavioral directives and follow the strict clinical querying workflows defined in this repository.

---

## 📂 Core Files

The core files defining the skill's capabilities and instructions are located in the root of this directory:

### 1. **[SKILL.md](SKILL.md)**
Defines the behavioral directives, constraints, and validation workflows used by agentic AI coding assistants during CQL development.
* **Orchestration Workflow**: Outlines a strict, multi-step process for clinical querying, starting with clarifying clinical intent, mapping terminologies, constructing queries, verifying logic, and compiling results.
* **Sandbox Verification**: Enforces compile-clean checks and execution testing against local patient bundle test fixtures using the sandbox API.
* **Logic Packaging**: Instructs the agent on how to bundle the final CQL code and ELM translation output into a conformant FHIR `Library` resource for distribution.

### 2. **[CQL_REFERENCE.md](CQL_REFERENCE.md)**
Contains standard FHIR R4 to CQL type mappings, terminology bindings, standard retrieval patterns, and compiler sandbox request schemas.
* **CQL-to-FHIR Type Mappings**: Resolves common semantic compilation mismatches by explicitly mapping CQL system types (e.g., `System.DateTime`) to FHIR primitive types (e.g., `FHIR.Period`).
* **Terminology Bindings**: Establishes standard coding URIs for major medical vocabularies including SNOMED CT, LOINC, RxNorm, and ICD-10.
* **Retrieval Boilerplate**: Provides verified code snippets for common clinical decision support patterns, such as fetching the most recent observation, verifying condition verification statuses, and handling period overlaps.
* **Sandbox API Interface**: Documents the FHIR `Parameters` schema required to interact with configurable `$cql` compile-and-execute endpoints (localhost, Alphora, or custom).