# Law floors - a dated lead list, not a source

**Last reviewed: 2026-11-12.** This file tells you **what to look up**. It is not the law. Before any
item here supports a finding, a trim, or a "required", verify it against the primary source linked
with it and record the operative words in `.agentstore/policykit/law.md` (`audit.md` Phase 2). Law changes
every year, and several entries below exist because a rule changed recently. Search for amendments
since the review date on every run.

How to read an entry:

- **Applies when** - the trigger. Check it against `facts.md`.
- **Must state** - the mandatory content. Missing or wrong content is a MISSING or MISLAW finding.
- **Floor** - the minimum the law sets. Anything promised beyond it is an OVER-PROMISE.
- **Void / prohibited** - terms that are not binding or are actionable. These are UNLAWFUL findings.

Primary-source hosts: EU `eur-lex.europa.eu` · UK `legislation.gov.uk` · US federal `uscode.house.gov`,
`ecfr.gov` · California `leginfo.legislature.ca.gov`, `cppa.ca.gov` · national EU law in that state's
official database (for example `wetten.overheid.nl`, `gesetze-im-internet.de`,
`legifrance.gouv.fr`). Regulator guidance (EDPB, the UK Information Commission, FTC, CPPA) is a strong secondary source for
reading a provision. It is not a substitute for the provision itself.

---

## EU / EEA - GDPR (Regulation (EU) 2016/679)

**Applies when** the business is established in the EU/EEA, or offers goods or services to people in
the EU/EEA, or monitors their behaviour there (Art 3). A controller or processor not established in
the EU that falls under Art 3(2) must designate an EU representative (Art 27) unless the Art 27(2)
exemption applies. Source: `https://eur-lex.europa.eu/eli/reg/2016/679/oj`.

**Privacy policy (controller) - must state** (Art 13 for data collected from the person, Art 14 when
obtained elsewhere):

- Art 13(1): (a) the controller's identity and contact details, and the representative's if there is
  one. (b) The DPO's contact details, where a DPO exists. (c) The purposes **and** the legal basis for
  each. (d) The legitimate interests pursued, where the basis is Art 6(1)(f). (e) The recipients or
  categories of recipients. (f) Transfers to third countries, and either the adequacy decision or the
  safeguards relied on, with how to obtain a copy.
- Art 13(2): (a) the storage period, **or if that is not possible**, the criteria used to determine
  it. (b) The rights of access, rectification, erasure, restriction, objection, and portability.
  (c) The right to withdraw consent at any time, where processing rests on consent. (d) The right to
  lodge a complaint with **a** supervisory authority. (e) Whether providing the data is a statutory or
  contractual requirement, and the consequences of not providing it. (f) Any automated
  decision-making, including profiling under Art 22(1) and (4), with meaningful information about the
  logic and its consequences.
- Art 14 adds: the categories of personal data (14(1)(d)) and the source of the data (14(2)(f)).
  Timing (14(3)): within a reasonable period, at the latest within one month (14(3)(a)), or
  earlier - at the first communication, if the data is used to contact the person (14(3)(b)), or
  when the data is first disclosed to another recipient (14(3)(c)).
- Art 13(3): before further processing for a new purpose, tell the person about that purpose first.
- Art 26(2): where the business determines purposes and means jointly with another controller (for
  example an embedded ad pixel or social plugin, CJEU C-40/17 *Fashion ID*), the essence of the
  arrangement must be made available to data subjects.
- Art 21(4): the right to object must be explicitly brought to attention, presented clearly and
  **separately** from other information.
- Art 12(1): concise, transparent, intelligible, easily accessible, clear and plain language.
- Art 37(7): if a DPO is appointed, publish the DPO's contact details.

Specificity, both ways. The EDPB-endorsed transparency guidelines (WP260 rev.01) treat vague
retention statements ("as long as necessary for our legitimate business purposes") as insufficient,
and the same goes for vague purposes. A mandatory disclosure has to be concrete enough to inform the
reader. Nothing in Art 13/14 requires naming a security technology, an SLA, or a response time.

**Floors (what the law actually requires, and nothing more):**

