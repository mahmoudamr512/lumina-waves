# Lumina Waves Productions — Internal Operations System

**Design specification**
**Date:** 2026-06-19
**Status:** Approved (brainstorming) — pending implementation plan
**Owner:** Amr Morsy (developer + product owner)

---

## 1. Purpose & scope

Lumina Waves Productions is a music/media production company. This system is its
**internal operations backbone** — it organizes clients, their contracts, annexes,
and the artistic works (المصنفات) Lumina holds rights to, with the company's own
conventions and identity enforced by structure rather than by manual folder discipline.

**Explicitly in scope (this sub-project):**

- Domain model: Clients/Artists → Master Contracts → Annexes → Works, with credits and rights.
- Role-based access control (RBAC).
- Contract/annex **generation** from fill-in-the-blank templates (bilingual PDF output).
- Document **ingest** of scanned legacy/incoming paperwork, with Arabic **OCR**.
- **Full-text Arabic search** over all documents.
- **Soft-delete** with a reversible trash queue and full audit trail.
- **Backup** to Google Drive (human-navigable mirror + rebuildable data).
- Bilingual (Arabic-first / English), mobile-first PWA.
- Transactional email.

**Explicitly out of scope (YAGNI — designed to add later without rework):**

- Any customer/artist-facing portal. This release is internal only.
- Per-client RBAC scoping (a user restricted to specific artists).
- Modular/toggleable clause builder for contracts.
- Multiple Party-2 company entities.
- Rights granularity beyond the coverage checklist (full separable rights-bundle).
- E-signature integration (signing happens on paper).

---

## 2. Domain model

### 2.1 Hierarchy

```
Client / Artist            ── true unique key: National ID (الرقم القومي)
   └── Master Contract      (the negotiated terms)
        └── Annex (#1…#24…) (dated batches that add works over time)
             └── Work (مصنف)(a song, with its credits)
```

