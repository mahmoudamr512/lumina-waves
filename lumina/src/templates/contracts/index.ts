import { layout, escapeHtml } from './_layout'
import { GRANT_TYPES, MORAL_RIGHTS_NOTE, type CoverageMode } from '@/lib/rights'
import { letterheadHtml, signatureBlockHtml, BRANDING_CSS, COMPANY } from './branding'
import { egpInWords } from '@/lib/tafqeet'

// ── Coverage paragraph blocks ────────────────────────────────────────────────
// The granting clause of both SALE and DISTRIBUTION contracts describes the
// exploitation scope through one or both of these two blocks. Which one appears
// is driven by CoverageMode. Free-text `exclusions` are appended as
// «باستثناء …» so specific platforms (e.g. «TikTok، Spotify») are surgically
// removed from the granted scope.

/**
 * The RBT (phone-side) items and the DIGITAL (internet + broadcast) items are
 * stored as discrete strings so the exclusions clause can surgically REMOVE any
 * item the caller lists in `exclusions` from the paragraph — otherwise «باستثناء
 * Spotify» would appear alongside Spotify still being in the platform list.
 */
const COVERAGE_RBT_ITEMS: readonly string[] = [
  'شبكات الاتصالات والهاتف الأرضي والمحمول',
  'خدمات التفاعل الصوتي عبر الهاتف',
  'خدمات القيمة المضافة',
  'الرسائل القصيرة',
  'الاستماع والمشاهدة',
  'كرنّات',
  'تحميل الملف الصوتي كاملًا (Full Track Download)',
  'خدمة نغمة الانتظار (RBT / خدمة الكول تون)',
]

const COVERAGE_DIGITAL_ITEMS: readonly string[] = [
  'شبكة المعلومات الدولية (الإنترنت)',
  'المتاجر الافتراضية العالمية',
  'YouTube',
  'YouTube Music',
  'Facebook',
  'Instagram',
  'TikTok',
  'Anghami',
  'Spotify',
  'وسائل النقل والدوائر الإذاعية المغلقة',
  'القنوات الفضائية',
  'الإذاعات بأنواعها',
]

/** Legal catch-all appended after the enumerated platforms. */
const FUTURE_TECH_AR = 'وما يستحدث منها مستقبلًا بأي مسمى أو صورة كانت'

/** Case-insensitive substring test that also handles Arabic normalization loosely. */
function matchesExclusion(item: string, exclusion: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase()
  const i = norm(item)
  const e = norm(exclusion)
  return e.length > 1 && (i.includes(e) || e.includes(i))
}

/** Compose the mode-aware coverage paragraph and surgically drop excluded items. */
export function coverageParagraph(mode: CoverageMode, exclusions: readonly string[] = []): string {
  const trimmedExclusions = exclusions.map((e) => e.trim()).filter(Boolean)
  const filter = (items: readonly string[]) =>
    items.filter((it) => !trimmedExclusions.some((ex) => matchesExclusion(it, ex)))

  const parts: string[] = []
  if (mode === 'RBT_ONLY' || mode === 'RBT_AND_DIGITAL') parts.push(filter(COVERAGE_RBT_ITEMS).join('، '))
  if (mode === 'DIGITAL_ONLY' || mode === 'RBT_AND_DIGITAL') parts.push(filter(COVERAGE_DIGITAL_ITEMS).join('، '))
  const platformBlock = parts.filter(Boolean).join('، و')

  const safeExclusions = trimmedExclusions.map(escapeHtml)
  const exclusionsClause = safeExclusions.length ? `، باستثناء: ${safeExclusions.join('، و')}` : ''

  return `${platformBlock}، ${FUTURE_TECH_AR}${exclusionsClause}`
}

export type ContractData = {
  party1Name: string
  party1NationalId: string
  /** Artist stage/known name (اسم الشهرة), if any. */
  party1StageName?: string
  party1Address?: string
  party1Email?: string
  territory: string
  termMonths: number
  /** Which coverage-paragraph block to render in the granting clause. */
  coverageMode: CoverageMode
  /** Free-text items to exclude from the granted coverage (rendered as «باستثناء …»). */
  coverageExclusions?: string[]
  /** Artist's revenue share, percent (e.g. 70). */
  revenueSharePct?: number
  /** Minimum payout threshold in USD before settlement (e.g. 350) — optional. */
  minPayoutUsd?: number
  /** Legal payout-condition wording (overrides the default documents-received clause). */
  payoutConditionAr?: string
  /** Settlement cadence in Arabic (e.g. "نصف سنوية"). */
  settlementFreqAr?: string
  /** Renewal notice period in days (e.g. 90). */
  noticeDays?: number
  /** City where the contract is executed. */
  city?: string
  /** Execution date, pre-formatted Arabic string (e.g. "الأحد 12 سبتمبر 2025"). */
  contractDateAr?: string
  /** Registration/authentication number printed on the seal. */
  regNo?: string
  /** Lump-sum buyout amount in EGP, for a sale & assignment (SALE). */
  buyoutAmountEgp?: number
  /** Optional Arabic words form of the buyout amount (e.g. "عشرة آلاف جنيه"). */
  buyoutAmountWords?: string
  /** Works being sold/assigned, listed in the consideration clause of a sale contract. */
  works?: { titleAr: string; performer?: string }[]
  /** Optional 2-column headers for the SALE Article-3 works table (from Excel). */
  worksHeaders?: string[]
  /** Optional raw Excel grid — when present, SALE Art.3 renders THIS as the
   * works table verbatim (any number of columns), not the derived works pair. */
  worksTable?: { headers: string[]; rows: string[][] }
}

export type Work = {
  titleAr: string
  singer: string
  composer: string
  lyricist: string
  arranger: string
}

