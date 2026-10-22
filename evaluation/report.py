import json,math,pathlib,statistics,datetime,csv
root=pathlib.Path(__file__).parent
qs=json.loads((root/'questions.json').read_text()); run=json.loads((root/'offline-results.json').read_text()); rs={r['id']:r for r in run['results']}
# Agent-reviewed fact coverage against retrieved text. Each inner list identifies
# chunks supporting that required fact. Empty means not fully supported.
support=[
[['GOV-01-3-p1'],['GOV-01-3-p1']],
[['ETH-02-1-p3'],['ETH-02-1-p3']],
[['ETH-02-2-p1'],['ETH-02-2-p2']],
[['PPL-03-2-p2'],['PPL-03-2-p2'],['PPL-03-2-p2']],
[['PPL-03-2-p2'],['PPL-03-2-p2']],
[['PPL-03-2-p4','WRK-04-1-p1'],['WRK-04-1-p1']],
[['WRK-04-2-p2'],['WRK-04-2-p2'],['WRK-04-2-p2']],
[['SEC-05-1-p1'],['SEC-05-1-p2']],
[['SEC-05-2-p1'],['SEC-05-2-p1']],
[['SEC-05-3-p3'],['SEC-05-3-p3']],
[[],['DAT-06-3-p3']],
[['FIN-07-1-p1'],['FIN-07-1-p3'],['FIN-07-1-p2']],
[['FIN-07-3-p2'],['FIN-07-3-p3']],
[['SUP-08-1-p3'],['SUP-08-1-p1'],['SUP-08-1-p1']],
[['INC-09-2-p3'],['INC-09-2-p3']],
[['BCP-10-1-p2'],['BCP-10-1-p2','BCP-10-1-p3']],
[[],[]]
]
# Q17 fact 1 has the wiping instruction, but not the approved-disposal procedure;
# record partial evidence explicitly rather than claiming full support.
partial={'Q11':{0:['SEC-05-3-p4']},'Q17':{0:['DOC-12-8-p2']}}
reviews=[]
for i,q in enumerate(qs):
 r=rs[q['id']];available={s['id'] for s in r['retrievedSources']}
 facts=[]
 for j,fact in enumerate(q['required_facts']):
  ids=support[i][j];pids=partial.get(q['id'],{}).get(j,[])
  assert set(ids+pids)<=available,(q['id'],ids,pids)
  facts.append({'fact':fact,'coverage':'full' if ids else ('partial' if pids else 'missing'),'supporting_chunk_ids':ids or pids})
 full=sum(f['coverage']=='full' for f in facts)
 status=('full' if full==len(facts) else 'partial' if any(f['coverage']!='missing' for f in facts) else 'none') if facts else 'not_applicable'
 notes=''
 if q['id']=='Q11':notes='90 days is retrieved from SEC-05, but the gold reference explicitly says from creation; DAT-06-3-p1 was not retrieved. Strict fact coverage marks that fact partial.'
 if q['id']=='Q17':notes='Wiping is retrieved, but approved disposal procedure and communications authority passages are absent. Requires retrieval across two policy topics.'
 if q['id'] in ['Q18','Q20']:notes='Lexical overlap retrieves passages despite the expected refusal. Offline search-only mode does not exercise the LLM refusal prompt.'
 reviews.append({'id':q['id'],'evidence_match':status,'facts':facts,'notes':notes})
(root/'review.json').write_text(json.dumps({'reviewer':'Codex agent, qualitative review of local retrieved text; not an independent human or external judge','reviews':reviews},indent=2)+'\n')
corpus=json.loads((root.parent/'data/corpus.json').read_text());sections={s['id']:(d,s) for d in corpus for s in d['sections']}
all_sources=[s for r in rs.values() for s in r['retrievedSources']]
source_ok=sum(s['sectionId'] in sections and s['text'] in sections[s['sectionId']][1]['text'] for s in all_sources)
metadata_ok=sum(s['sectionId'] in sections and s['documentId']==sections[s['sectionId']][0]['id'] and s['title']==sections[s['sectionId']][0]['title'] and s['section']==sections[s['sectionId']][1]['heading'] for s in all_sources)
numbering_ok=all([s['citation'] for s in r['retrievedSources']]==list(range(1,len(r['retrievedSources'])+1)) for r in rs.values())
answerable=[q for q in qs if q['expected_behavior']=='answer']; gold_total=sum(len(q['reference_sections']) for q in answerable); gold_hits=sum(sum(g['id'] in {s['sectionId'] for s in rs[q['id']]['retrievedSources']} for g in q['reference_sections']) for q in answerable)
facts=[f for rev in reviews for f in rev['facts']]
def pct(n,d):return round(100*n/d,2) if d else None
def stats(vals):
 s=sorted(vals);return {'mean_ms':round(statistics.mean(s),3),'p50_ms':round(statistics.median(s),3),'p95_ms':round(s[math.ceil(.95*len(s))-1],3),'min_ms':round(s[0],3),'max_ms':round(s[-1],3)}