| Subject | The floor | Provision |
| --- | --- | --- |
| Answering data-subject requests | Without undue delay, and in any event within **one month** of receipt. Extendable by **two further months** where necessary, taking into account the complexity and number of requests. The person must be told of the extension, with reasons, within the first month. | Art 12(3) |
| Fees for requests | Free. A reasonable fee, or a refusal, is allowed for manifestly unfounded or excessive requests (Art 12(5)). A reasonable fee based on administrative costs is allowed for further copies of the data (Art 15(3)). | Art 12(5), 15(3) |
| Erasure | Only on the Art 17(1) grounds, and subject to the Art 17(3) exceptions (for example a legal obligation to retain, such as tax records, or legal claims). Not "everything, always". | Art 17 |
| Portability | Only where processing rests on consent or contract **and** is carried out by automated means. | Art 20(1) |
| Objection | For Art 6(1)(e)/(f) processing, subject to compelling legitimate grounds. **Absolute** for direct marketing. | Art 21 |
| Withdrawing consent | At any time, as easy as giving it, and it does not affect prior lawful processing. | Art 7(3) |
| Breach - to the authority | Without undue delay and, where feasible, within **72 hours** of becoming aware. Not required when the breach is unlikely to result in a risk. | Art 33(1) |
| Breach - to the people affected | Without undue delay, **only** when the breach is likely to result in a **high** risk, and subject to the Art 34(3) exceptions. There is **no** 72-hour rule toward individuals. | Art 34 |
| Breach - processor to controller | Without undue delay after becoming aware. No fixed hours. | Art 33(2) |
| Security | Appropriate technical and organisational measures, taking into account the state of the art, the cost, and the risk. There is no duty to name them in a policy. | Art 32 |
| Children's consent (information society services offered directly to a child, when the basis is consent) | 16, unless the member state has set a lower age, which cannot be below 13. **Look up each target state's age.** | Art 8(1) |
| DPO | Mandatory for public bodies, for core activities that involve regular and systematic monitoring on a large scale, or for large-scale special-category or criminal data (Art 37(1)), **and** wherever Union or member-state law requires one (Art 37(4)) - for example DE BDSG §38 (20 or more persons constantly engaged in automated processing; or, regardless of headcount, processing subject to an Art 35 DPIA, or commercial processing for transfer, anonymised transfer, or market or opinion research). Look up each establishment state. | Art 37(1), (4) |

**Processor DPA - must contain** (Art 28(3)): the subject matter, duration, nature, and purpose of
the processing, the types of personal data, the categories of data subjects, and the controller's
obligations and rights; and that the processor (a) processes only on documented instructions,
transfers included; (b) ensures that the people authorised to process the data are bound to
confidentiality; (c) takes the Art 32 measures; (d) respects the sub-processor conditions of Art 28(2)
and (4); (e) assists with data-subject requests; (f) assists with Arts 32-36; (g) at the end of the
services, at the controller's choice, deletes or returns the data, unless Union or member-state law
requires storage; (h) makes available the information needed to demonstrate compliance, and allows
for and contributes to audits, including inspections. Also: the processor immediately informs the
controller if an instruction infringes the law.

Sub-processors (Art 28(2)): either prior specific authorisation, or general written authorisation
under which the processor informs the controller of intended changes and gives it the opportunity to
object. **The GDPR sets no notice period in days.** The 2021 SCCs (Commission Implementing Decision
(EU) 2021/914) leave the period for the parties to fill in.

**SCC and UK Addendum text is fixed.** Where a DPA includes or completes the 2021 SCCs (or the UK
IDTA / Addendum) as the transfer safeguard, their clauses are valid only "provided they are not
modified, except to select the appropriate Module(s) or to add or update information in the
Appendix" (Annex Clause 2(a)), and the DPA's other terms may not contradict them. That text is
required verbatim: never trim or reword it, and keep each blank the SCCs require filled (Clause 9(a)
Option 2: a specific period).

**Transfers:** Arts 44-49. Adequacy decisions (Art 45), including the EU-US Data Privacy Framework
decision of 10 July 2023, which covers only certified US recipients. Check its current status. SCCs
(Art 46). Derogations (Art 49).

**UK GDPR + Data Protection Act 2018** follow these provisions, with the Information Commission as
the authority (it replaced the Information Commissioner on 30 September 2026, SI 2026/1015), but the
**Data (Use and Access) Act 2025** changed several floors. Its data-protection and PECR amendments
commenced on 5 February 2026 (SI 2026/82 reg 2), and the complaints regime on 19 June 2026 (reg 3):
a controller must make it easy to complain and acknowledge a complaint within 30 days (DPA 2018
s164A), and the notice must state the right to complain to the controller (UK GDPR Art 13(2)(ca),
14(2)(da)) as well as the right to complain to the Commission under DPA 2018 s165 (Art 13(2)(d),
14(2)(e)). UK-specific floors include Art 12A (the one-month period starts at the latest of receipt,
identity confirmation, or fee, and pauses while clarification of an access request is awaited), the
PECR Schedule A1 cookie exemptions (below), and a children's-consent age of 13 (UK GDPR Art 8(1) as
amended by SI 2019/419; DPA 2018 s9 was omitted on 31 December 2020). Verify each UK floor against
the UK text. Never apply an EU row to UK processing.
**Switzerland**: the revised FADP (in force since 1 September 2023) has its own information duties
(Art 19 nFADP). Research it if Swiss users are in scope.

## EU - cookies and terminal access: ePrivacy Directive 2002/58/EC Art 5(3)

**Applies when** information is stored on, or read from, a user's device: cookies, localStorage,
SDK identifiers, fingerprinting. National implementations apply, for example NL Telecommunicatiewet
art. 11.7a, DE TDDDG §25 (the former TTDSG, renamed in 2024), and FR loi Informatique et Libertés
art. 82. The UK has its own rule (below).

