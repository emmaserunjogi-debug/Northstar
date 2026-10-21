# BCP-10: Business Continuity and Disaster Recovery

**Company:** Northstar Cloud Services (fictional)  
**Owner:** Chief Operating Officer  
**Version:** 1.0 | **Effective:** 13 October 2026 | **Review due:** 13 October 2027  
**Classification:** Internal | **Status:** Synthetic example policy

## 1. Critical services and recovery objectives

Purpose and activation
Maintain essential customer and workforce operations through loss of technology, a supplier, the office, or key staff. The COO activates continuity when disruption is expected to exceed a recovery objective, normal response capacity is inadequate, or the office becomes unsafe. INC-09 remains the command framework; continuity work supports the same commander rather than creating competing instructions.

Planning objectives
Production customer service has a four-hour recovery time objective and a one-hour recovery point objective. Identity and emergency communication have a four-hour recovery time objective and a 24-hour recovery point objective. Routine support records have an eight-hour recovery time objective and a 24-hour recovery point objective. Finance and People Operations records have a two-business-day recovery time objective and a 24-hour recovery point objective. These are internal planning targets; signed customer commitments may be stricter.

Meaning and dependencies
Recovery time runs from disruption to minimum usable service; recovery point is the maximum targeted age of recoverable data. Neither is a guarantee. IT maps dependencies, including identity, hosting, network, secrets, and suppliers, and ensures prerequisite services can recover early enough to meet dependent service targets.

Ownership
IT maintains technical runbooks, Finance maintains payment alternatives, People Operations maintains worker contact details, and Support maintains customer communication routes. Each critical role has a named deputy in the restricted continuity directory, reviewed quarterly and after staffing changes.

<!-- Page break in the companion PDF -->

## 2. Backup and restoration procedure

Backup design
IT maintains encrypted backups separated from routine production administration and protected against unauthorized alteration. Production data is captured at least hourly; other critical records at least daily. Backups follow a 35-day rolling window. IT monitors job completion daily and treats failed backups that threaten recovery objectives as an incident. Access to backup administration is limited and reviewed monthly.

Restore sequence
The technical lead selects a recovery point based on impact, integrity, and available evidence. Restore foundational identity, network, and secrets services as needed, then production dependencies, customer service, and supporting business records. For compromise, use a clean environment and a verified recovery point; do not restore known malicious configuration simply because it is recent.

Validation and authorization
Verify integrity, permissions, data age, and representative business transactions. Record any lost transaction window and plan reconciliation with the relevant owner. Reapply required deletions and access removals before opening normal use, as DAT-06 requires. The incident commander approves restoration after IT and the business owner report validation results.

Testing
Perform a sample restoration quarterly and a coordinated recovery exercise annually. Include production data, a nonproduction business system, dependency order, and an alternate communication method. Capture actual recovery time and data age against targets. A successful backup job alone does not prove that restoration works.

<!-- Page break in the companion PDF -->

## 3. People continuity, fallback operations, and return

Office or workforce disruption
The COO confirms worker safety and whether approved remote work is viable. Managers account for team availability and redistribute essential duties to trained deputies. People Operations shares only necessary availability information. Workers must not return to an unsafe site to retrieve equipment or records; use replacement equipment through FIN-07 where needed.

Communication fallback
Maintain a restricted, current offline copy of emergency contacts and the provider status URLs. If company email or identity is unavailable, use the approved phone tree and alternate communication channel listed in the continuity directory. Verify participants before sharing sensitive details. Do not move customer datasets into personal accounts to keep work going.

Manual operations
Support keeps a minimal, access-controlled temporary case log with time, customer reference, impact, owner, and follow-up. Finance may queue payment requests but must preserve independent verification and approval. After systems return, reconcile temporary records, check duplicates, and securely delete temporary copies once the canonical records are verified.

Return to normal
The COO authorizes stand-down after the incident commander confirms stable service, business owners reconcile work, and staff know the normal channels. Within five business days, review recovery gaps alongside INC-09's post-incident review. Track corrective actions to verified closure. Retain plans and exercise records for three years under DAT-06 and update runbooks after material system or supplier changes.