m={'questions':20,'answerable':17,'refusal_tests':3,'generated_answers':0,'external_api_calls':0,'answer_groundedness_pct':None,'answer_citation_accuracy_pct':None,'answer_exact_match_pct':None,'answer_partial_match_pct':None,'retrieved_text_fidelity_pct':pct(source_ok,len(all_sources)),'source_metadata_integrity_pct':pct(metadata_ok,len(all_sources)),'source_instances':len(all_sources),'citation_numbering_valid':numbering_ok,'gold_section_recall_at_6_pct':pct(gold_hits,gold_total),'gold_section_hits':gold_hits,'gold_section_total':gold_total,'full_evidence_match_pct':pct(sum(v['evidence_match']=='full' for v in reviews),17),'partial_evidence_match_pct':pct(sum(v['evidence_match']=='partial' for v in reviews),17),'fully_covered_facts':sum(f['coverage']=='full' for f in facts),'partial_facts':sum(f['coverage']=='partial' for f in facts),'missing_facts':sum(f['coverage']=='missing' for f in facts),'total_facts':len(facts),'retrieval_latency':stats([r['retrievalMs'] for r in rs.values()]),'local_pipeline_latency':stats([r['totalMs'] for r in rs.values()])}
(root/'metrics.json').write_text(json.dumps(m,indent=2)+'\n')
lines=['# Policy assistant: 20-question offline evaluation','',f"Run: {run['startedAt']} (UTC); local timezone Africa/Kampala (UTC+03:00).",f"Source commit: `{run['commit']}`.",f"Corpus SHA-256: `{run['corpusSha256']}`.",'','## Scope and interpretation','', 'The user selected offline retrieval evaluation only. No policy passages were sent to xAI or OpenAI, and no paid API requests were made. This run used the production LangChain BM25 retrieval and answer fallback functions with provider configuration disabled. Semantic embeddings/Qdrant, hybrid fusion, Grok generation, HTTP handling, browser rendering, and concurrent load were not evaluated. The dataset was authored from the corpus, not sampled from real user traffic.','', 'There are 17 answerable cases and 3 refusal cases. Coverage includes governance, conduct, people operations, remote work, safety, security, privacy/retention, finance, support, incidents, continuity, assets, and external communications. Technology-use scope is exercised by an adversarial refusal case. Reference answers are expected answers, not observed model outputs.','', '## Requested answer metrics','', '| Metric | Result | Definition for a future live run |','|---|---|---|','| Groundedness | Not measured | Supported factual claims / all factual claims in generated answers; refusals reported separately |','| Citation accuracy | Not measured | Citation-to-claim links whose cited passage supports the associated claim / all citation-to-claim links |','| Exact answer match | Not measured | Whole answer equals reference after lowercasing, whitespace normalization and citation-marker removal / all cases |','| Partial answer match | Not measured | Non-exact answer covers some but not all required facts without contradiction / all cases |','', 'A paraphrase can be semantically complete without being a literal exact match. A live report should therefore also report full semantic match, partial semantic match, failures, and refusal accuracy. Offline source fidelity and evidence coverage below must not be presented as generated-answer groundedness or citation accuracy.','', '## Measured offline metrics','', '| Metric | Result |','|---|---:|',f"| Retrieved text fidelity (verbatim source membership) | {m['retrieved_text_fidelity_pct']}% ({source_ok}/{len(all_sources)}) |",f"| Source document/title/section metadata integrity | {m['source_metadata_integrity_pct']}% ({metadata_ok}/{len(all_sources)}) |",f"| Sequential valid citation labels | {'20/20 cases' if numbering_ok else 'failed'} |",f"| Gold-section recall within top 6 | {m['gold_section_recall_at_6_pct']}% ({gold_hits}/{gold_total}) |",f"| Full evidence match, all required facts present | {m['full_evidence_match_pct']}% (15/17 answerable cases) |",f"| Partial evidence match | {m['partial_evidence_match_pct']}% (2/17 answerable cases) |",f"| Fact coverage | {m['fully_covered_facts']} full, {m['partial_facts']} partial, {m['missing_facts']} missing / {len(facts)} |",'| Observed app output | 19 search-only responses; 1 exact no-evidence refusal; 0 generated answers |','| API calls / API token usage | 0 / 0 |','', 'The full/partial evidence judgments were made by the Codex agent against the frozen reference facts and actual retrieved text. They are qualitative, not an independent human audit. Source instances count repeated passages across queries. Gold-section recall can overstate answerability: finding a section does not guarantee finding the needed paragraph.','', '## System latency','', '| Stage | Mean ms | p50 ms | p95 ms | Min ms | Max ms |','|---|---:|---:|---:|---:|---:|']
for label,key in [('BM25 retrieval','retrieval_latency'),('Local retrieval + fallback pipeline','local_pipeline_latency')]:
 s=m[key];lines.append('| '+label+' | '+' | '.join(str(s[k]) for k in ['mean_ms','p50_ms','p95_ms','min_ms','max_ms'])+' |')