- **Floor:** consent first, **except** for storage or access strictly necessary for the service the
  user explicitly requested, or for carrying out the transmission of a communication. Consent follows
  the GDPR standard: freely given, specific, informed, unambiguous, and affirmative. A pre-ticked box
  is not consent (CJEU C-673/17 *Planet49*).
- **Must state** for consent-based cookies: the purposes, plus the cookies' **duration** and whether
  **third parties** can access them (*Planet49*).
- **Void / prohibited:** "by continuing to browse you accept cookies" as the consent mechanism for
  non-essential cookies.
- **Typical over-promise:** "We use no cookies" or "only essential cookies", while the inventory shows
  analytics or advertising tags. That is UNTRUE, not over.
- **UK (PECR reg 6 + Schedule A1, since 5 February 2026):** consent first, except strictly necessary
  storage and, under Schedule A1 para 5, storage whose sole purpose is to let the service provider collect
  statistics on how its service or website is used, to improve it, where the information is shared
  with no one except to help make those improvements (never information the device emits
  automatically, para 5(2)), and under para 6, storage that enables the site's appearance or functionality or adapts it to the
  user's preferences - provided the user gets clear and comprehensive information about the purpose
  and a simple, free means of objecting. For those, the floor is information plus an objection
  mechanism, not consent. Verify the Schedule A1 conditions.
- **Marketing e-mail (ePrivacy Art 13):** direct-marketing e-mail to natural persons needs their
  prior consent (Art 13(1)). The only exception: a customer whose address the business obtained in
  the context of the sale of a product or a service (this includes a free account on a service that
  also sells paid access, CJEU C-654/23 *Inteligo Media*), for the business's own similar products or services, who was given a clear, free, and
  easy way to object when the address was collected and is given one in every message (Art 13(2)).
  Legitimate interest is not a basis for other marketing e-mail. National law applies and may extend
  this to businesses (Art 13(5); for example DE UWG §7, NL Telecommunicatiewet art. 11.7; UK: PECR
  reg 22). Verify each market.

## EU - consumer contract law (B2C only)

Directives are implemented nationally, and minimum-harmonisation directives let member states go
further. Check the **national** text of the establishment state and of each main market.

**Consumer Rights Directive 2011/83/EU** (as amended by Directives (EU) 2019/2161, 2023/2673, and
2024/825 - the last applicable from **27 September 2026**). Source:
`https://eur-lex.europa.eu/eli/dir/2011/83/oj`, consolidated version.

- **Must state (before the contract, for distance contracts):** the Art 6(1) list. This includes:
  - the trader's identity and contact details, the total price, and the arrangements for payment and
    performance;
  - the conditions, time limit, and procedure of the withdrawal right, with the model withdrawal form
    (Annex I(B)), and, where applicable, the existence and placement of the Art 11a withdrawal
    function (Art 6(1)(h) as amended by Directive (EU) 2023/2673);
  - a reminder of the legal guarantee of conformity - for goods, its main elements and two-year
    minimum, given using the harmonised notice of Art 22a (Art 6(1)(l) as amended by Directive (EU)
    2024/825); for digital content and services, Art 6(1)(lb) - and, where applicable, the producer's
    commercial guarantee of durability (la), the minimum software-update period (lc), and the
    reparability or repair information (u), (v);
  - the contract duration and termination conditions, the functionality, compatibility, and
    interoperability of digital content and services, and out-of-court redress where it applies.

  The terms document is the usual place, but not the only legal one.
- **Online marketplaces (Art 6a, inserted by Directive (EU) 2019/2161):** before the consumer is
  bound, the main ranking parameters, whether the third-party seller is a trader (on its own
  declaration), that EU consumer rights do not apply if it is not, and how obligations are shared
  between seller and marketplace.
- **Floor:** a **14-day** withdrawal right (Art 9). If the consumer was not informed of it, the period
  is extended by **12 months** (Art 10). The trader refunds without undue delay and within **14 days**
  of being informed of the withdrawal, by the same means of payment (Art 13(1)). For goods: the extra
  cost of a delivery option dearer than the least expensive standard delivery need not be refunded
  (Art 13(2)); unless the trader offered to collect the goods, it may withhold the refund until it
  receives them back or proof that they were sent, whichever is earlier (Art 13(3)); the consumer
  bears the direct cost of return only if told so before the contract (Art 14(1), Art 6(1)(i)), so
  that statement is a disclosure to keep, not a trim; and the consumer is liable for diminished value
  caused by handling beyond what is needed to establish the goods' nature, characteristics, and
  functioning (Art 14(2)). For services the consumer asked to start during the withdrawal period, a
  proportionate amount is owed (Art 14(3)).
