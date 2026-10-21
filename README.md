# Northstar Policy Compass

A private company-policy RAG application built with React, Vinext, and a Cloudflare Worker backend. The provided Northstar corpus is synthetic demonstration material.

## Run

Requires Node 22.13+ and npm.

```sh
npm ci
node scripts/ingest.mjs
npm run dev
```

Open the local URL printed by the development server. The production site uses Sites owner-private authentication. Do not expose the local development server to the public internet: it has no standalone authentication.

## Enable LLM generation

Configure `OPENAI_API_KEY` as a **secret** in Sites runtime environment variables and deploy again. Optionally configure `OPENAI_MODEL` (default `gpt-4.1-mini`). Do not put keys in the browser, source, or hosting manifest. For local development, provide these through the shell environment or the runtime's ignored `.dev.vars` file.

Without a key the app explicitly returns policy search results, not a fabricated AI answer. With a key, the server calls the OpenAI Responses API. API failures are shown as errors; retries are user initiated. No live-provider test is implied by the mocked tests.

Reference: https://developers.openai.com/api/docs/guides/text

## Semantic retrieval: embeddings and Qdrant

The application now combines OpenAI `text-embedding-3-small` embeddings (1,536
 dimensions) with a persistent Qdrant vector database and the existing BM25
 keyword index. Reciprocal rank fusion merges both rankings into up to six cited
 passages. The UI explicitly labels keyword-only fallback.

Local setup (Docker Desktop must be running):

```sh
npm run vectors:start
# Add your actual OPENAI_API_KEY to .dev.vars, then:
npm run ingest
npm run index:vectors
npm run dev
```

Local `.dev.vars` configuration (never commit actual credentials):

```env
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4.1-mini"
QDRANT_URL="http://127.0.0.1:6333"
QDRANT_API_KEY=""
SEMANTIC_SCORE_THRESHOLD="0.35"
```

The pinned Qdrant container binds only to localhost and stores its database in a
Docker named volume. `npm run vectors:stop` stops it without deleting data.
Embedding the corpus incurs API usage; indexing submits policy passages to OpenAI.
Qdrant stores vectors and source identifiers, while source text is resolved from
this application's canonical corpus. Queries send the user's question to the
embedding API and its vector to Qdrant. Credentials remain server-side.

`npm run index:vectors` loads `.dev.vars`; shell environment variables take
precedence. It creates a collection named from a SHA-256 fingerprint of the
corpus, model, and dimensions. A complete collection is reused without new
embedding calls; a partial collection is re-upserted safely. Indexing creates a
keyword payload index for document filtering. Serving checks vector dimensions
and the expected point count before querying. Changes to corpus content produce
a new collection; old collections are retained rather than deleted automatically.
Run indexing again after ingestion changes and before deploying that corpus.
Do not manually edit an app-managed collection.

For the hosted Site, configure an HTTPS Qdrant endpoint reachable by Cloudflare
Workers (for example, your Qdrant Cloud cluster), plus its API key, and the OpenAI
key as Sites runtime secrets. Index the same corpus against that endpoint and
redeploy. The hosted Worker cannot reach your laptop's localhost database. No
cloud database has been provisioned by this change. Use a read-only Qdrant API key
for serving if supported by your cluster; indexing requires write access.

Semantic search uses a configurable cosine score threshold (default 0.35, between
0 and 1). This is a retrieval cutoff, not calibrated confidence. Evaluate and tune
it on your own policy questions before relying on generated answers.

References:
- https://developers.openai.com/api/docs/guides/embeddings
- https://api.qdrant.tech/api-reference/search/query-points/
- https://qdrant.tech/documentation/manage-data/collections/

## Architecture