- The **Annex is the workhorse**: a single master contract accumulates many numbered,
  dated annexes over years (real example: Annex #24 against a 2018 master).
- A **Work** may exist **unlinked** to any annex, with status **`pending annex`**, and be
  attached when its paperwork is signed. This prevents works from being lost while
  paperwork catches up.
- **Lumina Waves is always Party 2** (الطرف الثاني). Single company entity — no entity table.
- The artist is always **Party 1** (الطرف الأول).

### 2.2 Entities (high level)

**Client / Artist (Party 1)**
- Full legal name, stage name (شهرة), **National ID (الرقم القومي, 14-digit)**, address,
  contact info. National ID is the natural unique key.

**Master Contract**
- Links to one Client. Carries the negotiated terms (see §3 Rights model): grant type,
  territory, term/renewal, financial terms, governing law, the signed PDF, status.

**Annex (ملحق)**
- Belongs to a Master Contract. Number, date, the works table, signed PDF, status.

**Work (مصنف)**
- Title, status (`pending annex` | `linked`), the rights axis it falls under (master /
  publishing / both), and **credits** as distinct typed roles:
  - مؤلف — author / lyricist
  - ملحن — composer
  - موزّع موسيقي — arranger *(NOT distribution — see false-friend note §6)*
  - مؤدّي / مطرب — performer / singer
  - منتج — producer

### 2.3 Rights axis per Work

Egyptian law splits two distinct, separately-owned assets. The model captures, per Work,
which Lumina holds:

- **Master / recording** → `الحقوق المجاورة` (neighboring rights) — held by producing the recording.
- **Publishing / composition** (lyrics + melody) → `حق المؤلف` — held by author + composer,
  licensed/acquired from them.
- **Both.**

---

## 3. Rights model (legally grounded)

Grounded in **Law No. 82 of 2002** (قانون حماية حقوق الملكية الفكرية), Book Three.
The UI is a simple preset picker; the stored data is Article-149-compliant.

### 3.1 Hard legal constraints encoded into the system

1. **Moral rights (الحقوق الأدبية) are perpetual and inalienable** (Arts. 143–145). Even a
   full buyout never acquires attribution/integrity rights. A permanent, non-removable
   system rule states this so Lumina never over-claims.
2. **Article 149 — explicit enumeration.** Every economic right must be listed with
   **scope + territory + duration**; anything unlisted is presumed retained by the artist.
   Hence the coverage checklist (§3.3) is mandatory, not cosmetic.
3. **Article 153 — no whole-future-catalogue buyout** (void). Rights attach to *identified
   works* — which is exactly why the business runs on per-work numbered annexes.
4. **Duration** (informational/reporting): economic copyright = life + **50 years**;
   performers/producers 50 years; broadcasters 20.
5. **Article 151** — a court may re-open *price* (not the deal) if remuneration is unfair.

### 3.2 Grant type (one per contract/annex)

| Plain-language choice | Correct Arabic | Meaning |
|---|---|---|
| Full economic-rights buyout | **تنازل كامل عن الحقوق المالية** | Acquire all economic rights (moral rights stay with author) |
| Exclusive license | **ترخيص حصري** | Sole exploiter; rights revert to artist on expiry |
| Non-exclusive license | **ترخيص غير حصري** | May exploit; so may others |
| Management only | **عقد إدارة** | Administer on artist's behalf; artist keeps everything |

One contract **template** maps to each grant type.

### 3.3 Required structured terms (Art. 149)

- **Territory (النطاق الجغرافي):** Egypt / MENA / Worldwide.
- **Term (المدة):** duration + auto-renew flag + non-renewal notice period
  (real example: 3 years, auto-renew, 90-day notice).
- **Coverage checklist** (the exploitation modes from the real contracts):
  digital/streaming, broadcast, public performance (الأداء العلني),
  sync (المزامنة), RBT (نغمة الانتظار), mechanical, name & image.
- **Financial (where applicable):** revenue share %, minimum payout threshold,
  settlement frequency, audit right. *(Sensitive — see RBAC.)*

---

## 4. RBAC

Five roles. The most sensitive data is **financial terms, National IDs, and the contract
files themselves.**

| Role | Capabilities |
|---|---|
| **Admin** | Full control. **Only role that can purge the delete queue.** |
| **Operations** | CRUD clients/contracts/annexes/works. **Cannot see/edit financial terms.** |
| **Legal** | Full document + rights access. |
| **Finance** | Financial terms & payout data; **read-only** on legal documents. |
| **Viewer** | Read-only; no sensitive fields. |

Every action is recorded in an immutable **audit trail** (who, what, when).

---

## 5. Contract generation

- **Fill-in-the-blank templates**, one per grant type, driven by a **guided wizard**
  (plain-language steps, mobile-first, for non-technical users).
- Filling the contract **populates the structured records** — the document and the database
  are the same source of truth; no double entry.
- **Output:** bilingual, **RTL-correct PDF** including the works table with credits.
- **Lifecycle:**
  `Draft → generate PDF → print & sign (paper) → scan signed copy back in → mark Executed`.
  The **signed scan is the legal version of record**; the generated draft is retained too.

---

## 6. Ingest & search

- **Document arrival is mostly scans/photos** (e.g. CamScanner). Every scanned upload runs
  **Arabic OCR** to extract searchable text. OCR-on-ingest is a first-class pipeline stage.
- **Generated contracts are born-digital** — fully searchable natively, no OCR, and their
  field values are already structured data.
- **Full-text Arabic search** with normalization: alef/hamza variants
  (أ/إ/آ/ا), taa-marbuta (ة/ه), diacritics/tatweel stripped — so legal terms match
  regardless of how they were typed or OCR'd.
- **False-friend guard:** the UI always qualifies **الموزّع** — *arranger* (a credit role,
  الموزّع الموسيقي) vs *digital distributor* (a channel, الموزّع الرقمي). Same root, opposite meaning.

---

## 7. Soft-delete & retention

- **No hard deletes, ever.**
- "Delete" = **soft-delete → 3-day trash queue** (recoverable by Admin).
- After the window, the item is flagged purged but the **record and the Drive-backed file
  are retained** (never physically destroyed).
- **Admin-only** delete/purge. Every delete/restore is in the audit trail.

---

## 8. Backup (day 1)

- A **human-navigable Google Drive mirror** of the document tree — usable with zero app access
  (browse to any signed contract directly).
- In each folder, alongside the PDFs: a tiny machine-readable **`data.json`** plus a
  human-readable **summary sheet**, so the entire system is **rebuildable from Drive alone**.
- Sync only changes; storage cost is negligible.

```
/Lumina Backups/Ahmed Alaa/
   ├── _client-summary.pdf
   ├── data.json
   └── Master Contract 2018/
        └── Annex 24/
             ├── annex-24-signed.pdf
             └── data.json
```

---

## 9. Cross-cutting requirements

- **Bilingual AR/EN, Arabic-first, RTL.** Legal terms use the verified correct Arabic
  (glossary in §11).
- **PWA, mobile-first**, installable, deliberately simple for non-technical users — the
  governing UX tenet: *guided steps over dense forms, big tap targets, plain language.*
- **Transactional email** (delete-queue alerts, notifications, optional contract delivery).

---

## 10. Hosting & operations

- **Dev:** localhost.
- **Prod:** single **Vultr VPS**, self-maintained by the developer.
- **Why Vultr:** DigitalOcean blocks outbound SMTP; the system must send email, so Vultr
  (which permits outbound mail) is the documented choice.

---

## 11. Verified bilingual legal glossary

Source: Law No. 82/2002 (WIPO Lex AR/EN, Arabic statute text), cross-verified.

| Arabic | English | Note |
|---|---|---|
| المصنف (الفني) | Artistic work | Art. 138: original literary/artistic/scientific work |
| ملحق | Annex / appendix | Integral supplement to a contract (schedule of works) |
| الطرف الأول / الطرف الثاني | First / Second party | Party 1 = artist (licensor); Party 2 = Lumina |
| المطرب / المؤدّي / فنان الأداء | Singer / performer | Neighboring-rights holder |
| المؤلف | Author / lyricist | Writer of the lyrics |
| الملحن | Composer | Creator of the melody (اللحن) |
| الموزّع الموسيقي | Arranger | **NOT** distribution (false-friend) |
| الموزّع الرقمي | Digital distributor | Channel/aggregator — opposite meaning |
| المنتج / منتج التسجيلات الصوتية | Producer / phonogram producer | Owns the master recording |
| الحقوق المالية | Economic rights | Transferable (Art. 149) |
| الحقوق الأدبية / المعنوية | Moral rights | Perpetual, inalienable (Art. 143) |
| الحقوق المجاورة | Neighboring rights | Performers, producers, broadcasters |
| حق المؤلف | Copyright / author's right | Moral + economic rights in a work |
| التنازل / نقل الحقوق المالية | Assignment of economic rights | "Full ownership" |
| الترخيص الحصري | Exclusive license | Sole exploiter |
| الترخيص غير الحصري | Non-exclusive license | Others may also be licensed |
| عقد إدارة | Management agreement | Administration only |
| الحق الحصري / الاحتكار | Exclusive right / exclusivity | Sole right to exploit |
| الاستغلال | Exploitation | Reproduction, broadcast, rental, etc. |
| الترخيص | License | Grant of permission to use rights |
| النطاق الجغرافي / الإقليمي | Territory | Territorial scope of the grant |
| مدة العقد | Contract term | Duration in force |
| التجديد التلقائي | Automatic renewal | Auto-renew clause |
| نسبة الإيرادات / العائد | Revenue share | Agreed % split |
| حق التدقيق / المراجعة | Audit right | Right to inspect counterparty books |
| الرقم القومي | National ID | 14-digit Egyptian identity number |
| السجل التجاري | Commercial registry no. | Business-party registration |
| البطاقة الضريبية | Tax card / reg. number | Business-party tax registration |
| الاختصاص القضائي | Jurisdiction | Competent court for disputes |
| حق الأداء العلني | Public performance right | Royalty for public performance; collector: SACERAU |
| حق المزامنة | Synchronization (sync) | Sync to moving images |
| نغمة الانتظار | RBT / ringback tone | Melody the *caller* hears |
| التوزيع الرقمي | Digital distribution | Delivery to streaming/download platforms |

---

## 12. Open items for the implementation plan

- Concrete tech stack (framework, DB, OCR engine, PDF rendering with RTL, search engine).
- Exact "sensitive field" list enforcement at the data layer.
- Drive sync mechanism and `data.json` schema.
- Audit-trail schema.
- Arabic search normalization implementation details.