- **Exceptions are conditional** (Art 16). A service: the right is lost once the service is fully
  performed; where the consumer must pay, only if performance began with the consumer's **prior
  express consent and acknowledgement** (Art 16(a)). Digital content not supplied on a tangible
  medium: lost once performance has begun; where the consumer must pay, only with prior express
  consent, acknowledgement of losing the right, **and** the trader's confirmation under Art 8(7)
  (Art 16(m)). Check whether the product is
  "digital content" or a "digital service" (Art 2 as amended), because the exceptions differ. A clause
  claiming, for a paid contract, an exception that the checkout flow does not actually implement (no consent checkbox, no
  acknowledgement, no confirmation) is **UNTRUE**, and the 14-day right stands.
- **Withdrawal function** (Art 11a, inserted by Directive (EU) 2023/2673, **applicable from
  19 June 2026**): contracts concluded through an online interface need a clearly labelled withdrawal
  function ("withdraw from contract here" or an equally unambiguous wording) with a confirmation
  step. This is a UI duty, checked as a satellite, and also a pre-contractual disclosure: the
  withdrawal information must say that the function exists and where it is (Art 6(1)(h)). The
  policy must not describe a withdrawal process
  that contradicts it. Verify the national transposition.

**Unfair Contract Terms Directive 93/13/EEC.** Source: `https://eur-lex.europa.eu/eli/dir/1993/13/oj`.

- A non-negotiated term is unfair if, contrary to good faith, it causes a significant imbalance to the
  consumer's detriment (Art 3). Unfair terms are **not binding** (Art 6). Terms must be in plain,
  intelligible language, and **doubt is resolved in the consumer's favour** (Art 5). Core terms (the
  main subject matter and the adequacy of the price) escape the fairness test **only** if they are
  plain and intelligible (Art 4(2)). Since Directive 2019/2161, member states must provide penalties
  for unfair terms (Art 8b).
- **The Annex's indicative list includes:** excluding or limiting liability for death or personal
  injury (1(a)); inappropriately excluding or limiting the consumer's legal rights for non-performance
  (1(b)); unilateral alteration of terms without a valid reason specified in the contract (1(j)) or of
  the product's characteristics (1(k)); a price determined at delivery or increased without a right
  to cancel if the final price is too high (1(l)); hindering legal action, for example by mandatory
  arbitration (1(q)).
- **National black and grey lists go further.** For example NL BW art. 6:236 (black) and 6:237 (grey),
  and DE BGB §§307-309. Under §309 no. 7, liability for injury to life, body, or health caused by
  negligence, and liability for gross negligence, can be neither excluded nor limited (for example
  capped) in standard terms.
- **Auto-renewal** is national. For example NL BW 6:236(j): after the initial term, tacit renewal only
  for an indefinite period, terminable at any time with at most one month's notice. DE BGB §309 no. 9,
  and the §312k online cancellation button. Look up each market.

**Digital Content Directive (EU) 2019/770** (digital content and services) and **Sale of Goods
Directive (EU) 2019/771** (goods):

- **Floor:** the statutory conformity remedies cannot be contracted out to the consumer's detriment
  (DCD Art 22, SGD Art 21). Goods: liability for non-conformity that becomes apparent within **2
  years** of delivery (SGD Art 10(1)), extended once by **12 months** where the goods are brought
  into conformity by repair (Art 10(2a), inserted by Directive (EU) 2024/1799, for contracts concluded
  from 31 July 2026). Member states may set longer periods (Art 10(3)), and a state with no fixed
  liability period may replace the 12-month extension with at least three years' liability after
  repair (Art 10(5a)). A modification of
  digital content or services must meet the DCD Art 19 conditions (a valid reason in the contract, no
  extra cost, clear and comprehensible information, and, where the modification negatively affects
  access or use beyond a minor degree, information reasonably in advance on a durable medium about
  its features and timing and about the right to terminate (Art 19(1)(d), 19(2))).
- **Void:** "provided as is, without warranty" toward consumers, to the extent it excludes the
  statutory conformity rights. A commercial guarantee (SGD Art 17) is **voluntary**. Promising one is
  above the floor.

**Unfair Commercial Practices Directive 2005/29/EC** (as amended by Directives (EU) 2019/2161 and
2024/825, the latter applicable from 27 September 2026). Source:
`https://eur-lex.europa.eu/eli/dir/2005/29/oj`, consolidated version. Applies to every B2C commercial
practice, satellite copy included.

- **Must state (material information, Art 7):** where the trader gives access to consumer reviews,
  whether and how it ensures that published reviews come from consumers who actually used or
  purchased the product (Art 7(6)). Where consumers can search products of different traders, the
  main ranking parameters and their relative importance, in a section directly reachable from the
  results page (Art 7(4a)).
- **Prohibited in all circumstances (Annex I), true or not:** presenting rights consumers have by
  law as a distinctive feature of the offer (pt 10), or legal requirements that apply to all
  products as one (pt 10a); claiming reviews come from real buyers without reasonable and
  proportionate checks (pt 23b); generic environmental claims without recognised excellent
  environmental performance (pt 4a); claims of neutral, reduced, or positive climate impact based on
  offsetting (pt 4c). An Annex I hit in satellite copy is UNLAWFUL, not just UNTRUE. Verify the
  national transposition.