```mermaid
flowchart LR
  A[Markdown policies] --> B[Paragraph chunks and source IDs]
  B --> C[OpenAI text-embedding-3-small]
  C --> D[Qdrant persistent vector collection]
  B --> K[BM25 keyword index]
  Q[User question] --> E[Query embedding]
  E --> D
  Q --> K
  D --> F[Reciprocal rank fusion]
  K --> F
  F --> G[Top 6 canonical source passages]
  G --> L[OpenAI Responses API]
  L --> U[Cited answer and source reader]
```

- `corpus/`: copies of the 13 supplied Markdown files. The companion PDF is not ingested, avoiding duplicate evidence.
- `scripts/ingest.mjs`: deterministic conversion with source SHA-256, document title, metadata, stable section IDs, and exact paragraph text.
- `lib/retrieval.mjs`: in-memory BM25 ranking over paragraphs, headings, and document titles, with stop-word normalization and common workplace synonyms. This supplies the keyword component and fallback for hybrid retrieval.
- `lib/vector-store.mjs`: OpenAI embedding and Qdrant HTTP clients, corpus fingerprinting, index readiness, scoped vector search.
- `lib/hybrid-retrieval.mjs`: reciprocal rank fusion and explicit service-failure fallback.
- `scripts/index-vectors.mjs`: batched embedding and idempotent Qdrant upserts.
- `compose.yaml`: local Qdrant service with persistent storage.
- `lib/answer.mjs`: bounded evidence prompt, refusal instructions for insufficient evidence, timeout, upstream error handling, `store: false`, and citation-number validation.
- `app/api/ask/route.ts`: same-origin JSON POST, question length validation, document scope validation, private/no-store responses.
- `worker/index.ts` and `lib/runtime.ts`: request-scoped secrets kept out of client bundles.
- `app/page.tsx`: question interface, policy scope, library content search, source reader, saved answers, local question history, empty/loading/error states, responsive layout, keyboard dialog handling.

Questions are independent. The application does not send conversation history to the model; follow-up questions should include their subject. Each generation sends the current question and up to six source passages to OpenAI. Saved answers and the latest 40 questions are stored in browser localStorage, not shared across users or devices. The raw answer is rendered as text, not HTML. The provider has no tools and cannot execute workplace actions.

## Update the corpus

Replace or edit Markdown files in `corpus/`, preserving `#` document titles and `##` section headings. Then run `npm run ingest`, `npm run index:vectors`, tests, and redeploy. Update UI counts if the number of documents or sections changes. Metadata absent from source documents remains “Not specified”; it is not inferred. The original governance document mentions ten policies, while the supplied folder contains thirteen; source text is retained unchanged.

## Validation

```sh
npm test
npx tsc --noEmit
npm run build
```

Tests cover source identity, leave qualifications, procurement approvals, remote-work synonyms, lost devices, policy scoping, unrelated questions, missing keys, provider errors, bounded evidence, and invalid citations. The provider tests use controlled mocks and do not verify model quality.

The vector unit tests cover embedding dimensions and ordering, corpus versioning,
readiness, document filters, source validation, rank fusion, and service failures.
To test against the real local Qdrant service:

```sh
QDRANT_TEST_URL=http://127.0.0.1:6333 node --test tests/qdrant.integration.test.mjs
```

That test creates and deletes only its own unique temporary collection and uses
deterministic test vectors. It validates database integration, not model quality.
Live corpus embedding still requires a configured OpenAI API key.

## Limits and production expansion

This is an initial working implementation for a small, fixed corpus. Semantic retrieval improves paraphrase matching when configured; keyword-only fallback can still miss paraphrases. A citation check proves that the source number exists, not that each claim follows from it. The UI exposes original passages for verification. The model is instructed to surface conflicts rather than silently choose a policy.

Before a larger employee rollout, evaluate actual generated answers on an approved question set, evaluate whether additional reranking is needed, add durable per-user history if required, and introduce application-level quotas/rate limits and operational monitoring. Sites controls access to the whole corpus; this app does not implement different document permissions for different roles. It does not support PDF uploads, OCR, runtime corpus edits, or enterprise document sync.
