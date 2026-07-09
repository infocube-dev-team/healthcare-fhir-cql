# CQL Generation Skill

This directory maintains the custom skill definition files for the Clinical Quality Language (CQL) generator. The source files are located in the **[CQL_GENERATION_SKILL](CQL_GENERATION_SKILL)** directory.

---

## 📂 Directory Structure

The [CQL_GENERATION_SKILL](CQL_GENERATION_SKILL) directory contains the core files defining the skill's capabilities and instructions:

### 1. **[SKILL.md](CQL_GENERATION_SKILL/SKILL.md)**
Defines the behavioral directives, constraints, and validation workflows used by agentic AI coding assistants during CQL development.
* **Orchestration Workflow**: Outlines a strict, multi-step process for clinical querying, starting with clarifying clinical intent, mapping terminologies, constructing queries, verifying logic, and compiling results.
* **Sandbox Verification**: Enforces compile-clean checks and execution testing against local patient bundle test fixtures using the sandbox API.
* **Logic Packaging**: Instructs the agent on how to bundle the final CQL code and ELM translation output into a conformant FHIR `Library` resource for distribution.

### 2. **[CQL_REFERENCE.md](CQL_GENERATION_SKILL/CQL_REFERENCE.md)**
Contains standard FHIR R4 to CQL type mappings, terminology bindings, standard retrieval patterns, and compiler sandbox request schemas.
* **CQL-to-FHIR Type Mappings**: Resolves common semantic compilation mismatches by explicitly mapping CQL system types (e.g., `System.DateTime`) to FHIR primitive types (e.g., `FHIR.Period`).
* **Terminology Bindings**: Establishes standard coding URIs for major medical vocabularies including SNOMED CT, LOINC, RxNorm, and ICD-10.
* **Retrieval Boilerplate**: Provides verified code snippets for common clinical decision support patterns, such as fetching the most recent observation, verifying condition verification statuses, and handling period overlaps.
* **Sandbox API Interface**: Documents the exact FHIR `Parameters` schema required to interact with the Alphora compile-and-execute sandbox endpoint.
