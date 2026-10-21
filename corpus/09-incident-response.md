# INC-09: Incident Response and Crisis Communication

**Company:** Northstar Cloud Services (fictional)  
**Owner:** IT Lead  
**Version:** 1.0 | **Effective:** 13 October 2026 | **Review due:** 13 October 2027  
**Classification:** Internal | **Status:** Synthetic example policy

## 1. Reporting, severity, and command roles

When to invoke
An incident is an event threatening service availability, confidentiality, integrity, worker safety, or material business operations. Anyone may report a suspected incident immediately without waiting for proof. Use the emergency Service Desk channel and IT on-call contact; if unavailable, use the internal emergency directory. Seek emergency services first for immediate physical danger.

Severity assessment
SEV1 means widespread critical-service outage, credible ongoing compromise of Restricted information, serious safety impact, or material uncontrolled financial harm. SEV2 means significant but contained disruption or suspected compromise requiring coordinated response. SEV3 means limited impact manageable by a single team. IT triages immediately and targets a recorded assessment within 30 elapsed minutes of report. Unknown scope is a reason for caution, not automatic downgrading.

Command structure
The IT on-call responder initially commands technical incidents and may transfer command explicitly to the IT Lead. The COO commands nontechnical incidents. The commander appoints an operations lead, scribe, and communications lead; People Operations, Finance, and the Privacy Lead join according to impact. One person may cover multiple roles when capacity is limited, while preserving independent change approval.

Escalation
Notify the COO and relevant owners immediately for SEV1. The COO informs the CEO. The commander records severity, rationale, affected services, known facts, decisions, and next review time in a restricted incident record.

<!-- Page break in the companion PDF -->

## 2. Containment, evidence, and external communication

First response
Protect people first, then reduce ongoing harm. Identify affected identities, systems, records, suppliers, and customer groups. Prefer reversible containment such as disabling an account, isolating a device, or revoking a link. Record who authorized each action, when it occurred, and its effect. Emergency production changes follow SEC-05's independent approval rule.

Evidence preservation
Preserve relevant logs, messages, configuration, timestamps, and original files in restricted storage. Record the collector, source, collection time, transfer history, and any changes made during collection. Do not circulate raw evidence in broad chat rooms. The Privacy Lead or authorized adviser may impose a hold under DAT-06; ordinary retention must not delete held evidence.

Communication rules
The communications lead provides a verified internal update at least hourly for SEV1 and every four elapsed hours for SEV2 while active, even if the update is that investigation continues. Support distributes customer updates under SUP-08. The CEO approves public statements; the Privacy Lead coordinates legally or contractually required notices and records applicable deadlines. Approval workflows must not delay a mandatory notice beyond its deadline; escalate immediately to the CEO if timing is at risk.

Working with third parties
Use known supplier contacts, record ticket references, and share only necessary evidence through approved channels. A supplier's assurance does not replace Northstar's impact assessment. Invoke BCP-10 if expected disruption exceeds recovery targets.

<!-- Page break in the companion PDF -->

## 3. Recovery, closure, and follow-up

Recovery decision
The operations lead verifies that the immediate cause is contained, affected credentials or components are remediated, and restoration tests have passed. The relevant business owner confirms essential workflows. The commander authorizes phased restoration and specifies enhanced monitoring. For suspected data compromise, involve the Privacy Lead before declaring the impact assessment complete.

Closure criteria
Service restoration and incident closure are different decisions. Close only when active harm is stopped, required notices are assigned and tracked, evidence is preserved, remaining risks have owners, and the affected business owner accepts the result. The commander records the timeline, impact, actions, unresolved questions, and linked tickets. Long-term work may remain open with explicit owners and due dates.

Post-incident review
For SEV1 and SEV2, hold a review within five business days after stabilization. Examine detection, escalation, decisions, control gaps, customer impact, and what helped. Focus on system and process improvement rather than blame. Assign corrective actions with risk-based dates; the COO reviews overdue high-risk actions weekly. Handle any conduct allegation separately under ETH-02.

Evidence and exercises
Retain incident records for three years after closure under DAT-06, with holds overriding disposal. Report aggregate incident counts, time to detect and restore, and recurring causes quarterly. Exercise a security scenario and a continuity scenario at least annually, coordinating with BCP-10.