export type AnnexData = {
  /** Annex sequence number. */
  number: number
  /** Date the master contract was signed, Arabic string. */
  masterDateAr: string
  /** Annex execution date, Arabic string. */
  annexDateAr: string
  party1Name: string
  party1StageName?: string
  party1NationalId: string
  party1Address?: string
  works: Work[]
  /** Optional custom headers for the works table (typically from Excel upload). */
  worksHeaders?: string[]
  /** Optional raw Excel grid — when present, PDFs render THIS as the works
   * table verbatim (arbitrary columns), not the derived Work rows. */
  worksTable?: { headers: string[]; rows: string[][] }
  regNo?: string
}

const TERRITORY_AR: Record<string, string> = {
  EGYPT: 'جمهورية مصر العربية',
  WORLDWIDE: 'جمهورية مصر العربية وجميع أنحاء العالم',
}

// In an RTL paragraph, ASCII parentheses are bidi-mirrored and break around
// numbers/Latin (e.g. "(24)" renders as ")24("). Wrapping each parenthetical in
// an LTR isolate (U+2066 … U+2069) makes the parens render conventionally while
// the Arabic inside still flows RTL. Applied only to text bodies — never to the
// embedded SVGs (which contain url(...) etc.).
function fixParens(html: string): string {
  return html.replace(/\(([^()]*)\)/g, '⁦($1)⁩')
}

// Grant nature phrasing used in the granting clause, per grant type.
const GRANT_NATURE_AR: Record<keyof typeof GRANT_TYPES, string> = {
  SALE: 'التنازل الكامل والنهائي عن كافة الحقوق المالية',
  DISTRIBUTION: 'الحق الحصري في الاستغلال والتوزيع',
}

const YEAR_WORDS: Record<number, string> = {
  1: 'سنة واحدة',
  2: 'سنتين',
  3: 'ثلاث سنوات',
  4: 'أربع سنوات',
  5: 'خمس سنوات',
  6: 'ست سنوات',
  7: 'سبع سنوات',
  8: 'ثماني سنوات',
  9: 'تسع سنوات',
  10: 'عشر سنوات',
}

function termPhrase(months: number): string {
  if (months % 12 === 0 && YEAR_WORDS[months / 12]) return YEAR_WORDS[months / 12]
  return `${months} شهرًا`
}

const ORDINALS = [
  'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس',
  'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر',
]

function clause(index: number, title: string, body: string): string {
  const heading = title ? `البند ${ORDINALS[index]} (${title})` : `البند ${ORDINALS[index]}`
  return `<section class="lw-clause"><h2 class="lw-clause-title">${heading}</h2><div class="lw-clause-body">${body}</div></section>`
}

/**
 * Full bilingual (Arabic) master contract — "عقد إدارة واستغلال مصنفات فنية" —
 * modelled on the production contracts Lumina Waves uses: an intro identifying
 * both parties, a preamble (تمهيد), and the numbered clauses (البند الأول …).
 * Adds two system-mandated protections beyond the base template: the explicit
 * Article-149 coverage list and the permanent moral-rights clause.
 */