**Jurisdiction and choice of law:**

- Rome I Regulation (EC) 593/2008 Art 6(2): a chosen law cannot deprive a consumer of the mandatory
  protection of the law of their habitual residence, where the trader directs activities there.
  CJEU C-191/15 *VKI v Amazon* (2016): a term that names only the trader's law, without telling the
  consumer that they keep the protection of their own country's mandatory law, can be unfair.
- Brussels Ia Regulation (EU) 1215/2012 Arts 17-19: consumers may sue in their own domicile, and can
  only be sued there. Agreements that depart from this are restricted.
- **Typical defect:** "These terms are governed exclusively by the laws of X, and the courts of Y
  have exclusive jurisdiction", applied to consumers without the caveat. That is UNLAWFUL and MISLAW.

**Out-of-court redress:**

- **The ODR platform is gone.** Regulation (EU) 524/2013 was repealed by Regulation (EU) 2024/3228,
  with effect from **20 July 2025**, and the platform was discontinued. A link to it, or the duty to
  show one, is now **MISLAW** (stale law). Remove it.
- ADR (Directive 2013/11/EU Art 13): a trader has to name an ADR entity **only if** it is committed or
  obliged to use one. Volunteering an ADR commitment is above the floor. Check the current
  consolidated text and the national law - national law can require more. For example, DE VSBG §36:
  a trader with a website or standard terms that employed more than 10 persons on 31 December of the
  previous year must state, on the website and with its terms, whether it is willing or obliged to
  take part in consumer-arbitration proceedings, even when it is not.

**E-Commerce Directive 2000/31/EC:** Art 5 general information (name, geographic address, email,
trade register and number, VAT number, and the authorisation or supervisory authority where one
applies), usually in an imprint. Art 10: for contracts concluded online (with consumers always;
with businesses unless the parties have agreed otherwise; never for contracts concluded exclusively
by e-mail, Art 10(4)), the technical steps to conclude the contract, whether the contract is filed
and accessible, how to correct input errors, and the languages offered. Art 10(3): the terms must
be available in a form that can be stored and reproduced. **UK:** the Electronic Commerce (EC
Directive) Regulations 2002 (`legislation.gov.uk/uksi/2002/2013`) impose the same duties on UK
service providers: reg 6 (general information, including the register number and VAT number), and
reg 9 (online-contract information, not required for contracts concluded exclusively by e-mail, reg
9(4); terms that can be stored and reproduced, reg 9(3)).

## EU - platform and digital-market regulation (only if the service type triggers it)

- **P2B Regulation (EU) 2019/1150** - online intermediation services for business users (marketplaces,
  app stores, booking platforms). Terms must be plain and easily available (Art 3(1)(a), (b)) and
  must state: the grounds for suspending, terminating, or restricting the service (3(1)(c));
  additional distribution channels and affiliate programmes (3(1)(d)); the effect on business users'
  IP (3(1)(e)); the main ranking parameters and their relative importance (Art 5(1)); any ancillary
  goods or services (Art 6); any differentiated treatment of the provider's own offers (Art 7(1)); how
  business users can terminate, and their data access after it ends (Art 8(b), (c)); data access
  (Art 9(1)); the grounds for any restriction on offering different conditions elsewhere (Art
  10(1)); the internal complaint-handling system (Art 11(3)) and two or more mediators (Art 12(1)) -
  these last two not for small enterprises (Arts 11(5), 12(7)). **Changes: notice on a
  durable medium that is reasonable and proportionate, at least 15 days, and longer where business
  users need time for technical or commercial adaptations** (Art 3(2)). Every proposed change is
  notified, including a non-material one or one the law forces. Art 3(4) lifts only the 15-day
  period, and only where a legal or regulatory obligation requires the change "in a manner which does
  not allow it to respect the notice period", or to address an unforeseen and imminent danger of
  fraud, malware, spam, data breaches, or other cybersecurity risks. A change implemented contrary to
  Art 3(2) is null and void (Art 3(3)). So a revision of P2B-covered business-user terms is never
  tier `none` (a revision whose text is unchanged changes no terms, so it stays `none`). Restriction or suspension needs a statement of reasons
  (Art 4(1)). Termination needs **30 days' notice** before it takes effect (Art 4(2)), subject to the
  Art 4(4) exceptions. **UK:** the P2B Regulation continues as assimilated law
  (`legislation.gov.uk/eur/2019/1150`) for business users established in the UK that offer goods or
  services to consumers in the UK (Art 1(2)), with the same terms content, the same at-least-15-days
  change notice (Art 3(2)), and the same termination notice. Determine EU and UK applicability
  separately, each from its own text.
