---
name: careverified-platform-engineering
description: |
  Comprehensive engineering, clinical safety, architectural governance, and operating guidelines for CareVerified (MedCred).
  Use this skill when:
  - Developing, debugging, testing, or refactoring features in the CareVerified (MedCred) codebase.
  - Adding or modifying clinical workflows, consultations, SOAP notes, e-prescriptions, or medical certificates.
  - Interfacing with the SQLite embedded database (`data/careverified.db`) using Node.js native `node:sqlite`.
  - Implementing or verifying Segregation of Duties (SoD), dual-signoff authorization, or Break-Glass emergency access.
  - Handling healthcare statutory compliance under the Malaysian Telemedicine Act 1997, Medical Act 1971, Poisons Act 1952, and PDPA 2010.
  - Designing UI components adhering to the Rose Pine / Crisp White clinical design system and WCAG 2.2 AA accessibility standards.
  - Integrating external hospital EHR webhooks using HMAC-SHA256 signatures and exponential backoff retry dispatch.
---

# CareVerified (MedCred) Engineering & Clinical Skill Guide

This skill provides the authoritative engineering playbook, operational directives, database conventions, and clinical safety guardrails for the **CareVerified (MedCred)** enterprise digital healthcare and clinical workforce platform.

---

## 1. System Topology & Core Tech Stack

- **Frontend Runtime**: React 19 + TypeScript + Vite.
- **Styling Architecture**: Tailwind CSS with custom clinical design tokens (Rose Pine / Medical Crimson, Emerald Verified, Amber Warning).
- **Backend Server**: Node.js 22+ native runtime with Express and TypeScript.
- **Data Persistence**: Node.js native embedded SQLite (`node:sqlite` via `DatabaseSync`), executing with Write-Ahead Logging (`WAL`), strict referential integrity (`PRAGMA foreign_keys = ON`), and concurrency timeout (`PRAGMA busy_timeout = 5000`).
- **Real-Time Communication**: Native WebRTC peer-to-peer audio/video conferencing, DTLS-SRTP encryption, and 15-second client presence heartbeats.
- **Security & Provenance**: scrypt/Argon2id salted password hashing, SHA-256 session token digests, Base32 RFC 6238 TOTP secrets, and HMAC-SHA256 authenticated hospital EHR webhooks.

---

## 2. Mandatory Verification & Clinical Safety Workflows

When working on any module within CareVerified, engineers and agents MUST adhere to the following deterministic workflows:

### 2.1 Telehealth Consultation Workflow
1. **Intake & Escrow Pre-authorization**:
   - Verify that the consultation intake captures patient symptoms and assigns a triage priority.
   - Ensure an authorized payment record (`payments` table with purpose `consult`) is created before the consultation enters the `requested` queue.
2. **WebRTC Signaling & Presence**:
   - Verify that presence heartbeats (`presence` table) update every 15s.
   - Ephemeral WebRTC SDP offers, answers, and ICE candidates must route via `consult_signals`.
3. **Clinical SOAP Documentation & Freeze**:
   - Consultations must conclude with a completed 4-pillar SOAP entry in the `encounters` table (Subjective, Objective, Assessment, Plan).
   - Once marked `completed`, encounters become immutable; subsequent adjustments must be filed as addenda in `audit_log`.

### 2.2 E-Prescribing & Poison Schedules Governance
1. **Practitioner Licensure Check**:
   - Only clinicians with verified MMC Annual Practicing Certificates (APC) can generate electronic prescriptions.
2. **Poisons Act 1952 Guardrails**:
   - **Group B & C Poisons**: Must contain dosage form, strength, quantity, frequency, maximum daily dose, and explicit expiry (<= 90 days).
   - **Schedule 1 Dangerous Drugs**: STRICTLY PROHIBITED in telehealth encounters.
3. **Dispensary Register & Cold-Chain Fulfillment**:
   - Dispensing pharmacies must log records into `pharmacy_poisons_register`.
   - Temperature-sensitive medications (`deliveries`) must validate against `delivery_temperature_logs` (2°C – 8°C). Any excursion must trigger an automatic delivery hold.

### 2.3 Segregation of Duties (SoD) & Disciplinary Actions
1. **Dual-Signoff Workflow**:
   - Disciplinary sanctions (`disciplinary_sanctions`) require independent `initiator_id` and `countersigner_id` (`initiator_id != countersigner_id`).
   - Actions initially stage in `pending_countersign` and appear in the admin queue (`GET /api/admin/sanctions/pending`).
