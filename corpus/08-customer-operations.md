# SUP-08: Customer Support and Production Change Procedures

**Company:** Northstar Cloud Services (fictional)  
**Owner:** Support Lead  
**Version:** 1.0 | **Effective:** 13 October 2026 | **Review due:** 13 October 2027  
**Classification:** Internal | **Status:** Synthetic example policy

## 1. Intake, verification, and service priorities

Support coverage
Routine support operates during GOV-01 business hours. Emergency production incidents are routed to IT on-call at all times. Signed customer commitments take precedence over the internal targets below; Support records any different contract targets on the customer account. Response means a human acknowledgment with an owner and next step, not resolution.

Case intake
Record the customer, verified contact, affected service, symptoms, start time, business impact, safe reproduction steps, and related incident references. Verify authority before discussing account details or changing access. Never request passwords or unrestricted database exports. Restrict attachments containing personal or Confidential information under DAT-06.

Priority targets
P1 is widespread production unavailability or suspected severe data/security impact: acknowledge within 30 elapsed minutes and invoke INC-09 immediately. P2 is major degradation or a blocked customer with no workaround: acknowledge within four business hours. P3 is limited impact with a workaround: acknowledge within one business day. P4 is a question or enhancement: acknowledge within two business days. Reassess priority whenever impact changes.

Ownership
The first assigned agent remains accountable until another owner explicitly accepts handover. Routing a ticket does not discharge responsibility. Support may lower priority only with a recorded impact assessment; a possible security issue must first be assessed by IT.

<!-- Page break in the companion PDF -->

## 2. Diagnosis, escalation, and communication

Safe diagnosis
Check the service status and known issues, reproduce in a safe environment, and use approved read-only diagnostics before requesting changes. Obtain customer permission and appropriate internal approval before accessing customer content. Record commands or actions that could affect data. Production modifications must follow SEC-05 and the change procedure on the next page.

Escalation triggers
Escalate immediately for suspected data exposure, safety concerns, widespread outage, or risk of irreversible loss. Escalate P2 cases to the Support Lead if no diagnostic path exists after four business hours. Involve the account owner when a contractual milestone or relationship is at risk. INC-09 assigns incident severity independently of the support ticket priority.

Customer updates
For P1 incidents, use the incident commander's approved updates at least hourly. For P2 cases, update at least every business day; for P3 and P4, agree the next update with the customer. State verified facts, impact, current action, workaround if safe, and the next update time. Avoid unsupported recovery promises or speculation about fault.

Resolution and closure
Record the cause when known, action taken, validation, and any follow-up work. Ask the customer to confirm restoration. If no response arrives, send a reminder after three business days and close after another two, except for unresolved security or privacy issues. Reopen linked recurring issues rather than erasing prior history.

<!-- Page break in the companion PDF -->

## 3. Production releases and knowledge management

Change preparation
The change owner records scope, systems, customer impact, test results, risk, maintenance window, rollback criteria, and responsible implementer. An independent authorized reviewer approves before deployment. High-impact changes need IT Lead and Support Lead approval. Notify affected customers at least two business days before planned disruption unless a signed agreement requires longer.

Deployment and validation
Confirm monitoring, backups where relevant, on-call coverage, and an executable rollback plan. The implementer records start time, release identifier, and actions. Validate core workflows, error rate, and customer impact against the approved plan. If rollback criteria are reached, stop and restore the prior state or invoke INC-09 if safe rollback is unavailable. Record results before closing the change.

Emergency changes
INC-09's incident commander may authorize urgent remediation with independent approval as required by SEC-05. Record why normal lead time could not be met. Complete retrospective review within one business day, including whether the emergency introduced further risk and whether customer communication needs correction.

Learning and records
Turn recurring solutions into reviewed knowledge articles that omit customer identifiers and secrets. Assign each article an owner and review it every six months. Retain support tickets for two years after closure. Retain production change evidence with operational incident records for three years after closure, using DAT-06's incident category. Track response timeliness, reopen rates, and failed changes monthly.