- **Digital Services Act (EU) 2022/2065** - intermediary services (mere conduit, caching, hosting,
  online platforms). Terms must describe the restrictions on use, content moderation (including
  algorithmic decision-making and human review), and internal complaint handling (Art 14(1)), and
  users must be informed of significant changes (Art 14(2)). Online platforms that are not micro or
  small enterprises (Art 19) must also set out in their terms their policy on misuse, with examples
  of what they take into account and the duration of a suspension (Art 23(4)), and, if they use
  recommender systems, the main parameters and any options to modify or influence them (Art 27(1)). Points of contact (Arts 11-12). A legal
  representative if the provider is not established in the EU (Art 13). Hosting providers owe a
  statement of reasons when they restrict content or accounts (Art 17). Micro and small enterprises
  are exempt from several obligations (for example Art 15(2) and Art 19). Check which ones.
- **Data Act (EU) 2023/2854** - providers of data processing services (cloud, and SaaS within scope).
  Applies from **12 September 2025**. The contract must include the customer's switching rights. The
  maximum notice period to start switching is **2 months**, and the default transitional period is
  **30 calendar days**, extendable when technically infeasible, with notice within 14 working days and
  a cap of 7 months. Data must remain retrievable for **at least 30 days** after switching. Switching
  charges are phased out: reduced charges until **12 January 2027**, free after that. Verify Arts
  23-31.
- **European Accessibility Act - Directive (EU) 2019/882**, applicable from **28 June 2025**, for
  in-scope services, including e-commerce services to consumers (Art 2(2)). Service providers must
  publish how the service meets the accessibility requirements (Art 13(2), Annex V), in the general
  terms and conditions **or an equivalent document**. Microenterprises providing services are exempt
  (Art 4(5)). Verify the national transposition and the microenterprise definition.
- **AI Act (EU) 2024/1689 Art 50** - transparency for AI systems that interact with people, and for
  synthetic content. Applicable from **2 August 2026**. An amending regulation (the "digital omnibus")
  adjusted some timelines. Check whether it affects the Art 50(2) marking duty for systems already on
  the market. Mostly a UI duty, checked as a satellite.

## United States

- **FTC Act §5** (15 U.S.C. §45): deceptive and unfair practices. **A privacy or security statement
  the business does not keep is a deceptive practice**, which is the main US reason over-promising is
  dangerous. The FTC's long-held position is that applying a materially less protective privacy
  promise retroactively, to data already collected, requires affirmative express consent.
- **EU-U.S. Data Privacy Framework, its UK Extension, and the Swiss-U.S. DPF - when the business
  itself is self-certified** (check the DPF List at `dataprivacyframework.gov`; Annex I to Commission
  Implementing Decision (EU) 2023/1795). **Must state** in the privacy policy that it adheres to the
  DPF Principles, plus the Notice Principle items (II.1(a)): participation, with a link to the DPF
  List; the types of personal data; the commitment to subject all personal data received in reliance
  on the DPF to the Principles; the purposes; how to contact it; the third parties it discloses to;
  the right of access; the choices offered; the independent recourse mechanism; the FTC's (or DOT's)
  enforcement powers; the possibility of binding arbitration; disclosure in response to lawful
  requests by public authorities; and its liability for onward transfers. It must also link to the
  DPF website and to the recourse mechanism (Supplemental Principle 6). Failure is enforceable under
  FTC Act §5. This text is a DISCLOSURE, never trimmed as certification detail. A business that
  withdraws from the DPF removes it only as Supplemental Principle 6 directs.
