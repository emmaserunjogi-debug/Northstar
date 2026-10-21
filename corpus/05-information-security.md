# SEC-05: Information Security and Access Management

**Company:** Northstar Cloud Services (fictional)  
**Owner:** IT Lead  
**Version:** 1.0 | **Effective:** 13 October 2026 | **Review due:** 13 October 2027  
**Classification:** Internal | **Status:** Synthetic example policy

## 1. Accounts, access, and devices

Access principles
Use individual accounts and the least access needed for the approved role. Shared interactive logins are prohibited. Service accounts must have a named owner, defined purpose, approved permissions, and managed secrets. Multifactor authentication is required for email, remote access, administrative tools, and customer-data systems. Privileged and everyday activity must use separate accounts.

Request and approval
The manager opens a Service Desk request identifying the person, application, role, reason, and end date where temporary. The system owner approves the role; IT implements it and records evidence. Production administration also needs IT Lead approval. No one approves their own permissions. Temporary access expires within 30 days unless a fresh approval is recorded.

Device baseline
Company data is handled on managed devices with encryption, screen locking within five minutes, automatic updates, endpoint protection, and remote lock or wipe capability. IT inventories devices and checks compliance before granting access. Personal devices may access only approved low-risk services after an explicit, documented IT review; they may not store Restricted data.

Credential handling
Use the approved password manager and unique credentials. Never send passwords or authentication codes through email or chat. Report unexpected authentication prompts, suspected phishing, or exposed secrets immediately. IT rotates affected credentials and assesses scope through INC-09 rather than merely deleting the message.

<!-- Page break in the companion PDF -->

## 2. Secure use, changes, and vulnerability handling

Approved tools and data
Install software through IT or the approved catalog. New services require FIN-07 review, including security and privacy checks. Do not place customer data, confidential source code, or personal information into public AI tools or unapproved file-sharing services. Approved AI use must follow the specific data permissions recorded for that service, and a person must check outputs before business use.

Technical maintenance
IT prioritizes actively exploited or internet-exposed critical vulnerabilities for mitigation within 24 hours of confirmation. Other critical vulnerabilities are addressed within seven calendar days; high vulnerabilities within 30 days. If a deadline cannot be met, the IT Lead records compensating controls and seeks a GOV-01 exception before expiry. Active exploitation is handled as an incident, not just a maintenance ticket.

Change procedure
Changes to production require an owner, reason, risk assessment, test evidence, rollback plan, and independent approval. SUP-08 defines release communication. An emergency change may proceed with incident commander approval, but the implementer cannot be the sole approver. Record the change immediately and complete independent review within one business day.

Development practices
Keep secrets out of source code, use peer review, scan dependencies, and test with synthetic or de-identified data wherever possible. Production data in a test environment requires the data owner's and Privacy Lead's written approval and equivalent access controls.

<!-- Page break in the companion PDF -->

## 3. Reviews, departures, and security reporting

Periodic assurance
System owners review access quarterly, including privileged, temporary, service, and dormant accounts. The reviewer records each account's owner and business need; unnecessary access is removed within two business days, or immediately where risk is urgent. IT reviews privileged access monthly. A completed review requires removal evidence, not just a signed spreadsheet.

Departure procedure
PPL-03 supplies the authorized cutoff time. IT suspends the identity account, revokes active sessions and tokens, removes application access, rotates shared secrets the person knew, and updates the asset register. Business files transfer only to approved custodians. Do not delete a departing worker's records until DAT-06 retention and hold checks are complete.

Report and contain
Report a lost device, suspicious login, malware alert, data exposure, or accidental external sharing immediately through the emergency Service Desk channel and notify the IT on-call contact. If that channel is unavailable, call the published internal on-call number. Disconnect a suspected compromised device from networks if safe, but do not wipe it, investigate independently, or delete evidence.

Records and metrics
Retain access requests and reviews for one year after closure; retain security logs for 90 days unless attached to an incident or hold. Track overdue vulnerabilities, removal timeliness, device compliance, and repeat exceptions monthly. INC-09 governs incident evidence and DAT-06 governs disposal.