lines+=['','One sequential pass, 20 observations, no warmup or retries. Timings exclude module loading, corpus/index initialization, results-file writes, HTTP/network transport and UI rendering. p50 is the median; p95 uses nearest rank. These are local observations, not production latency, LLM latency, throughput or an SLA. The sample is too small for robust tail-latency conclusions.','', '## Findings','', '1. Q11 retrieves the 90-day security-log retention period and the hold rule, but misses the explicit “from creation” wording in the reference. The strict rubric marks that fact partial.','2. Q17 retrieves secure wiping but misses approved disposal procedure and communications authority. Consider query decomposition for compound questions, then fusion or optional re-ranking; assess any change on a separate held-out set.','3. Q18 (spaceship instruction) and Q20 (unsupported childcare amount) still retrieve policy passages through lexical overlap. Retrieval relevance is not a refusal classifier. The Grok system prompt must still be evaluated live before claiming refusal reliability.','4. Q19 (capital of France) returns the exact configured refusal without a model call. Only 1 of 3 refusal cases produces that response in offline mode; this is not a measurement of Grok refusal accuracy.','', '## Per-question results','']
for q,review in zip(qs,reviews):
 r=rs[q['id']];lines += [f"### {q['id']} — {q['topic']}",'',f"Question: {q['question']}",'',f"Reference answer: {q['reference_answer']}",'',f"Gold sections: {', '.join(g['id'] for g in q['reference_sections']) or 'None; refusal expected'}. For refusal cases any listed section is context, not a relevance target.",'',f"Observed app answer ({r['mode']}): {r['answer']}",'',f"Evidence match: {review['evidence_match']}. Retrieval: {r['retrievalMs']:.3f} ms; pipeline: {r['totalMs']:.3f} ms.",'', 'Retrieved citations: '+('; '.join(f"[{s['citation']}] {s['id']}" for s in r['retrievedSources']) or 'None')+'.','']
 if review['notes']:lines += [review['notes'],'']
lines+=['## Reproduction','', 'Run from the project directory:', '', '```sh','node evaluation/run.mjs','python3 evaluation/report.py','```','', 'The default runner is offline. `node evaluation/run.mjs --live` uses server-side configuration from `.dev.vars` and the environment and sends policy passages to the configured services; it requires separate authorization and API credits. It records actual provider outputs, usage, modes, and timings with no retries. This report generator intentionally uses offline results only; live answer metrics require claim-level and citation-level review, not automatic reuse of the offline scores.','', 'Files: questions.json (gold set with policy excerpts), offline-results.json (actual outputs, retrieved chunks, timings), review.json (fact-level judgments), metrics.json (aggregates), report.md and report.txt (this report).']
report='\n'.join(lines)+'\n';(root/'report.md').write_text(report);(root/'report.txt').write_text(report)
with (root/'questions.csv').open('w',newline='') as f:
 w=csv.writer(f);w.writerow(['id','topic','question','expected_behavior','reference_answer','reference_sections'])
 for q in qs:w.writerow([q['id'],q['topic'],q['question'],q['expected_behavior'],q['reference_answer'],';'.join(s['id'] for s in q['reference_sections'])])
print(json.dumps(m,indent=2))