- **CCPA as amended by the CPRA** (Cal. Civ. Code §1798.100 et seq.; regulations at 11 CCR §7000 et
  seq.). Source: `leginfo.legislature.ca.gov`, `cppa.ca.gov`.
  - **Applies when** (§1798.140(d)) a for-profit business doing business in California meets **any
    one** of: annual gross revenue above $25,000,000 as CPI-adjusted (**$26,625,000** from 1 January
    2025, re-adjusted in odd years, so check for the 2027 figure); buys, sells, or shares the personal
    information of **100,000** or more consumers or households a year; or derives **50%** or more of
    its annual revenue from selling or sharing personal information.
  - **Must state:** the privacy-policy content of §1798.130(a)(5) and 11 CCR §7011 (categories
    collected, sources, purposes, categories disclosed, sold, or shared, the consumer's rights and how
    to exercise them). **Updated at least once every 12 months.** A notice at collection (§7012). A Notice of Financial Incentive (§7016)
    when the business offers anything (a discount, a loyalty benefit, a price or service difference)
    in exchange for personal information. 11 CCR §7010 lists every notice the CCPA requires.
    When selling, sharing, or using sensitive information beyond the permitted purposes: the "Do Not
    Sell or Share My Personal Information" and "Limit the Use of My Sensitive Personal Information"
    links, or the single "Your Privacy Choices" alternative opt-out link (11 CCR §7015). A business
    that processes opt-out preference signals in a frictionless manner (11 CCR §7025(f)), lets the
    signal fully effectuate the opt-out, including any offline sale or sharing (§7025(g)(3)), and
    whose privacy policy contains the four §7025(g)(2) items (the opt-out right, a statement that it
    processes signals frictionlessly, how to send a signal, and any other opt-out method) need not
    post the "Do Not Sell or Share" link (§1798.135(b); 11 CCR §7025(g)). If it also uses or discloses
    sensitive personal information beyond the §7027(m) purposes, it still posts the "Limit" link or
    the alternative link, and a Notice of Right to Limit (§7014(d)): there is no frictionless
    substitute for the Limit link. The Notice of Right to Opt-out of Sale/Sharing is still required,
    in the privacy policy (§7013(d), (e)(1)), and so is the Notice of Right to Limit where it applies
    (§7014(d), (e)). A business that does not sell or share must say
    so in its privacy policy (11 CCR §7011, §7013(g)).
  - **Floor:** requests to know, delete, or correct - within **45 calendar days**, extendable once by
    **45 more** when reasonably necessary, with notice inside the first period (§1798.130(a)(2);
    11 CCR §7021(b)). Requests to opt out of sale/sharing and requests to limit - as soon as feasibly
    possible, and **no later than 15 business days** (11 CCR §7026(f), §7027(g)). Honour opt-out preference
    signals such as Global Privacy Control as opt-out requests **if** the business sells or shares
    (11 CCR §7025(b)). If it does not, promising to honour GPC is above the floor - but every CCPA
    privacy policy must still explain how an opt-out preference signal will be processed and how the
    consumer can use one (11 CCR §7011(e)(3)(F)).
  - Regulations on automated decision-making technology, risk assessments, and cybersecurity audits
    were finalised in 2025, with phased effective dates from 1 January 2026. Check which apply.
- **CalOPPA** (Cal. Bus. & Prof. Code §22575-22579) - any commercial website or online service
  collecting personally identifiable information from California residents. **Must state:** the
  categories of personally identifiable information collected and the categories of third parties it
  may be shared with (§22575(b)(1)); the process for reviewing and requesting
  changes, **if one is offered**; how users are notified of material changes; the effective date;
  **how the operator responds to Do Not Track signals, but only if the operator itself collects
  personally identifiable information about consumers' online activities over time and across
  third-party sites** (§22575(b)(5); a link to a described protocol suffices, (b)(7)); and whether
  third parties may collect
  information about users' activity across sites over time. **Floor:** CalOPPA requires **disclosing**
  how Do Not Track is handled. It does **not** require honouring the signal. "We honour Do Not Track"
  is above the floor (and usually untrue).
- **Other state comprehensive privacy laws** (Virginia, Colorado, Connecticut, Utah, Texas, Oregon,
  Montana, Iowa, Delaware, New Hampshire, New Jersey, Tennessee, Minnesota, Maryland, Indiana,
  Kentucky, Rhode Island, Nebraska, and more each year). Applicability thresholds differ by state:
  most count consumers, a few use a revenue figure, and some (for example Texas) exempt businesses
  that are small under the US SBA size standards (13 CFR 121.201, mostly annual receipts per
  industry), leaving them only a sensitive-data sale-consent duty. Look up the current list and each statute's
  threshold. Never assume a state law applies, and never assume it doesn't.
- **COPPA** (15 U.S.C. §6501-6506; 16 CFR Part 312) - services directed at children under 13, or with
  actual knowledge of collecting from them. The amended Rule's compliance date was **22 April 2026**.
  The policy content is in §312.4(d).
- **CAN-SPAM** (15 U.S.C. §7701 et seq.; 16 CFR Part 316): honour an opt-out within **10 business
  days**. Promising "immediately" is above the floor.
- **Auto-renewal and cancellation:** ROSCA (15 U.S.C. §8401-8405) requires clear disclosure, express
  informed consent, and a simple cancellation mechanism. California's Automatic Renewal Law (Cal.
  Bus. & Prof. Code §17600 et seq.) was amended by AB 2863 with effect from 1 July 2025. The FTC's
  2024 "click-to-cancel" amendment to the Negative Option Rule was **vacated** by the 8th Circuit in
  July 2025. Check its current status before citing it.
- **Arbitration and class-action waivers:** generally enforceable under the FAA, but the rules differ
  by state and by consumer protection statute. Verify for the governing state before relying on one.
- **Consumer Review Fairness Act** (15 U.S.C. §45b) - in a standardised contract imposed on an
  individual (not employment or contractor contracts), a provision is **void** if it prohibits or
  restricts the individual's reviews, performance assessments, or similar analysis of the
  business's goods, services, or conduct; imposes a penalty or fee for them; or transfers any
  intellectual property rights in review or feedback content, except a non-exclusive licence
  (§45b(b)(1)). Offering such a contract is unlawful and is enforced as an FTC rule violation
  (§45b(c), (d)). A non-disparagement clause or a feedback assignment in such terms is UNLAWFUL.
  Verify the §45b(b)(2) exceptions (for example, unlawful or confidential content).