export function renderContract(
  grantType: keyof typeof GRANT_TYPES,
  d: ContractData,
  opts: { withSeal?: boolean } = {},
): string {
  const { withSeal = true } = opts
  // Caller-supplied values are escaped; the Arabic legal boilerplate and the
  // constants from @/lib/rights are our own trusted data.
  const name = escapeHtml(d.party1Name)
  const stage = d.party1StageName ? ` وشهرته (${escapeHtml(d.party1StageName)})` : ''
  const nid = escapeHtml(d.party1NationalId)
  const addr = escapeHtml(d.party1Address ?? '—')
  const email = escapeHtml(d.party1Email ?? '..............................')
  const city = escapeHtml(d.city ?? 'القاهرة')
  const dateAr = escapeHtml(d.contractDateAr ?? '____ / ____ / ٢٠__')
  const territory = TERRITORY_AR[d.territory] ?? escapeHtml(d.territory)
  const term = termPhrase(d.termMonths)
  const pct = d.revenueSharePct ?? 70
  const freq = d.settlementFreqAr ?? 'نصف سنوية'
  const notice = d.noticeDays ?? 90
  // Payout condition: settlement happens only after Lumina receives and verifies
  // all financial documents/reports from the distributors for the period.
  const payoutCondition =
    d.payoutConditionAr ??
    `وتُسدَّد مستحقات الطرف الأول بموجب تحويل بنكي إلى الحساب الموضّح بهذا العقد بعد ورود كافة التقارير والمستندات المالية من شركات ومنصات التوزيع عن الفترة محل المحاسبة وتحقُّق الطرف الثاني من صحتها واكتمالها`
  const grantLabel = GRANT_TYPES[grantType].ar
  const grantNature = GRANT_NATURE_AR[grantType]

  const coverageBlock = coverageParagraph(d.coverageMode, d.coverageExclusions)

  const intro = `
    <p class="lw-intro">أنه في يوم <strong>${dateAr}</strong> تحرر هذا العقد بمدينة <strong>${city}</strong> بين كل من:</p>
    <p><strong>أولًا:</strong> السيد/ ${name}${stage}، ويحمل بطاقة رقم قومي ${nid}، المقيم في: ${addr}، بصفته مالك حقوق الاستغلال المالي والتجاري لمجموعة من المصنفات الفنية. <strong>(ويشار إليه بالطرف الأول)</strong></p>
    <p><strong>ثانيًا:</strong> السادة/ ${escapeHtml(COMPANY.nameAr)} — ${escapeHtml(COMPANY.legalDescAr)}، ومقرها ${escapeHtml(COMPANY.addressAr)}. <strong>(ويشار إليها بالطرف الثاني)</strong></p>`

  // ── Sale & assignment (عقد بيع وتنازل) — SALE: a one-time lump-sum
  // buyout of full economic rights, no term, no revenue share. Inherits the
  // letterhead, seal, footer and parenthesis fix like every contract.
  if (grantType === 'SALE') {
    const amount = d.buyoutAmountEgp != null ? d.buyoutAmountEgp.toLocaleString('en-US') : '____'
    // Auto-generate the amount-in-words (تفقيط) from the figure when not supplied.
    const wordsText = d.buyoutAmountWords ?? (d.buyoutAmountEgp != null ? egpInWords(d.buyoutAmountEgp) : '')
    const words = wordsText ? ` (${escapeHtml(wordsText)} فقط لا غير)` : ' (فقط لا غير)'
    // If an Excel was uploaded, render its raw grid verbatim (arbitrary
    // Prefer the Excel grid verbatim. If no Excel, fall back to a HEADERLESS
    // derived table (performer + title) so the works still render — but never
    // with invented column names. If neither, use the boilerplate line.
    let worksTable: string
    if (d.worksTable && d.worksTable.rows.length) {
      const bodyRows = d.worksTable.rows
        .map((row) => `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
        .join('')
      const thead = d.worksTable.headers.length
        ? `<thead><tr>${d.worksTable.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>`
        : ''
      worksTable = `<table>${thead}<tbody>${bodyRows}</tbody></table>`
    } else if ((d.works ?? []).length) {
      const bodyRows = (d.works ?? [])
        .map((w) => `<tr><td>${escapeHtml(w.performer ?? d.party1StageName ?? d.party1Name)}</td><td>${escapeHtml(w.titleAr)}</td></tr>`)
        .join('')
      worksTable = `<table><tbody>${bodyRows}</tbody></table>`
    } else {
      worksTable = `<p>وذلك عن كافة المصنفات الفنية المبيّنة تفصيلًا في ملاحق هذا العقد.</p>`
    }

    const saleTamheed = `<section class="lw-clause"><h2 class="lw-clause-title">تمهيد</h2><div class="lw-clause-body">
      <p>الطرف الأول فنان وله نشاط فني، وقد قدّم نفسه على أنه حاصل على كافة حقوق استغلال المصنفات الفنية التي ستُذكر تفصيلًا في هذا العقد وملاحقه. وحيث إن الطرف الثاني قد أبدى رغبته في <strong>شراء وتملّك</strong> كامل الحقوق المالية وحقوق الاستغلال الحصري والأداء الصوتي للمصنفات المؤداة بصوت الطرف الأول والمذكورة حصرًا في هذا العقد، فقد اتفق وتراضى الطرفان — بعد أن أقرّ كل منهما بأهليته القانونية للتعاقد وخلوّ إرادته من كافة عيوب الرضا — على ما يلي:</p>
    </div></section>`

    const saleClauses = [
      clause(0, '', `<p>يُعتبر التمهيد السابق جزءًا لا يتجزأ من هذا العقد ومتممًا له ولأحكامه، ولا يُفسَّر بدونه.</p>`),
      clause(1, '', `
        <p>تنازل الطرف الأول للطرف الثاني تنازلًا نهائيًا وباتًّا — بموجب هذا العقد — عن كامل الحقوق المالية وحقوق الاستغلال الحصري في <strong>${territory}</strong> لكافة المصنفات الفنية المذكورة بهذا العقد وما يعود لها من تصوير وصور المؤدّي لها، بكافة طرق الاستغلال ووسائله المنصوص عليها في القانون رقم ٨٢ لسنة ٢٠٠٢ بشأن حماية حقوق الملكية الفكرية، المتاحة حاليًا أو ما يستجدّ مستقبلًا، ومنها على سبيل المثال لا الحصر: ${coverageBlock}. ويصبح للطرف الثاني وحده الحق الاستئثاري في استغلال هذه المصنفات والترخيص بها أو المنع منها بأي وجه من الوجوه ودون حدّ زمني.</p>`),
      clause(2, '', `
        <p>مقابل الحقوق المتنازَل عنها من الطرف الأول للطرف الثاني في البند السابق، يقوم الطرف الثاني بتسليم الطرف الأول مبلغًا وقدره <strong>${amount} جنيه مصري</strong>${words} عن المصنفات التالية:</p>
        ${worksTable}
        <p>ويُعتبر هذا المبلغ المدفوع <strong>نهائيًا وغير قابل للاسترداد</strong> مقابل كامل حقوق الاستغلال المتنازَل عنها حاليًا ومستقبلًا، ولا يستحقّ الطرف الأول أي مقابل أو نسبة أخرى عن هذه المصنفات بعد ذلك.</p>`),
      clause(3, '', `<p>يتعهّد الطرف الأول بأنه يمتلك كافة حقوق استغلال المصنفات المذكورة بهذا العقد وملاحقه، وبأنه يملك الحق في التنازل عنها للطرف الثاني، ويتحمّل وحده المسؤولية الكاملة أمام أي طرف ثالث قد يدّعي أي حقوق على تلك المصنفات بما فيهم المؤدّون، بحيث لا يكون الطرف الثاني مسؤولًا عن أية قضايا أو منازعات تُقام على الطرف الأول لأسباب تتعلق بمنحه للطرف الثاني الحقوقَ الواردة بهذا العقد، ويتحمل الطرف الأول المسؤولية كاملةً عن كل ما يتعلق بمضمون أو محتوى أو ملكية تلك المصنفات.</p>`),
      clause(4, 'المراسلات والإعلانات', `
        <p>تتم الإخطارات والإنذارات والإعلانات الرسمية عن طريق التسليم باليد أو بموجب إنذار على يد محضر على العنوان المذكور بصدر هذا العقد، أو عبر البريد الإلكتروني الذي يُعدّ وسيلة قانونية ملزمة ومنتجة لجميع آثاره القانونية.</p>
        <p>(١) البريد الإلكتروني الرسمي للطرف الأول: <strong>${email}</strong></p>
        <p>(٢) البريد الإلكتروني الرسمي للطرف الثاني: <strong>${escapeHtml(COMPANY.email)}</strong></p>
        <p>ويُقرّ كلا الطرفين بأن البريد الإلكتروني الرسمي الخاص بكلٍّ منهما سيظل تحت سيطرته الكاملة وحيازته ومسؤوليته الشخصية طوال مدة سريان هذا العقد.</p>`),
      clause(5, 'الحقوق الأدبية', `<p style="font-weight:700">${MORAL_RIGHTS_NOTE.ar}</p>`),
      clause(6, '', `<p>يخضع هذا العقد لأحكام القوانين المعمول بها في جمهورية مصر العربية، وتختصّ محاكم القاهرة الكبرى وحدها بكافة درجاتها بالنظر في أي نزاع قد ينشأ بشأن تطبيق أو تنفيذ أو تفسير هذا العقد.</p>`),
      clause(7, '', `<p>حُرِّر هذا العقد من نسختين أصليتين بيد كل طرف نسخة للعمل بها عند الحاجة.</p>`),
    ].join('')

    const saleBody = `${fixParens(`${intro}${saleTamheed}${saleClauses}`)}${signatureBlockHtml({ party1Label: d.party1StageName ?? d.party1Name, regNo: d.regNo, withSeal })}`
    return layout({
      titleAr: 'عقد بيع وتنازل عن مصنفات فنية',
      bodyHtml: saleBody,
      letterhead: letterheadHtml(),
      footer: footerHtml(),
      extraCss: BRANDING_CSS,
    })
  }

  const tamheed = `<section class="lw-clause"><h2 class="lw-clause-title">تمهيد</h2><div class="lw-clause-body">
    <p>الطرف الأول يمتلك كافة حقوق استغلال مصنفات فنية متعددة، وحيث إن الطرف الثاني من الشركات المتخصصة في مجال تسويق وإدارة وتقديم خدمات المواد الإعلامية والترفيهية والمعلوماتية وإنشاء قواعد البيانات وتطوير البرمجيات، ويعمل في مجال تقديم الخدمات الرقمية للمصنفات الفنية وخدمات القيمة المضافة باستخدام الخطوط الأرضية والمحمولة، ولما رغب الطرفان في التعاون فيما بينهما فقد اتفقا وتراضيا — بعد أن أقرّ كل منهما بأهليته القانونية للتعاقد وخلوّ إرادته من كافة عيوب الرضا — على ما يلي:</p>
  </div></section>`

  const clauses = [
    clause(0, '', `<p>يُعتبر التمهيد السابق وأيٌّ من ملاحق هذا العقد جزءًا لا يتجزأ من هذا العقد ومتممًا له ولأحكامه، ولا يُفسَّر بدونه.</p>`),
    clause(1, '', `
      <p>منح الطرف الأول الطرفَ الثاني <strong>${grantNature}</strong> (${grantLabel}) في <strong>${territory}</strong> في استغلال والترخيص باستغلال المصنفات الفنية المذكورة في ملاحق هذا العقد، وكلماتها وألحانها والمقاطع الخاصة بها والتصوير العائد لها وصور المؤدّين لها، بكافة طرق الاستغلال ووسائله المنصوص عليها في القانون رقم ٨٢ لسنة ٢٠٠٢ بشأن حماية حقوق الملكية الفكرية، وكافة وسائل وطرق الاستغلال المالي والتوزيع الرقمي المتاحة حاليًا أو التي قد تظهر مستقبلًا، أيًّا كان نوع التسجيل أو التوزيع لهذه المصنفات، وسواء كان هذا التسجيل صوتيًا أو صوتيًا مرئيًا، ومنها على سبيل المثال لا الحصر: ${coverageBlock}.</p>
      <p>ويشمل الاستغلال — بما لا يخالف نطاق التغطية المذكور أعلاه — النشرَ وإعادة النشر والمزامنة والنسخ والبث الإذاعي وإعادة البث والأداء العلني والتوصيل العلني والطبع الميكانيكي والتوزيع وإعادة التوزيع، وللطرف الثاني الحق في استغلال اسم وصورة المؤدّين، وله الحق الاستئثاري في الترخيص أو المنع لأي استغلال لهذه المصنفات بأي وجه من الوجوه طوال مدة سريان العقد.</p>`),
    clause(2, '', `<p>مقابل الحقوق الممنوحة من الطرف الأول للطرف الثاني في البند السابق، يقوم الطرف الثاني بإعطاء الطرف الأول نسبة تعادل <strong>${pct}٪</strong> من صافي الدخل بعد خصم حصة شركات تقديم الخدمات وأي مصاريف حكومية وغيرها — إن وُجدت — من العائدات النقدية المحققة والمحصَّلة من تقديم خدمات العقد، على أن تتم المحاسبة بصفة <strong>${escapeHtml(freq)}</strong>، ${payoutCondition}. ويتم احتساب حصة الطرف الأول بناءً على التقارير الواردة من شركات تقديم خدمات التوزيع، ويحق للطرف الأول مراجعة الحسابات والإيرادات خلال أيام العمل الرسمية للطرف الثاني — شرط الإخطار المسبق بثلاثين يومًا — مرةً واحدةً سنويًا.</p>`),
    clause(3, '', `<p>من المتفق عليه أن كل طرف مسؤول عن الضرائب التي تستحق عليه نتيجة تنفيذ هذا العقد حاليًا أو مستقبلًا.</p>`),
    clause(4, '', `<p>يقر الطرف الأول بأنه يمتلك كافة الحقوق اللازمة لاستغلال كافة المصنفات الممنوح حقوق استغلالها للطرف الثاني بموجب هذا العقد، وبأنه يملك الحق في ترخيص تلك الحقوق للطرف الثاني، وبكامل مسؤوليته أمام أي طرف ثالث قد يدّعي أي حقوق على تلك المصنفات بما فيهم المؤلفون والملحنون والمؤدّون، بحيث لا يكون الطرف الثاني مسؤولًا عن أية قضايا أو منازعات تُقام على الطرف الأول لأسباب تتعلق بمنحه للطرف الثاني الحقوقَ الواردة بهذا العقد، ويتحمل الطرف الأول المسؤولية كاملةً في كل قضايا أو منازعات تتعلق بمضمون أو محتوى أو ملكية تلك المصنفات.</p>`),
    clause(5, '', `<p>يلتزم الطرف الثاني — في حالة حدوث نزاع حول ملكية أيٍّ من المصنفات محل التعاقد من قِبَل أي طرف ثالث — بأن يخطر الطرف الأول بذلك، ويتم إيقاف التعامل المالي على المصنفات محل النزاع لحين حل الخلاف بين الأطراف المعنية. ويلتزم الطرف الأول بتوفير المستندات والأدلة اللازمة لإثبات امتلاكه حقوق استغلال هذه المصنفات بمجرد طلبها في مدة أقصاها ثلاثة أيام عمل من تاريخ الإخطار، وفي حالة امتناعه يُعدّ ذلك إقرارًا منه بعدم امتلاكه تلك الحقوق وإخلالًا كليًا بالتزاماته، ويحق للطرف الثاني فسخ التعاقد بالإرادة المنفردة. ولا يُخلّ ما تقدم بحق الطرف الأول في الحصول على حصته من أي إيرادات حُصِّلت فعلًا.</p>`),
    clause(6, '', `<p>مدة هذا العقد تبدأ من تاريخ توقيعه وتستمر لمدة <strong>${term}</strong> تتجدد تلقائيًا ما لم يُخطر أحد الطرفين الطرفَ الآخر بمدة لا تقل عن <strong>${notice} يومًا</strong> برغبته في عدم التجديد قبل انتهاء المدة الأصلية أو أي مدة مجددة.</p>`),
    clause(7, 'المراسلات والإعلانات', `
      <p>تتم الإخطارات وتقارير الحسابات والإنذارات والإعلانات الرسمية عن طريق التسليم باليد أو بموجب إنذار على يد محضر على العنوان المذكور بصدر هذا العقد، أو عبر البريد الإلكتروني الذي يُعدّ وسيلة قانونية ملزمة للإخطار ومنتجة لجميع آثاره القانونية.</p>
      <p>(١) البريد الإلكتروني الرسمي للطرف الأول: <strong>${email}</strong></p>
      <p>(٢) البريد الإلكتروني الرسمي للطرف الثاني: <strong>${escapeHtml(COMPANY.email)}</strong></p>
      <p>ويُقرّ كلا الطرفين بأن البريد الإلكتروني الرسمي الخاص بكلٍّ منهما سيظل تحت سيطرته الكاملة وحيازته ومسؤوليته الشخصية طوال مدة سريان هذا العقد. ويلتزم كل طرف بإخطار الآخر كتابةً بأي تغيير في بيانات الاتصال خلال مدة لا تتجاوز سبعة (٧) أيام عمل من تاريخ التغيير، وإلا ظلت الإخطارات على البيانات المبينة أعلاه منتجة لآثارها القانونية.</p>`),
    // System-mandated moral-rights protection (Egyptian Law 82/2002, Art. 143).
    clause(8, 'الحقوق الأدبية', `<p style="font-weight:700">${MORAL_RIGHTS_NOTE.ar}</p>`),
    clause(9, '', `<p>يخضع هذا العقد لأحكام القوانين المعمول بها في جمهورية مصر العربية، ويكون الاختصاص القضائي منعقدًا حصريًا لمحاكم جمهورية مصر العربية بكافة درجاتها وأنواعها دون غيرها، للفصل في أي نزاع ينشأ بشأن تطبيق أو تنفيذ أو تفسير هذا العقد.</p>`),
    clause(10, '', `<p>حُرِّر هذا العقد من نسختين أصليتين بيد كل طرف نسخة للعمل بها عند الحاجة.</p>`),
  ].join('')

  // fixParens only the text body; the signature block carries SVGs (url(...)).
  const body = `${fixParens(`${intro}${tamheed}${clauses}`)}${signatureBlockHtml({ party1Label: d.party1StageName ?? d.party1Name, regNo: d.regNo, withSeal })}`
  return layout({
    titleAr: 'عقد إدارة واستغلال مصنفات فنية',
    bodyHtml: body,
    letterhead: letterheadHtml(),
    footer: footerHtml(),
    extraCss: BRANDING_CSS,
  })
}

/** Full annex (ملحق) listing newly-covered works under an existing master contract. */
/**
 * The tafweed («تفويض واقرار») is a standalone authorization/attestation the
 * artist signs alongside each DISTRIBUTION annex — it delegates exclusive
 * exploitation rights over the annex's works to Lumina Waves and asserts full
 * ownership of those rights. It shares the annex's data (party, works, master
 * contract date) but adds a mode-aware coverage sentence.
 */
export type TafweedData = AnnexData & {
  /** Which coverage-paragraph block to include in the tafweed clause. */
  coverageMode: CoverageMode
  /** Free-text items to exclude, rendered as «باستثناء …». */
  coverageExclusions?: string[]
}

/** Default column headers for the works table when the caller didn't supply custom ones. */
const DEFAULT_WORKS_HEADERS = ['الأغنية', 'المطرب', 'المؤلف', 'الملحن', 'الموزع']

/** Render the works table.
 *
 * Precedence:
 *   1. If `rawTable` is supplied (from an uploaded Excel), render its grid
 *      verbatim — any number of columns, headers used as-is.
 *   2. Otherwise fall back to the derived 5-column Work layout, optionally
 *      overriding the column names with `headers`.
 */
function worksTableHtml(
  works: Work[],
  headers: readonly string[] = [],
  rawTable?: { headers: string[]; rows: string[][] },
): string {
  if (rawTable && rawTable.rows.length) {
    const cols = rawTable.headers.length ? rawTable.headers : DEFAULT_WORKS_HEADERS
    const headerRow = cols.map((h) => `<th>${escapeHtml(h)}</th>`).join('')
    const bodyRows = rawTable.rows
      .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
      .join('')
    return `<table>
      <thead><tr>${headerRow}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>`
  }
  const cols = headers.length ? headers : DEFAULT_WORKS_HEADERS
  const rows = works
    .map(
      (w) =>
        `<tr><td>${escapeHtml(w.titleAr)}</td><td>${escapeHtml(w.singer)}</td><td>${escapeHtml(w.lyricist)}</td><td>${escapeHtml(w.composer)}</td><td>${escapeHtml(w.arranger)}</td></tr>`,
    )
    .join('')
  const headerRow = cols.map((h) => `<th>${escapeHtml(h)}</th>`).join('')
  return `<table>
    <thead><tr>${headerRow}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`
}

/** The annex body HTML, factored out so `renderAnnexAndTafweed` can concatenate it. */
function annexBodyHtml(d: AnnexData): string {
  const name = escapeHtml(d.party1Name)
  const stage = d.party1StageName ? ` وشهرته (${escapeHtml(d.party1StageName)})` : ''
  const nid = escapeHtml(d.party1NationalId)
  const addr = escapeHtml(d.party1Address ?? '—')
  const master = escapeHtml(d.masterDateAr)
  const annexDate = escapeHtml(d.annexDateAr)

  const intro = `
    <p class="lw-intro">أنه في يوم <strong>${annexDate}</strong> تحرر هذا الملحق للعقد الموقع بتاريخ <strong>${master}</strong> بين كل من:</p>
    <p><strong>أولًا:</strong> السيد/ ${name}${stage}، المقيم في: ${addr}، ويحمل رقم قومي ${nid}، بصفته مالك حقوق الاستغلال المالي والتجاري لمجموعة من المصنفات الفنية. <strong>(ويشار إليه بالطرف الأول)</strong></p>
    <p><strong>ثانيًا:</strong> السادة/ ${escapeHtml(COMPANY.nameAr)} — ${escapeHtml(COMPANY.legalDescAr)}. <strong>(ويشار إليها بالطرف الثاني)</strong></p>`

  return `
    ${intro}
    <section class="lw-clause"><h2 class="lw-clause-title">تمهيد</h2><div class="lw-clause-body"><p>حيث إنه حُرِّر عقد استغلال مصنفات فنية بين الطرفين بتاريخ <strong>${master}</strong> (ويشار إليه بالعقد).</p></div></section>
    ${clause(0, '', `<p>هذا الملحق جزءٌ لا يتجزأ من العقد الأصلي الموقع بين الطرفين بتاريخ <strong>${master}</strong> ومتمم له ولا يُفسَّر بدونه.</p>`)}
    ${clause(1, '', `
      <p>منح الطرف الأول — بموجب هذا الملحق — الطرفَ الثاني الحق الحصري في استغلال والترخيص باستغلال كافة المصنفات الفنية التي سيتم إصدارها طوال مدة سريان العقد، وكذا المصنفات المذكورة أدناه وكلماتها وألحانها والمقاطع الغنائية الخاصة بها والتصوير العائد لها وصور المطربين المؤدّين لها، بكافة طرق الاستغلال ووسائله المنصوص عليها في القانون رقم ٨٢ لسنة ٢٠٠٢، وبكافة وسائل الاستغلال المالي والتوزيع الرقمي المتاحة حاليًا أو مستقبلًا. وبياناتها كالتالي:</p>
      ${worksTableHtml(d.works, d.worksHeaders, d.worksTable)}`)}
    ${clause(2, '', `<p>يقر الطرف الأول بأنه يمتلك كافة الحقوق اللازمة لاستغلال المصنفات الممنوح حقوق استغلالها للطرف الثاني بموجب هذا الملحق، وبكامل مسؤوليته أمام أي طرف ثالث قد يدّعي أي حقوق على تلك المصنفات بما فيهم المؤلفون والملحنون، ويتحمل وحده المسؤولية الكاملة عن أي قضايا أو منازعات تتعلق بمضمون أو محتوى أو ملكية تلك المصنفات.</p>`)}
    ${clause(3, '', `<p>تظل باقي بنود العقد الأصلي سارية.</p>`)}
    ${clause(4, '', `<p>حُرِّر هذا الملحق من نسختين متطابقتين بيد كل طرف نسخة للعمل بموجبها عند الحاجة.</p>`)}`
}

/** Tafweed body HTML — standalone authorization the artist signs. */
function tafweedBodyHtml(d: TafweedData): string {
  const name = escapeHtml(d.party1Name)
  const stage = d.party1StageName ? ` وشهرته (${escapeHtml(d.party1StageName)})` : ''
  const nid = escapeHtml(d.party1NationalId)
  const addr = escapeHtml(d.party1Address ?? '—')
  const master = escapeHtml(d.masterDateAr)
  const dateAr = escapeHtml(d.annexDateAr)
  const coverage = coverageParagraph(d.coverageMode, d.coverageExclusions)

  return `
    <h2 class="lw-clause-title" style="text-align:center;margin:1.2em 0 1em">تفويض وإقرار</h2>
    <p>أُفوّض أنا / ${name}${stage} - المقيم في: ${addr}، وأحمل رقم قومي ${nid}، بصفتي مالك حقوق الاستغلال المالي والتجاري لمجموعة من المصنفات الفنية.</p>
    <p>السادة/ ${escapeHtml(COMPANY.nameAr)} — ${escapeHtml(COMPANY.legalDescAr)} — حصريًا في استغلال والترخيص باستغلال الأغاني المذكورة أدناه وكلماتها وألحانها وكذا المقاطع الغنائية الخاصة بها وصور المؤدّي لها للاستغلال في جمهورية مصر العربية وجميع أنحاء العالم، ومنها على سبيل المثال لا الحصر: ${coverage}. ويقوم الطرف الثاني أو من يرخّص له بذلك باستغلالها عبر تلك الشبكات على اختلاف أنواعها بشكل حصري.</p>
    <p>وأُقرّ بأنني أملك قانونًا كافة حقوق استغلال تلك الأغاني ماليًا وأنه ليس للغير عليها أي حق من الحقوق التي حماها قانون حماية حقوق الملكية الفكرية. كما أُقرّ بأنني مسؤولٌ وحدي تجاه الغير عن أي حقوق للغير تتعلق بالأغاني المذكورة أدناه. كما ألتزم بتسليم ${escapeHtml(COMPANY.nameAr)} أي أوراق ومستندات دالة على هذه الحقوق عند طلبها وذلك في خلال ثلاثة أيام عمل من طلبها، وذلك طبقًا للعقد الموقع بيني وبين ${escapeHtml(COMPANY.nameAr)} بتاريخ <strong>${master}</strong>.</p>
    ${worksTableHtml(d.works, d.worksHeaders, d.worksTable)}
    <p style="font-weight:700;margin-top:1em">وهذا إقرار وتفويض منّي بذلك.</p>
    <p style="margin-top:1em">تحريرًا في: <strong>${dateAr}</strong>.</p>
    <div style="margin-top:2em">
      <p style="font-weight:700">توقيع المفوِّض</p>
      <p>${name}${stage}</p>
    </div>`
}

export function renderAnnex(d: AnnexData, opts: { withSeal?: boolean } = {}): string {
  const { withSeal = true } = opts
  return layout({
    titleAr: fixParens(`ملحق رقم (${d.number}) لعقد استغلال مصنفات فنية`),
    bodyHtml:
      fixParens(annexBodyHtml(d)) +
      signatureBlockHtml({ party1Label: d.party1StageName ?? d.party1Name, regNo: d.regNo, withSeal }),
    letterhead: letterheadHtml(),
    footer: footerHtml(),
    extraCss: BRANDING_CSS,
  })
}

export function renderTafweed(d: TafweedData, _opts: { withSeal?: boolean } = {}): string {
  // The tafweed carries no signature block for Party 2 (it's an artist-only
  // attestation), so the seal toggle is a no-op here but the parameter is
  // accepted for API symmetry with renderAnnex/renderContract.
  return layout({
    titleAr: fixParens('تفويض وإقرار — استغلال مصنفات فنية'),
    bodyHtml: fixParens(tafweedBodyHtml(d)),
    letterhead: letterheadHtml(),
    footer: footerHtml(),
    extraCss: BRANDING_CSS,
  })
}

/** Combined multi-page PDF: annex first, hard page break, then the tafweed. */
export function renderAnnexAndTafweed(d: TafweedData, opts: { withSeal?: boolean } = {}): string {
  const { withSeal = true } = opts
  const annexBody =
    fixParens(annexBodyHtml(d)) +
    signatureBlockHtml({ party1Label: d.party1StageName ?? d.party1Name, regNo: d.regNo, withSeal })
  const tafweedBody = fixParens(tafweedBodyHtml(d))
  const combined = `${annexBody}<div style="page-break-before:always"></div>${tafweedBody}`
  return layout({
    titleAr: fixParens(`ملحق رقم (${d.number}) وتفويض`),
    bodyHtml: combined,
    letterhead: letterheadHtml(),
    footer: footerHtml(),
    extraCss: BRANDING_CSS,
  })
}

// ── SALE ekrar («إقرار») ────────────────────────────────────────────────────
// Standalone artist attestation for a SALE (بيع وتنازل) contract, modelled on
// the DISTRIBUTION tafweed but with the correct Egyptian sale terms: the artist
// asserts a permanent, irrevocable transfer of full economic rights (not a
// license), honours the contract's coverage mode + exclusions, and lists the
// works being sold using the EXACT columns/headers from the uploaded Excel.
// The buyout amount is intentionally NOT shown — the ekrar is a pure
// rights-transfer document (the price lives on the sale contract itself).

export type SaleTafweedData = {
  party1Name: string
  party1StageName?: string
  party1NationalId: string
  party1Address?: string
  /** Contract execution date, Arabic string. */
  contractDateAr: string
  /** Buyout amount in EGP. */
  buyoutAmountEgp?: number
  /** Amount-in-words override (تفقيط); auto-generated if omitted. */
  buyoutAmountWords?: string
  /** Works being sold (used for the tafweed's works table if worksTable absent). */
  works?: { titleAr: string; performer?: string }[]
  worksHeaders?: string[]
  worksTable?: { headers: string[]; rows: string[][] }
  coverageMode: CoverageMode
  coverageExclusions?: string[]
  regNo?: string
}

function saleTafweedBodyHtml(d: SaleTafweedData): string {
  const name = escapeHtml(d.party1Name)
  const stage = d.party1StageName ? ` وشهرته (${escapeHtml(d.party1StageName)})` : ''
  const nid = escapeHtml(d.party1NationalId)
  const addr = escapeHtml(d.party1Address ?? '—')
  const dateAr = escapeHtml(d.contractDateAr)
  const coverage = coverageParagraph(d.coverageMode, d.coverageExclusions)

  // Works table: prefer the raw Excel grid (headers exactly as uploaded). If no
  // Excel, fall back to a derived HEADERLESS table (performer + title) so the
  // ekrar still lists the sold works — never with invented column names. If
  // nothing to render, skip the table entirely.
  let works = ''
  if (d.worksTable && d.worksTable.rows.length) {
    const bodyRows = d.worksTable.rows
      .map((row) => `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
      .join('')
    const thead = d.worksTable.headers.length
      ? `<thead><tr>${d.worksTable.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>`
      : ''
    works = `<table>${thead}<tbody>${bodyRows}</tbody></table>`
  } else if ((d.works ?? []).length) {
    const bodyRows = (d.works ?? [])
      .map((w) => `<tr><td>${escapeHtml(w.performer ?? d.party1StageName ?? d.party1Name)}</td><td>${escapeHtml(w.titleAr)}</td></tr>`)
      .join('')
    works = `<table><tbody>${bodyRows}</tbody></table>`
  }

  // NOTE: the SALE ekrar deliberately OMITS the buyout amount. It is a pure
  // rights-transfer attestation for signature — the price lives on the sale
  // contract itself, not in the artist's ekrar.
  return `
    <h2 class="lw-clause-title" style="text-align:center;margin:1.2em 0 1em">إقرار</h2>
    <p style="text-align:end;margin:0 0 1em"><strong>تحريرًا في: ${dateAr}</strong></p>
    <p>أُقرّ أنا / ${name}${stage} — المقيم في: ${addr}، وأحمل رقم قومي ${nid}، بأنني المالك القانوني لكامل الحقوق المالية وحقوق الاستغلال الحصري للمصنفات الفنية المذكورة أدناه.</p>
    <p>وأُقرّ بأنني قد <strong>بعتُ وتنازلتُ</strong> نهائيًا وباتًّا للسادة/ ${escapeHtml(COMPANY.nameAr)} — ${escapeHtml(COMPANY.legalDescAr)} — عن كامل الحقوق المالية وحقوق الاستغلال الحصري لتلك المصنفات، بكافة طرق الاستغلال ووسائله المنصوص عليها في القانون رقم ٨٢ لسنة ٢٠٠٢ بشأن حماية حقوق الملكية الفكرية، ومنها على سبيل المثال لا الحصر: ${coverage}. ويصبح للطرف الثاني وحده الحق الاستئثاري في استغلال هذه المصنفات والترخيص بها أو المنع منها بأي وجه من الوجوه ودون حدّ زمني.</p>
    <p>وأُقرّ بأنني أملك قانونًا كافة حقوق استغلال تلك المصنفات ماليًا وأنه ليس للغير عليها أي حق من الحقوق التي حماها قانون حماية حقوق الملكية الفكرية، وأنني مسؤولٌ وحدي تجاه الغير عن أي حقوق تتعلق بالمصنفات المذكورة أدناه. كما ألتزم بتسليم ${escapeHtml(COMPANY.nameAr)} أي أوراق أو مستندات دالة على هذه الحقوق عند طلبها خلال ثلاثة أيام عمل من تاريخ الطلب، وذلك طبقًا لعقد البيع والتنازل الموقع بيني وبين ${escapeHtml(COMPANY.nameAr)} بتاريخ <strong>${dateAr}</strong>.</p>
    ${works}
    <p style="font-weight:700;margin-top:1em">وهذا إقرار منّي بذلك.</p>
    <p style="margin-top:1em">تحريرًا في: <strong>${dateAr}</strong>.</p>
    <div style="margin-top:2em">
      <p style="font-weight:700">توقيع المقرِّر (البائع المتنازل)</p>
      <p>${name}${stage}</p>
    </div>`
}

/** Standalone SALE ekrar («إقرار» — permanent rights-transfer attestation). */
export function renderSaleTafweed(d: SaleTafweedData, _opts: { withSeal?: boolean } = {}): string {
  return layout({
    titleAr: fixParens('إقرار — بيع وتنازل عن مصنفات فنية'),
    bodyHtml: fixParens(saleTafweedBodyHtml(d)),
    letterhead: letterheadHtml(),
    footer: footerHtml(),
    extraCss: BRANDING_CSS,
  })
}

/** Combined SALE contract + tafweed (contract page + hard page break + tafweed). */
export function renderContractAndSaleTafweed(
  d: ContractData,
  tafweed: SaleTafweedData,
  opts: { withSeal?: boolean } = {},
): string {
  const contractHtml = renderContract('SALE', d, opts)
  // Extract just the <body> content of the contract render so we can append
  // the tafweed body under the same letterhead/footer. The layout wraps
  // <html>…<body>[content]</body></html>; a regex grab is safer than trying
  // to re-invoke the internals.
  const bodyMatch = /<body[^>]*>([\s\S]*)<\/body>/i.exec(contractHtml)
  const contractBody = bodyMatch ? bodyMatch[1] : contractHtml
  const tafweedBody = fixParens(saleTafweedBodyHtml(tafweed))
  return layout({
    titleAr: fixParens('عقد بيع وتنازل + إقرار'),
    bodyHtml: `${contractBody}<div style="page-break-before:always"></div>${tafweedBody}`,
    letterhead: letterheadHtml(),
    footer: footerHtml(),
    extraCss: BRANDING_CSS,
  })
}

function footerHtml(): string {
  return `<div class="lw-footer">${escapeHtml(COMPANY.nameEn)} · ${escapeHtml(COMPANY.nameAr)} — مستند مُولَّد إلكترونيًا</div>`
}