2. **Break-Glass Ephemeral Lease Protocol**:
   - High-acuity emergency overrides grant locked chart access for exactly **15 minutes** (900 seconds).
   - Every break-glass activation requires an urgent clinical justification and logs an immutable audit event (`audit_log`).

### 2.4 Outbound Hospital EHR Webhook Dispatch
1. **HMAC-SHA256 Security Headers**:
   - Webhooks sent to hospital endpoints must include:
     - `X-MedCred-Signature-256`: `sha256=HMAC_SHA256(secret_key, timestamp + "." + payload)`
     - `X-MedCred-Timestamp`: Unix millisecond timestamp
     - `X-MedCred-Delivery-Id`: Unique dispatch UUID
2. **Retry Protocol**:
   - Retries follow exponential backoff (`1m, 5m, 15m, 1h, 6h`) up to 5 attempts, logged in `webhook_dispatch_logs`.

---

## 3. Database & SQL Best Practices

> [!CAUTION]
> - **NEVER** use string concatenation or template literals to build SQL queries.
> - **ALWAYS** use parameterized prepared statements (`?` placeholders).

### 3.1 Connection & Statement Conventions
```typescript
import { getDb } from './db.js';

const db = getDb();

// 1. Single-row retrieval
const user = db.prepare('SELECT id, email, role, status FROM users WHERE id = ?').get(userId);

// 2. Multi-row retrieval
const pendingSanctions = db.prepare(
  "SELECT * FROM disciplinary_sanctions WHERE status = 'pending_countersign' ORDER BY created_at DESC"
).all();

// 3. Mutation inside atomic transactions
const tx = db.prepare('BEGIN IMMEDIATE');
try {
  tx.run();
  db.prepare('UPDATE consults SET status = ?, ended_at = ? WHERE id = ?').run('completed', Date.now(), consultId);
  db.prepare('INSERT INTO audit_log (id, ts, actor_id, actor_role, action, target_type, target_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(crypto.randomUUID(), Date.now(), doctorId, 'doctor', 'complete_consult', 'consult', consultId);
  db.prepare('COMMIT').run();
} catch (err) {
  db.prepare('ROLLBACK').run();
  throw err;
}
```

### 3.2 30-Day Statutory Access Grant Verification
Always enforce patient privacy limits before exposing longitudinal health records:
```typescript
const grant = db.prepare(
  'SELECT id FROM record_grants WHERE patient_id = ? AND grantee_user_id = ? AND expires_at > ?'
).get(patientId, granteeUserId, Date.now());

if (!grant) {
  throw new Error('Access denied: Active statutory clinical grant required (max 30 days).');
}
```

---

## 4. UI/UX Design System & Accessibility Rules

### 4.1 Color Hierarchy & Tokens
| Semantic Role | Token Class | Hex Value | Usage |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `bg-slate-50` / `bg-white` | `#F8FAFC` / `#FFFFFF` | Core application surfaces. Dark/dingy grays prohibited. |
| **Primary Brand Accent** | `bg-rose-600` / `text-rose-600` | `#E11D48` | Primary CTA buttons, active tab indicators, brand badges. |
| **Clinical Verified** | `bg-emerald-500` / `text-emerald-700` | `#10B981` / `#047857` | Verified APC badges, successful dispensation, active sessions. |
| **Clinical Warning** | `bg-amber-500` / `text-amber-700` | `#F59E0B` / `#B45309` | Triage priority medium, expiring licenses, pending dual-signoff. |
| **Emergency / High-Acuity** | `bg-red-600` / `text-red-600` | `#DC2626` | SOS triggers, cold-chain temperature excursion alerts, revoked licenses. |

### 4.2 Accessibility (WCAG 2.2 AA)
- **Contrast**: Minimum 4.5:1 text-to-background contrast ratio (3:1 for large text >= 18pt).
- **Touch Targets**: All clickable buttons, inputs, and toggles must be at least `44px × 44px`.
- **Keyboard Trapping & Focus Rings**: Modal dialogs must trap focus and release on Escape. Inputs must use clear focus rings (`focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500`).

---

## 5. Development, Testing & Verification Commands

### 5.1 Clean Build Verification
Before committing or deploying, verify that the TypeScript compiler and Vite asset bundler exit with 0 errors:
```bash
npm run build
```

### 5.2 Development Server
The development server boots Vite frontend and Express backend concurrently:
```bash
npm run dev
```

### 5.3 Git Hygiene
- Ensure all markdown specifications (`PRD.md`, `ARCHITECTURE.md`, `DESIGN.md`, `DATABASE.md`, `RULE.md`, `SKILL.md`) are kept synchronized with codebase reality.
- Maintain atomic Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`).