## United Kingdom (consumer law and online safety)

- **Consumer Rights Act 2015.** Part 1: statutory rights for goods, digital content, and services
  that cannot be excluded (for example ss31, 47, and 57). s65: liability for death or personal injury
  caused by negligence cannot be excluded. Part 2: the fairness test (s62); core terms are exempt only
  if transparent and prominent (s64); transparency (s68); **s69: where a term could have different
  meanings, the meaning most favourable to the consumer prevails.** Schedule 2 is the grey list.
- **Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013:** a
  14-day cancellation right (regs 29-30), extended by up to 12 months if the consumer was not
  informed (reg 31). Losing the right for services or digital content supplied during the period
  depends on the consumer's express request and acknowledgement (regs 36-37).
- **Digital Markets, Competition and Consumers Act 2024.** Part 4 Chapter 1 (unfair commercial
  practices, in force since 6 April 2025, replacing the Consumer Protection from Unfair Trading
  Regulations 2008) applies to every B2C commercial practice, satellite copy included. Schedule 20
  lists practices banned in all circumstances, true or not: among them presenting rights consumers
  have by law as a distinctive feature of the offer (para 11), and fake or misleadingly published
  consumer reviews, including publishing reviews without reasonable and proportionate steps to
  prevent and remove fake ones (para 13). It has no counterpart to UCPD Annex I pts 4a and 4c. The
  subscription-contracts regime is not in force on the review date; commencement has been reported
  for 2027. Check before citing it.
- **Online Safety Act 2023** - regulated user-to-user services (users can encounter content other
  users upload or share: marketplace listings, profiles, messaging, collaboration) and search
  services with links to the UK (ss3-4; exemptions in Sch 1, for example comments and reviews only on
  the provider's own content). Terms of service must specify how individuals are protected from
  illegal content (s10(5)), any proactive technology used (s10(7)), and the complaints policies and
  processes (s21(3)); more applies to services likely to be accessed by children and to categorised
  services. Verify which duties are in force. Source: `legislation.gov.uk/ukpga/2023/50`.

## Change notice - where a fixed period comes from

A policy's own change-notice clause is a promise. There is **no general statutory notice period**
for changes to consumer terms in the EU or UK. The test is fairness: a valid reason specified in the
contract, reasonable notice, and a right to terminate (93/13 Annex 1(j), (k); for a contract of
indeterminate duration, reasonable notice and a free right to dissolve suffice for changes to the
terms other than the price (Annex 2(b), second subparagraph, which relaxes 1(j) only; a change to the
characteristics of the goods or service still needs a valid reason, 1(k); unlike 1(j), 1(k) does not require the reason to be specified in
the contract, but national law may - verify in `law.md`)
unless national law requires more; a term that
lets the business vary the price must also set out, transparently, the reason for and the method of
the variation, and notice plus a right to terminate cannot in principle replace that (Annex 1(l),
2(d); CJEU C-92/11 *RWE Vertrieb*, operative part 2); DCD Art 19 for digital
content and services. UK: CRA 2015 s62 with Sch 2 paras 11, 13, 14 and 15; the para 23 exception
for contracts of indeterminate duration (it covers paras 11, 12, and 14, so price changes too); and
the para 25 price-indexation exception). Fixed statutory periods exist only in specific rules:
- P2B (EU, and the UK's assimilated version): at least 15 days for business users, longer where
  they need time to adapt.
- The European Electronic Communications Code Art 105(4): one month, for publicly available
  electronic communications services other than number-independent interpersonal communications
  services (so not for app-based messaging, chat, or video-call services).
- Payment services.
- US state automatic-renewal laws. For example Cal. Bus. & Prof. Code §17602(g)(2): a fee change
  under an accepted automatic renewal or continuous service offer is notified to California
  consumers no less than 7 and no more than 30 days before it takes effect, together with how to
  cancel; any other material change is notified before it is implemented (§17602(g)(1), (i)(3)).
- Any other fixed national or state rule.

**A privacy notice is information, not a contract.** The GDPR requires informing people before processing for a new
purpose (Art 13(3)) and keeping the notice accurate. It sets no fixed advance-notice period for other
updates. So a "30 days' notice of any change" clause is above the floor unless a sector rule applies.

## Regimes not in this file

Brazil (LGPD), Canada (PIPEDA and Quebec Law 25), Australia (Privacy Act 1988), Japan (APPI),
India (DPDP Act 2023), and every other market - and every sector regime the service type triggers
(for example US GLBA / Regulation P for financial institutions, HIPAA for covered entities and
business associates). If facts.md puts users there, or the service in that sector, research the
regime from the primary source using the same method and mark it APPLIES, DOES NOT APPLY, or
uncovered, like any other. If you cannot, mark it **uncovered** in the report.
