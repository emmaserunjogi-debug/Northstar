# AI tooling disclosure

Project: Northstar Cloud Services — Policy Compass  
Prepared: 25 October 2026

## Purpose and scope

This document records the AI-assisted development evident in the project work and conversation. It distinguishes tools used to produce the software from AI services used by the running application. It is a disclosure of assistance, not a claim of independent human authorship or a complete audit of every development session.

## AI development tools used

| Tool | How it was used | Examples of resulting work |
|---|---|---|
| OpenAI Codex coding assistant | Interpreted user requirements, inspected repository files, proposed architecture, wrote and revised code, executed shell commands, diagnosed errors, and drafted documentation. The user supplied objectives and requested changes iteratively. | React/TypeScript interface, RAG integration, prompt constraints, citation validation, corpus version tracking, tests, and design documentation. |
| Sites plugin used through the coding assistant | Supported the existing site's source synchronization, build packaging, and private publication. It supplied deployment tooling; it was not the application's answer-generation model. | Private deployment of Policy Compass, including the Northstar interface refresh. |
| OpenAI documentation skill | Guided consultation of OpenAI-related documentation during development where relevant. It supported technical research rather than generating policy answers at runtime. | Provider-interface and structured-output implementation guidance reflected in the architecture documentation. |

The exact underlying coding-model version was not independently recorded for every session and is therefore not asserted here. There is no evidenced use of GitHub Copilot, Cursor, or another separate AI coding assistant in the recorded work.

## How AI assistance was applied

1. **Design and implementation:** Codex helped turn the requested company-policy assistant into a React interface and server-side RAG pipeline. Changes included LangChain retrieval adapters, optional embeddings and Qdrant search, keyword fallback, and provider configuration.
2. **Prompting and answer safeguards:** The assistant helped implement evidence-only prompting, a standard outside-corpus refusal, a 150-word answer limit, structured responses, and local citation/schema validation. These safeguards reduce particular failure modes; they do not prove factual correctness.
3. **User interface:** Codex edited JSX and CSS to emphasize important headings, actions, and citations, improve contrast, and display Northstar Cloud Services branding. The compass logo and favicon were authored as SVG code; no image-generation model was used for that refresh.
4. **Debugging:** The assistant inspected configuration and request paths and ran targeted checks. A minimal Grok connectivity request returned HTTP 200. A full application test was separately blocked by automatic approval review because it would send policy passages externally; the connectivity result alone was not treated as complete application verification.
5. **Testing and CI:** Codex authored and ran JavaScript regression tests and Python report-regeneration tests. It added GitHub Actions jobs to install Python dependencies and run pytest, and to install JavaScript dependencies with `npm ci` and run `npm test`. GitHub Actions and pytest are conventional automation tools, not AI models.
6. **Documentation and evaluation:** The assistant drafted operating instructions, architecture discussion, evaluation questions, reports, and this disclosure. It also assessed recorded answer support and citation groups against retrieved passages.

## AI services and supporting libraries inside the application

| Component | Runtime role | Distinction from coding assistance |
|---|---|---|
| xAI Grok (`grok-4.7` default) | Generates policy answers from the question and retrieved evidence through the Responses API. | An application generation service; not evidenced as a code-authoring tool for this project. |
| OpenAI `text-embedding-3-small` | Produces 1,536-dimensional document and query embeddings when semantic retrieval is configured. | Represents text for similarity retrieval; does not write application code or directly generate these policy answers. |
| Optional OpenAI generation provider (`gpt-4.1-mini` default) | Alternative answer-generation configuration. | An implemented option; its presence does not establish that it was used in the recorded live evaluation. |
| LangChain.js | Provides BM25 retrieval, embedding and Qdrant adapters, and reciprocal rank fusion. | An orchestration/retrieval library, not itself an LLM. |
| Qdrant | Stores and searches policy vectors for the semantic retrieval path. | A vector database, not an AI coding assistant or generation model. |

The recorded answer-quality baseline used **BM25 retrieval plus Grok generation**. Its results must not be presented as measurements of the hybrid embedding/Qdrant path. See [design and evaluation](design-and-evaluation.md) for configuration and measurement details.

## Verification and limitations

AI-produced changes were checked using executable tests, TypeScript checks, production builds, selected endpoint checks, and targeted live requests where authorized. Different checks were performed at different stages; not every change received every check.

The latest JavaScript test run recorded in this work passed **51 tests**, with **one optional real-Qdrant integration test skipped**. The two Python tests passed locally by rebuilding reports from frozen results and comparing their metrics. They do not perform a new model evaluation. Local success does not establish that GitHub-hosted CI has run successfully.

The interface refresh passed its build and TypeScript checks, and five main text/background combinations exceeded a 4.5:1 contrast ratio. Browser-based visual verification was not completed for that refresh; those checks do not establish full accessibility compliance.

Evaluation groundedness and citation-support judgments were made by the Codex agent. They are **not an independent human assessment**. Because the assistant helped implement the system, author evaluation cases, and assess outputs, there is potential evaluation bias. Academic submission should disclose that involvement and ideally include independent human review and held-out questions.

## Data handling and responsibility

- The development assistant read project files and evaluation artifacts to perform the requested work. The supplied company policy corpus is described in the project as synthetic demonstration data.
- Live generation sends questions and selected passages to the configured provider. Semantic indexing sends policy text to the embedding provider. Those flows are separate from local tests using mocks or frozen results.
- Credentials belong in ignored local environment files or hosted server-side secrets. This document intentionally includes no keys or tokens.
- The project author remains responsible for reviewing the code, verifying claims and references, understanding the implementation, and meeting the institution's AI-use disclosure rules. This document does not assert that such review or institutional approval has already occurred.

## Supporting artifacts

- [Design and evaluation](design-and-evaluation.md)
- [Application requirements](application-requirements.txt)
- [Operating instructions](README.md)
- [Offline evaluation](evaluation/report.md)
- [Live evaluation](evaluation/live-report.md)
- [Architecture verification](evaluation/architecture-verification.md)
- [Python and JavaScript CI workflow](.github/workflows/pytest.yml)
- [Python report regression tests](tests/python/test_evaluation_reports.py)
