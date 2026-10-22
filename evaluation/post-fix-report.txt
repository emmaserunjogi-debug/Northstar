# Evaluation bug fixes — targeted verification

Original offline and live baseline reports/results are preserved. This is a targeted post-fix check, not a replacement 20-question live benchmark.

## Changes

- Normalize only the known refusal phrase: case, whitespace and one terminal period, exclamation mark or question mark. Display the canonical phrase without punctuation. Extra text is not accepted as a refusal.
- Split explicit compound questions into at most three local LangChain BM25 branches. Keep the original fused top hit, reserve branch evidence, and add up to two adjacent same-section paragraphs within six sources. Prefer an already-ranked neighbor when both exist. No extra embedding calls or external decomposition service.
- Preserve original source IDs/text, document scope, deduplication and citation numbering.
- Prompt for citations supporting every clause and next step, with timing start points preserved. Reject uncited answer paragraphs. This structural check is not a semantic entailment verifier.

## Verification

46 unit tests passed; one real-Qdrant integration test was skipped. TypeScript passed. Six targeted API calls returned HTTP 200: an initial five-case run plus one Q10 recheck after a context-ordering adjustment. No automatic retries.

| Case | Observed result |
|---|---|
| Q10 | Correct lost-device reporting and no-wipe guidance, with cited closing instructions. |
| Q11 | Includes 90 days from creation and hold override. |
| Q17 | Covers approved disposal, secure wiping, authorized spokespersons and referral. |
| Q18 | Displays exactly `i can only answer about our policies`. |
| Q20 | Displays exactly `i can only answer about our policies`. |

All five final outputs are within 150 words. Agent review found the listed expected behavior. The 20-question offline set was also rerun: all formerly fully supported gold facts retain their supporting chunks, and the missing retention/disposal/communications passages are retrieved. Unit tests include Q16's no-guarantee qualification and a fresh expense/support compound question.

Q10 was rerun because final context ordering changed one neighboring passage. All five final source sets now match the final offline run exactly. This does not establish post-fix live quality for the other 15 cases, or guarantee semantic citation correctness in every future answer.

## Artifacts and reproduction

- post-fix-live-results.json: initial five live cases.
- post-fix-final-q10-results.json: Q10 after final context adjustment.
- post-fix-offline-results.json: all 20 retrieval cases on final code.

```sh
npm test
node evaluation/run.mjs --output post-fix-offline-results.json
```

A new paid run, only when intended:

```sh
node evaluation/run.mjs --live --ids Q10,Q11,Q17,Q18,Q20 --output post-fix-live-results.json
```

Runs used working-tree changes on top of the baseline commit recorded in result metadata. Final implementation hashes:

- `lib/answer.mjs`: `1841e2f387df51cabb723b79c2179e026932a15d7ac64533d518fa899e74ec78`
- `lib/evidence-selection.mjs`: `c57b81d7ce7535e5f5bc8e775814601dc390d397aec1be6fd4605fa4c99d5562`
- `lib/hybrid-retrieval.mjs`: `b78713c803272e298cc62cca0ef4359717de36133f31bcb4d9ff60b5a3909c1c`

## Final observed answers

### Q10

Report a lost company laptop immediately through the emergency Service Desk channel and notify the IT on-call contact. If that channel is unavailable, call the published internal on-call number [3]. Report it under SEC-05 and INC-09 [2], and through the IT help desk or designated security channel [4].

Do not wipe the laptop yourself, investigate independently, or delete evidence [3]. Do not try to recover stolen equipment personally [2].

Next step: use those reporting channels immediately [2][3][4].

### Q11

Security logs are kept for 90 days from creation [3]. SEC-05 also says to retain security logs for 90 days unless they are attached to an incident or hold [1]. The retrieved passages do not state a replacement period for incident attachment; INC-09 is named as governing incident evidence but its rules are not included here [1].

A legal, dispute, or investigation hold suspends deletion of affected material until authorized release, and the scope, custodian, and release decision must be recorded [4]. These defaults are not statements of legal minimums [4].

### Q17

Sensitive information on a laptop must be securely wiped before disposal or reassignment [1]. End-of-life disposal or redeployment must also follow approved procedures and may require environmental, finance, or legal review depending on asset type and value [5].

An unauthorized employee may not speak for the company in official external communications; only authorized persons may do so [6]. Employees who are not designated spokespeople should avoid public statements that could be read as official positions and should redirect public-comment requests to the appropriate communications lead [2].

If communication authority is uncertain, or an unauthorized or misleading statement is identified, escalate to the communications lead, Legal, or a manager; report reputational, customer, or legal exposure immediately [4].

### Q18

i can only answer about our policies

### Q20

i can only answer about our policies
