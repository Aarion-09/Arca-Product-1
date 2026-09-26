// Legal documents.
//
// These are served as real server-rendered HTML at /legal/<slug>, not as
// single-page-app routes. A policy that disappears when a JavaScript bundle
// fails is not a published policy, and search engines, screen readers and
// "print to PDF" all need the plain document.
//
// IMPORTANT: this is a carefully written starting point that describes what the
// code actually does. It is not legal advice. Have a qualified adviser review
// it, and re-read it whenever you change what data is collected, who can see
// it, or how long it is kept.

import { OPERATOR, MINIMUM_AGE, FOUNDING_LIMIT } from "./config.mjs";
import { escapeHtml } from "./security.mjs";

export const LEGAL_UPDATED = "19 September 2026";
const E = OPERATOR;

const contact = `<a href="mailto:${escapeHtml(E.email)}">${escapeHtml(E.email)}</a>`;
const privacyContact = `<a href="mailto:${escapeHtml(E.privacyEmail)}">${escapeHtml(E.privacyEmail)}</a>`;
const safetyContact = `<a href="mailto:${escapeHtml(E.safetyEmail)}">${escapeHtml(E.safetyEmail)}</a>`;
const operatorLine = `${escapeHtml(E.entity)}, ${escapeHtml(E.address)}, ${escapeHtml(E.country)}`;

// ---------------------------------------------------------------------------

export const LEGAL_DOCS = {
  terms: {
    title: "Terms of Service",
    nav: "Terms",
    summary: "The agreement between you and ARCA. What we promise, what we do not, and what we expect from you.",
    sections: [
      {
        h: "1. Who you are agreeing with",
        p: [
          `ARCA ("ARCA", "we", "us") is operated by ${operatorLine}. Day-to-day responsibility for the service rests with ${escapeHtml(E.responsible)}, who is an adult and is the person legally accountable for the operation of this service.`,
          `These Terms form a binding agreement between you and ARCA from the moment you create an account or otherwise use the service. If you do not accept them, do not create an account.`,
          `You can reach us at ${contact}.`,
        ],
      },
      {
        h: "2. You must be 18 or over",
        p: [
          `ARCA is an adult professional network. You must be at least ${MINIMUM_AGE} years old and legally capable of entering into a binding contract to hold an account.`,
          `We ask for your date of birth at sign-up and refuse accounts that do not meet the minimum age. We store only the resulting confirmation that you met the age requirement, not your full date of birth.`,
          `If we learn that an account belongs to someone under ${MINIMUM_AGE}, we will close it and delete the associated personal data. If you believe a minor holds an account, tell us at ${safetyContact}.`,
        ],
      },
      {
        h: "3. Your account",
        p: [
          `Give accurate information, keep your credentials secure, and tell us promptly at ${safetyContact} if you suspect unauthorised access. You are responsible for activity carried out under your account.`,
          `One person, one account. Do not impersonate anyone, create deceptive profiles, share your login, or create accounts by automated means.`,
          `We may refuse, suspend or close an account where these Terms or the Acceptable Use Policy are breached, where we are required to by law, or where continued operation would put other members at risk.`,
        ],
      },
      {
        h: "4. What ARCA is — and what it is not",
        p: [
          `ARCA provides a platform on which members publish profiles, join communities, arrange and attend events, connect, and message one another. That is the whole of what we provide.`,
          `<strong>ARCA is not a party to anything members agree between themselves.</strong> We do not employ, endorse, supervise, vet, background-check, accredit or verify members, hosts, speakers or attendees, and we make no representation about any member's identity, qualifications, licences, insurance, solvency or conduct.`,
          `<strong>Nothing on ARCA is professional advice.</strong> Content posted by members or by us is general information only. It is not legal, financial, investment, tax, medical, employment or other professional advice, and must not be relied on as such. Take your own advice from a qualified professional before acting.`,
          `Any engagement, transaction, introduction, investment, hiring decision or business relationship you enter into with another member is entirely between you and them, at your own risk.`,
        ],
      },
      {
        h: "5. Events — read this before you host or attend",
        p: [
          `<strong>ARCA is not the organiser of member events.</strong> Where a member creates an event, that member — not ARCA — is the organiser and is solely responsible for it. ARCA provides the listing and registration tooling only.`,
          `Hosts are responsible for: the lawfulness, safety and suitability of their event; any venue, premises, equipment, catering or third-party supplier; obtaining any licence, permission or insurance required; complying with health, safety, fire, accessibility, food-safety and public-liability obligations; safeguarding attendees; and any duty of care owed to those attending.`,
          `Hosts must hold appropriate public liability insurance for in-person events. ARCA does not provide insurance of any kind and does not inspect venues.`,
          `Attendees participate voluntarily and at their own risk, and are responsible for their own safety, travel, insurance and belongings. Meeting people from the internet carries risk; meet in public where you can, tell someone where you are going, and use your judgement.`,
          `ARCA accepts no responsibility for what happens at, on the way to, or as a result of any event, including injury, loss, damage, cancellation, non-attendance, or the conduct of any host, attendee, venue or supplier — except to the extent liability cannot lawfully be excluded, as set out in section 12.`,
        ],
      },
      {
        h: "6. Your content and the licence you give us",
        p: [
          `You keep ownership of everything you post. You grant ARCA a worldwide, non-exclusive, royalty-free licence to host, store, reproduce, adapt for formatting and display, and communicate your content strictly for the purpose of operating, securing and promoting the service, for as long as you keep it on ARCA.`,
          `This licence ends when you delete the content or close your account, except for copies retained in backups for the period set out in the Data Retention Schedule, and except where we must keep material to comply with a legal obligation or to resolve a dispute.`,
          `You confirm that you own or are licensed to post your content, that it does not infringe anyone's rights, and that publishing it does not breach confidentiality or data-protection obligations you owe to anyone else. Do not post another person's personal information without their permission.`,
        ],
      },
      {
        h: "7. Our content",
        p: [
          `The ARCA name, logo, design, code, copy and structure belong to us or our licensors and are protected by intellectual-property law. You may use the service as intended; you may not copy, scrape, resell, frame, reverse-engineer or create derivative works from it without written permission.`,
          `Automated access — crawling, scraping, bulk downloading or harvesting member data — is prohibited except for well-behaved search-engine indexing of public pages as permitted by our robots.txt.`,
        ],
      },
      {
        h: "8. Membership, pricing and payment",
        p: [
          `Membership tiers and their prices are shown on the Pricing page. <strong>Paid subscriptions are not currently available and ARCA does not presently collect payment or card details from anyone.</strong>`,
          `The first ${FOUNDING_LIMIT} eligible accounts receive Founding Pro for the life of that account with no recurring subscription charge, subject to these Terms and to the account remaining in good standing.`,
          `Before any charge is ever introduced we will show you the price, billing period, applicable taxes, renewal behaviour and cancellation terms, and obtain your express agreement. We will not convert an existing free account into a paid one without your active consent.`,
          `Where an event involves a direct third-party cost — a venue, catering, a ticketing platform — that cost sits between you and that third party, not with ARCA, and must be disclosed on the event listing.`,
        ],
      },
      {
        h: "9. Acceptable use",
        p: [
          `Your use of ARCA is governed by our <a href="/legal/acceptable-use">Acceptable Use Policy</a> and <a href="/legal/community-guidelines">Community Guidelines</a>, which form part of these Terms. Breaching them is breaching this agreement.`,
        ],
      },
      {
        h: "10. Reporting, moderation and enforcement",
        p: [
          `You can block any member and report any member or event from within the product, or contact ${safetyContact}.`,
          `We review reports and may remove content, restrict features, suspend or close accounts, and where appropriate contact law enforcement. We aim to acknowledge reports within 72 hours and to act on serious safety reports as a priority.`,
          `We moderate reactively rather than pre-screening content. We are not obliged to monitor everything posted, and we do not guarantee that we will find or remove every piece of prohibited material.`,
          `If we take action against your account you may ask us to review that decision by replying to the notice we send you. We will consider appeals in good faith and respond in writing.`,
        ],
      },
      {
        h: "11. Availability and change",
        p: [
          `ARCA is provided "as is" and "as available". We do not promise that the service will be uninterrupted, error-free, secure against every threat, or that it will meet your requirements. We do not guarantee any particular professional result, introduction, attendance level or commercial outcome.`,
          `We may add, change, suspend or withdraw features, and we may stop providing the service altogether. Where we withdraw the service entirely we will give reasonable notice and a means to export your data, unless we are prevented from doing so by law or circumstances outside our control.`,
          `To the fullest extent permitted by law we exclude all warranties, conditions and representations that are not expressly set out in these Terms.`,
        ],
      },
      {
        h: "12. Limitation of liability",
        p: [
          `<strong>Nothing in these Terms limits or excludes our liability for:</strong> death or personal injury caused by our negligence; fraud or fraudulent misrepresentation; any liability that cannot lawfully be limited or excluded; or, where you deal with us as a consumer, your non-excludable statutory rights.`,
          `Subject to that, ARCA is not liable for: loss of profit, revenue, business, contracts, opportunity, goodwill, anticipated savings or data; any indirect or consequential loss; loss arising from the acts, omissions or content of any member, host, attendee, venue or third party; loss arising from your attendance at or hosting of any event; or any loss that was not reasonably foreseeable when this agreement began.`,
          `Subject to the first paragraph of this section, our total aggregate liability arising out of or in connection with this agreement, whether in contract, tort (including negligence), breach of statutory duty or otherwise, is limited to the greater of (a) the total amount you have paid ARCA in the twelve months before the claim arose, or (b) £100. Because ARCA is currently free to use, in most cases this will be £100.`,
          `Each part of this section operates separately. If any part is found unenforceable, the remaining parts continue to apply.`,
        ],
      },
      {
        h: "13. Indemnity",
        p: [
          `If you are using ARCA in the course of a business, you agree to indemnify ARCA against any claim, demand, loss, damage, cost or reasonable legal expense arising from your breach of these Terms, your content, your conduct towards other members, or any event you host. This section does not apply to your use of ARCA as a private individual acting as a consumer.`,
        ],
      },
      {
        h: "14. Ending the agreement",
        p: [
          `You may close your account at any time in Settings. Closing your account deletes your profile and personal data as described in the <a href="/legal/privacy">Privacy Policy</a> and the <a href="/legal/retention">Data Retention Schedule</a>.`,
          `We may suspend or close your account for breach of these Terms, for legal reasons, or on reasonable notice where we are withdrawing the service. Where it is safe and lawful to do so we will explain why.`,
          `Sections that by their nature should survive termination — content licence for retained backups, limitation of liability, indemnity, governing law — continue to apply after the agreement ends.`,
        ],
      },
      {
        h: "15. Changes to these Terms",
        p: [
          `We may update these Terms. The "last updated" date at the top of this page always reflects the current version. For material changes we will give reasonable advance notice by email or in-product before they take effect.`,
          `If you do not accept a change, close your account before it takes effect. Continuing to use ARCA after the effective date means the revised Terms apply to you.`,
        ],
      },
      {
        h: "16. Law, disputes and complaints",
        p: [
          `These Terms and any dispute arising from them are governed by the laws of England and Wales. Where you use ARCA as a consumer resident elsewhere, you keep the benefit of any mandatory protections of your home country that cannot be varied by agreement.`,
          `The courts of England and Wales have non-exclusive jurisdiction. Where you are a consumer you may also bring proceedings in the courts of your country of residence.`,
          `Please raise any complaint with us first at ${contact} — see our <a href="/legal/complaints">Complaints Procedure</a>. Most things are resolved quickly and informally.`,
        ],
      },
    ],
  },

  privacy: {
    title: "Privacy Policy",
    nav: "Privacy",
    summary: "What personal information ARCA holds, why we hold it, how long we keep it, and the control you have over it.",
    sections: [
      {
        h: "1. Who is responsible for your data",
        p: [
          `${operatorLine} is the data controller for the personal information described in this policy. ${escapeHtml(E.responsible)} is the adult responsible for how ARCA handles personal data.`,
          E.icoRegistration
            ? `Our Information Commissioner's Office registration number is ${escapeHtml(E.icoRegistration)}.`
            : `Where our processing requires registration with the Information Commissioner's Office, we will register and publish the reference here.`,
          `For any privacy question or request, contact ${privacyContact}.`,
        ],
      },
      {
        h: "2. What we collect",
        p: [
          `<strong>Account information:</strong> your name, email address, stated professional role, chosen sign-in method, and a cryptographic hash of your password. We never store your password itself.`,
          `<strong>Age confirmation:</strong> we ask your date of birth once, at sign-up, solely to check you meet the minimum age. We record only that the check passed — the date itself is not retained.`,
          `<strong>Profile information you choose to publish:</strong> tagline, description, links, city, country, what you are looking for, profile photo and banner image.`,
          `<strong>Activity:</strong> the communities you join, events you create or register for, connections you make, messages you send, and reports or blocks you submit.`,
          `<strong>Technical and security information:</strong> a hashed session token, IP address for rate limiting and abuse prevention, and server logs of requests and errors.`,
          `<strong>Analytics — only with your consent:</strong> if you opt in, privacy-minimised page-view counts. If you do not opt in, no analytics are collected at all.`,
          `If you sign in with Google, we receive your name, email address and Google account identifier. We never receive your Google password.`,
        ],
      },
      {
        h: "3. Why we use it, and our lawful basis",
        p: [
          `<strong>To provide ARCA</strong> — creating and securing your account, publishing your profile, running communities, events, connections and messages, and providing support. Lawful basis: performance of our contract with you.`,
          `<strong>To keep ARCA safe</strong> — preventing spam, fraud and abuse, enforcing our policies, investigating reports, and protecting members. Lawful basis: our legitimate interest in operating a safe network, and compliance with legal obligations where they apply.`,
          `<strong>To confirm you are old enough</strong> — the age check at sign-up. Lawful basis: compliance with a legal obligation and our legitimate interest in not operating a service for children.`,
          `<strong>To improve the service</strong> — aggregate page-view analytics. Lawful basis: your consent, which you may withdraw at any time in Cookie settings.`,
          `<strong>To communicate with you</strong> — service messages such as verification and password resets. Lawful basis: performance of our contract. We will ask for your consent separately before sending anything promotional.`,
        ],
      },
      {
        h: "4. Who can see what",
        p: [
          `Your completed profile is visible to other signed-in ARCA members. It is not published to the open web and we ask search engines not to index the member area.`,
          `What you post in a community or an event listing is visible to the members who can see that community or event. Direct messages are visible to you and the person you are messaging.`,
          `Please do not publish confidential information, or information about another person, without permission.`,
        ],
      },
      {
        h: "5. Who else receives it",
        p: [
          `We keep the number of third parties as small as we can. The current list — our hosting provider, our database, our email provider and, only if you opt in, our analytics provider — is published in full on the <a href="/legal/subprocessors">Sub-processors</a> page, and we update it when it changes.`,
          `We do not sell your personal information. We do not share it for advertising. We do not run behavioural advertising on ARCA.`,
          `We may disclose information where we are legally required to, or where it is necessary to establish, exercise or defend legal claims, or to protect someone's safety.`,
        ],
      },
      {
        h: "6. International transfers",
        p: [
          `We aim to keep personal data within the UK or European Economic Area. Where a provider processes data outside that area, we rely on UK adequacy regulations or on the International Data Transfer Agreement or Addendum together with appropriate supplementary measures. You can ask us which safeguard applies to a particular provider.`,
        ],
      },
      {
        h: "7. How long we keep it",
        p: [
          `Retention periods for each category of data are set out in the <a href="/legal/retention">Data Retention Schedule</a>. In summary: your account data is kept while your account is open and deleted within 30 days of closure; security logs are kept for 90 days; and backups roll off within 35 days.`,
        ],
      },
      {
        h: "8. Cookies and device storage",
        p: [
          `ARCA sets one essential cookie, <code>arca_session</code>, which keeps you signed in for up to 30 days. It is HttpOnly, Secure and SameSite=Lax, and contains a random token — no personal information.`,
          `We also use your browser's local storage to remember your cookie choice, your currency and billing display preference, and optionally your email address on the sign-in form if you tick the box. Your password is never stored.`,
          `No analytics or advertising cookies are set unless and until you choose "Accept analytics". Full detail is in the <a href="/legal/cookies">Cookie Policy</a>.`,
        ],
      },
      {
        h: "9. Your rights",
        p: [
          `You have the right to access your data, correct it, delete it, restrict or object to our processing of it, and to data portability. Where we rely on consent, you may withdraw it at any time without affecting processing already carried out.`,
          `Two of these are built into the product: <strong>Export my data</strong> in Settings gives you a complete machine-readable copy immediately, and <strong>Close my account</strong> deletes your data as described above.`,
          `For anything else, email ${privacyContact}. We respond within one month, and will tell you if we need longer because a request is complex.`,
          `If you are unhappy with how we have handled your information you can complain to the Information Commissioner's Office at <a href="https://ico.org.uk/make-a-complaint/" rel="noopener noreferrer" target="_blank">ico.org.uk/make-a-complaint</a>, or to your local supervisory authority. We would appreciate the chance to put it right first.`,
        ],
      },
      {
        h: "10. Security",
        p: [
          `We hash passwords with scrypt and per-password salts, compare them in constant time, store only hashed session tokens, transmit everything over HTTPS with HSTS, apply a strict Content-Security-Policy, validate and re-encode uploads, rate-limit sensitive endpoints, and check request origin on every state-changing call.`,
          `No online service can promise absolute security. If we suffer a breach that is likely to result in a risk to your rights and freedoms, we will notify the Information Commissioner's Office within 72 hours and tell affected members without undue delay — see our <a href="/legal/security">Security and Disclosure</a> page.`,
        ],
      },
      {
        h: "11. Children",
        p: [
          `ARCA is not intended for anyone under ${MINIMUM_AGE} and we do not knowingly collect their personal data. We apply an age check at sign-up. If we discover an account belongs to a child, we close it and delete the data. Contact ${privacyContact} if you believe this has happened.`,
        ],
      },
      {
        h: "12. Automated decisions",
        p: [
          `We do not make decisions producing legal or similarly significant effects about you by solely automated means. Rate limiting and spam filtering are automated but do not have that kind of effect, and a human reviews any account suspension.`,
        ],
      },
      {
        h: "13. Changes",
        p: [
          `We update this policy when what we do changes. The "last updated" date above always reflects the current version, and we will give notice of material changes by email or in-product before they take effect.`,
        ],
      },
    ],
  },

  "acceptable-use": {
    title: "Acceptable Use Policy",
    nav: "Acceptable use",
    summary: "The things you must not do on ARCA. Breaching this policy is breaching the Terms of Service.",
    sections: [
      {
        h: "1. Scope",
        p: [
          `This policy forms part of the <a href="/legal/terms">Terms of Service</a> and applies to everything you post, send, host or do on ARCA.`,
        ],
      },
      {
        h: "2. Do not post or send",
        list: [
          "Anything unlawful, or that promotes, facilitates or instructs unlawful activity.",
          "Harassment, bullying, stalking, threats, intimidation or targeted abuse of any person.",
          "Hate speech, or content attacking people based on race, ethnicity, national origin, religion, disability, age, sex, gender identity, sexual orientation or any other protected characteristic.",
          "Sexual content, sexualised imagery, or any sexual content involving minors — which we report to the authorities without exception.",
          "Content that incites or glorifies violence, self-harm, suicide or terrorism.",
          "Malware, exploits, phishing, or anything designed to compromise a system or deceive someone into giving up credentials.",
          "Another person's private or personal information without their permission, including doxxing.",
          "Confidential information you are not free to share.",
          "Content that infringes copyright, trademark, database rights or any other intellectual property right.",
          "Defamatory, knowingly false, or deliberately misleading statements.",
        ],
      },
      {
        h: "3. Do not use ARCA to",
        list: [
          "Send unsolicited bulk messages, chain messages, spam or repetitive promotional contact.",
          "Run pyramid schemes, multi-level marketing recruitment, 'get rich quick' schemes, or investment solicitations.",
          "Offer, request or facilitate regulated financial, legal, medical or immigration advice without holding the qualifications and authorisations you claim.",
          "Misrepresent your identity, employer, qualifications, licences or authority.",
          "Scrape, crawl, harvest or bulk-export member data by any means.",
          "Circumvent rate limits, access controls, blocks or account restrictions, including by creating additional accounts.",
          "Probe, scan or test the security of the service other than as permitted by our Security and Disclosure policy.",
          "Resell, sublicense or commercially exploit access to ARCA or to its members.",
          "Interfere with the service, overload infrastructure, or degrade anyone else's use of it.",
        ],
      },
      {
        h: "4. Events",
        p: [
          `If you host an event you must comply with the event obligations in section 5 of the <a href="/legal/terms">Terms</a>. Do not list an event you are not lawfully able to run, do not misrepresent what an event is, and do not use event listings to advertise something else.`,
        ],
      },
      {
        h: "5. Enforcement",
        p: [
          `We may remove content, restrict features, suspend or permanently close accounts, and report matters to law enforcement. We aim to make enforcement proportionate, and to tell you what happened and why, unless doing so would be unlawful or unsafe.`,
          `Report a breach from within the product, or at ${safetyContact}.`,
        ],
      },
    ],
  },

  "community-guidelines": {
    title: "Community Guidelines",
    nav: "Community",
    summary: "The character we are trying to protect. Less a rulebook than a description of how good rooms behave.",
    sections: [
      {
        h: "Be a real person",
        p: [
          `Use your real name and an accurate description of what you do. ARCA works because people can take each other at face value. Inventing credentials or a track record is the fastest way to lose an account here.`,
        ],
      },
      {
        h: "Give before you ask",
        p: [
          `The members who get the most from ARCA are the ones who answer questions, make introductions and show up for other people's events. Arriving only to pitch is noticed, and it does not work.`,
        ],
      },
      {
        h: "Disagree well",
        p: [
          `Argue with the idea, not the person. Strong disagreement stated plainly is welcome. Contempt, sarcasm at someone's expense and pile-ons are not.`,
        ],
      },
      {
        h: "Respect the room",
        p: [
          `What is said in a community or an event is shared in that context. Do not screenshot, republish or forward what someone said without asking. Do not bring a private conversation into public.`,
        ],
      },
      {
        h: "Message like an adult",
        p: [
          `You can only message people you are connected with. Keep first messages short, specific and relevant. If someone does not reply, that is an answer — do not follow up repeatedly.`,
        ],
      },
      {
        h: "Host with care",
        p: [
          `If you host, you are responsible for the room you create. Describe the event honestly, start on time, moderate it, and make sure people leave feeling it was worth their evening.`,
        ],
      },
      {
        h: "Look after each other",
        p: [
          `If something feels wrong, use the block and report tools — they are there to be used, and reports are read by a person. For anything involving immediate risk to someone's safety, contact your local emergency services first, then tell us at ${safetyContact}.`,
        ],
      },
    ],
  },

  cookies: {
    title: "Cookie Policy",
    nav: "Cookies",
    summary: "Exactly what ARCA stores on your device, and how to change it.",
    sections: [
      {
        h: "Our approach",
        p: [
          `ARCA sets one cookie, and it is strictly necessary. Nothing optional is stored until you choose it. We do not run advertising cookies, and we do not allow third parties to track you across other sites from here.`,
        ],
      },
      {
        h: "Strictly necessary",
        table: {
          head: ["Name", "Type", "Purpose", "Expires"],
          rows: [
            ["arca_session", "Cookie", "Keeps you signed in. Holds a random token, not personal data. HttpOnly, Secure, SameSite=Lax.", "30 days"],
            ["arca_oauth", "Cookie", "Short-lived anti-forgery value used only during Google sign-in.", "10 minutes"],
          ],
        },
        p: [`These cannot be switched off, because the service cannot keep you signed in without them.`],
      },
      {
        h: "Your preferences, stored on your device",
        table: {
          head: ["Name", "Type", "Purpose", "Expires"],
          rows: [
            ["arca-consent", "Local storage", "Remembers your analytics choice so we stop asking.", "Until cleared"],
            ["arca-currency", "Local storage", "Remembers the currency you chose on the Pricing page.", "Until cleared"],
            ["arca-billing", "Local storage", "Remembers monthly or yearly pricing display.", "Until cleared"],
            ["arca-email", "Local storage", "Only if you tick 'Remember my email'. The email address alone — never your password.", "Until cleared"],
            ["arca-motion", "Local storage", "Remembers if you asked us to reduce animation.", "Until cleared"],
          ],
        },
      },
      {
        h: "Analytics — off unless you say yes",
        p: [
          `If you choose "Accept analytics", we collect privacy-minimised page-view counts to understand which pages are useful. No cross-site tracking, no advertising profile, no sale of data.`,
          `You can change your mind at any time using the Cookie settings link in the footer, which reopens the choice and applies it immediately.`,
        ],
      },
    ],
  },

  retention: {
    title: "Data Retention Schedule",
    nav: "Retention",
    summary: "How long each category of data is kept, and what triggers its deletion.",
    sections: [
      {
        h: "Schedule",
        table: {
          head: ["Data", "Kept for", "Why"],
          rows: [
            ["Account record (name, email, role, plan)", "While the account is open; deleted within 30 days of closure", "Needed to provide the service"],
            ["Age-check confirmation", "While the account is open", "Evidence the age gate was applied"],
            ["Profile content and uploaded images", "While the account is open; deleted within 30 days of closure", "Published by you, for you"],
            ["Direct messages", "While either participant's account is open; removed with the last account", "Both sides need the conversation"],
            ["Event records you hosted", "Deleted with your account; attendees keep a record of attendance", "Attendees relied on the event"],
            ["Session tokens", "30 days maximum, or until sign-out", "Keeps you signed in"],
            ["Verification and reset tokens", "24 hours (verification), 1 hour (reset), or until used", "Single-use security tokens"],
            ["Security and access logs (including IP)", "90 days", "Abuse investigation and security"],
            ["Moderation reports and outcomes", "24 months after resolution", "Pattern detection and appeals"],
            ["Analytics page views (consented only)", "14 months, aggregated", "Understanding what is useful"],
            ["Encrypted backups", "Rolling 35 days", "Disaster recovery"],
          ],
        },
      },
      {
        h: "Deletion in practice",
        p: [
          `Closing your account removes your profile and personal data from the live service immediately and from backups as those backups roll off, within 35 days.`,
          `Some things cannot be unpicked cleanly. A direct message exists for two people, so it is removed when the last of those two accounts closes rather than when the first does. Where you hosted an event, the event goes with your account, but the fact that another member attended something remains part of their own record.`,
          `We may retain the minimum necessary beyond these periods where we must comply with a legal obligation, or to establish, exercise or defend a legal claim — for example, keeping a record that a specific account was closed for a safety breach so the same person cannot immediately return. Where we do this we keep the narrowest possible record, not the whole account.`,
        ],
      },
      {
        h: "How we chose these periods",
        p: [
          `Each period is the shortest one that still lets the service work. Security logs last 90 days because that is roughly how long it takes for a pattern of abuse to become visible. Moderation outcomes last 24 months because repeat behaviour is the thing we most need to catch, and because you may appeal. Backups last 35 days because that is one monthly cycle plus a margin for a failure discovered late.`,
          `Where we could not justify a period, we do not keep the data at all. That is why we ask for your date of birth once and store only the answer to the question "is this person old enough", and why declining analytics means nothing is recorded rather than recorded anonymously.`,
        ],
      },
      {
        h: "Asking us to delete something sooner",
        p: [
          `You do not have to wait for a retention period to expire. Email ${privacyContact} and tell us what you want removed. We will do it unless we have a legal reason not to, and if we cannot, we will tell you which reason applies.`,
          `You can also delete most things yourself at any time: edit or clear your profile fields, leave a community, withdraw from an event, or close your account entirely from Settings.`,
        ],
      },
    ],
  },

  subprocessors: {
    title: "Sub-processors",
    nav: "Sub-processors",
    summary: "Every third party that may process personal data on ARCA's behalf.",
    sections: [
      {
        h: "Current list",
        table: {
          head: ["Provider", "Purpose", "Data", "Location"],
          rows: [
            ["Hostinger International", "Application hosting and managed MySQL", "All service data", "EU / as selected"],
            ["Email delivery provider (SMTP)", "Verification and password-reset email only", "Name, email address", "Per provider"],
            ["Google LLC (only if you use Google sign-in)", "Authentication", "Name, email, account identifier", "US, under UK IDTA"],
            ["Privacy-focused analytics (only with consent)", "Aggregate page views", "Page path, referrer host", "EU"],
          ],
        },
      },
      {
        h: "What we require of them",
        p: [
          `Before a provider touches personal data we check four things: that there is a written contract containing data-protection terms, that they process data only on our documented instructions, that they apply appropriate technical and organisational security measures, and that any transfer outside the UK or EEA is covered by an adequacy decision or the International Data Transfer Agreement.`,
          `We also prefer providers who need the least. Our email provider receives a name and an address and nothing else; our analytics provider, if you consent to it, receives a page path and never an identifier.`,
        ],
      },
      {
        h: "Changes",
        p: [
          `We update this page before a new sub-processor starts processing personal data. If you would like advance notice of changes, email ${privacyContact} and we will add you to the notification list.`,
          `If you object to a new sub-processor, tell us. We will explain why we chose them and what the alternative would mean, and you are free to export your data and close your account if you are not satisfied.`,
        ],
      },
    ],
  },

  "intellectual-property": {
    title: "Intellectual Property & Takedown",
    nav: "IP & takedown",
    summary: "How to tell us that content on ARCA infringes your rights, and what we do about it.",
    sections: [
      {
        h: "Our position",
        p: [
          `We respect intellectual property and expect members to do the same. Posting material you do not have the right to post breaches the <a href="/legal/acceptable-use">Acceptable Use Policy</a>.`,
        ],
      },
      {
        h: "Making a complaint",
        p: [`Email ${contact} with the subject line "IP complaint" and include all of the following:`],
        list: [
          "Your name, postal address, email address and telephone number.",
          "Identification of the work you say has been infringed.",
          "The exact URL or location on ARCA of the material you are complaining about.",
          "A statement that you believe in good faith that the use is not authorised by the rights holder, its agent or the law.",
          "A statement that the information in your notice is accurate, and that you are the rights holder or authorised to act on their behalf.",
          "Your electronic or physical signature.",
        ],
        after: [
          `Incomplete notices slow things down. Knowingly making a false claim of infringement may expose you to liability.`,
        ],
      },
      {
        h: "What we do",
        p: [
          `We aim to review complete notices within 5 working days. Where a complaint appears well-founded we remove or disable access to the material and notify the member who posted it, including a copy of your notice.`,
        ],
      },
      {
        h: "Counter-notice",
        p: [
          `If your content was removed and you believe that was a mistake or that you hold the rights, reply to the notice we sent you with your reasoning and contact details. Where a counter-notice is well-founded we may restore the material and will tell the original complainant.`,
        ],
      },
      {
        h: "Repeat infringers",
        p: [
          `We close the accounts of members who repeatedly infringe the rights of others.`,
        ],
      },
    ],
  },

  security: {
    title: "Security & Responsible Disclosure",
    nav: "Security",
    summary: "How we protect the service, and how to report a vulnerability safely.",
    sections: [
      {
        h: "What we do",
        list: [
          "Passwords hashed with scrypt using per-password salts, compared in constant time.",
          "Session tokens stored only as SHA-256 hashes; the raw token exists only in your cookie.",
          "HttpOnly, Secure, SameSite=Lax session cookie with a 30-day maximum lifetime.",
          "HTTPS enforced with HSTS, plus a strict Content-Security-Policy with no inline scripts.",
          "Origin checking on every state-changing request, in addition to SameSite protection.",
          "Rate limiting on sign-up, sign-in, verification, password reset, messaging and reporting.",
          "Uploads validated by file signature, size-capped, stripped of metadata and served from a separate path with no execution rights.",
          "Single-use, short-lived, hashed tokens for email verification and password reset; all sessions invalidated on password change.",
          "Least-privilege database access and parameterised queries throughout.",
        ],
      },
      {
        h: "Reporting a vulnerability",
        p: [
          `Email ${safetyContact} with "Security" in the subject line. Tell us what you found, how to reproduce it, and what you think the impact is. We will acknowledge within 72 hours and keep you updated.`,
          `Please give us a reasonable opportunity to fix the issue before disclosing it publicly. We will credit you if you would like us to.`,
        ],
      },
      {
        h: "Testing rules",
        p: [`If you are testing in good faith and within these rules, we will not pursue action against you:`],
        list: [
          "Use only accounts you own. Do not access, modify or retain another member's data.",
          "No denial-of-service, no load or stress testing, no spam.",
          "No social engineering of members or staff, and no physical attacks.",
          "Stop as soon as you have confirmed a vulnerability, and report it.",
        ],
      },
      {
        h: "If something goes wrong",
        p: [
          `If we suffer a personal-data breach likely to result in a risk to people's rights and freedoms, we notify the Information Commissioner's Office within 72 hours of becoming aware, and tell affected members without undue delay, explaining what happened, what it means and what to do.`,
        ],
      },
    ],
  },

  complaints: {
    title: "Complaints Procedure",
    nav: "Complaints",
    summary: "How to raise a problem with us and what happens next.",
    sections: [
      {
        h: "Tell us first",
        p: [
          `Email ${contact} describing what happened, when, and what you would like us to do. Most issues are resolved quickly once someone reads them properly.`,
        ],
      },
      {
        h: "What we commit to",
        list: [
          "Acknowledge your complaint within 3 working days.",
          "Give you a substantive response within 20 working days, or explain why we need longer.",
          "Tell you what we found, what we are doing, and how to escalate if you are not satisfied.",
        ],
      },
      {
        h: "If you are still unhappy",
        p: [
          `For data protection matters you may complain to the Information Commissioner's Office at <a href="https://ico.org.uk/make-a-complaint/" rel="noopener noreferrer" target="_blank">ico.org.uk/make-a-complaint</a>.`,
          `For consumer matters you retain all of your statutory rights, and may bring proceedings as described in section 16 of the <a href="/legal/terms">Terms</a>.`,
        ],
      },
    ],
  },
};

export const LEGAL_ORDER = [
  "terms",
  "privacy",
  "acceptable-use",
  "community-guidelines",
  "cookies",
  "retention",
  "subprocessors",
  "intellectual-property",
  "security",
  "complaints",
];

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderTable(table) {
  const head = table.head.map((cell) => `<th scope="col">${escapeHtml(cell)}</th>`).join("");
  const rows = table.rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell, i) =>
            i === 0 ? `<th scope="row">${escapeHtml(cell)}</th>` : `<td>${escapeHtml(cell)}</td>`
          )
          .join("")}</tr>`
    )
    .join("");
  return `<div class="legal-table-scroll" tabindex="0" role="region" aria-label="Details"><table class="legal-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderSection(section, index) {
  const parts = [`<h2 id="s${index + 1}">${escapeHtml(section.h)}</h2>`];
  // Section bodies are authored above as trusted HTML containing deliberate
  // links and <strong>; member input never reaches this renderer.
  for (const paragraph of section.p || []) parts.push(`<p>${paragraph}</p>`);
  if (section.list) {
    parts.push(`<ul>${section.list.map((item) => `<li>${item}</li>`).join("")}</ul>`);
  }
  if (section.table) parts.push(renderTable(section.table));
  for (const paragraph of section.after || []) parts.push(`<p>${paragraph}</p>`);
  return `<section class="legal-section">${parts.join("")}</section>`;
}

export function renderLegalPage(slug, { nonceLess = true } = {}) {
  const doc = LEGAL_DOCS[slug];
  if (!doc) return null;

  const nav = LEGAL_ORDER.map(
    (key) =>
      `<a href="/legal/${key}"${key === slug ? ' aria-current="page" class="active"' : ""}>${escapeHtml(
        LEGAL_DOCS[key].nav
      )}</a>`
  ).join("");

  const contents = doc.sections
    .map((section, i) => `<li><a href="#s${i + 1}">${escapeHtml(section.h)}</a></li>`)
    .join("");

  const body = doc.sections.map(renderSection).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(doc.title)} — ARCA</title>
<meta name="description" content="${escapeHtml(doc.summary)}" />
<meta name="robots" content="index, follow" />
<link rel="canonical" href="/legal/${escapeHtml(slug)}" />
<link rel="icon" href="/images/logo.svg" type="image/svg+xml" />
<link rel="stylesheet" href="/css/fonts.css" />
<link rel="stylesheet" href="/css/tokens.css" />
<link rel="stylesheet" href="/css/legal.css" />
</head>
<body class="legal-body">
<a class="skip-link" href="#doc">Skip to content</a>
<header class="legal-header">
  <a class="legal-brand" href="/">
    <img src="/images/logo.svg" width="30" height="30" alt="" />
    <span>ARCA</span>
  </a>
  <a class="legal-back" href="/">Back to ARCA</a>
</header>
<div class="legal-shell">
  <aside class="legal-aside">
    <p class="legal-aside-title">Trust centre</p>
    <nav class="legal-nav" aria-label="Legal documents">${nav}</nav>
    <p class="legal-aside-title legal-aside-contents">On this page</p>
    <nav class="legal-contents" aria-label="Contents"><ol>${contents}</ol></nav>
  </aside>
  <main id="doc" class="legal-main">
    <p class="legal-eyebrow">ARCA Trust Centre</p>
    <h1>${escapeHtml(doc.title)}</h1>
    <p class="legal-summary">${escapeHtml(doc.summary)}</p>
    <p class="legal-meta">
      <span>Last updated ${escapeHtml(LEGAL_UPDATED)}</span>
      <span aria-hidden="true">·</span>
      <span>Operated by ${escapeHtml(E.entity)}</span>
    </p>
    <div class="legal-copy">${body}</div>
    <footer class="legal-footer">
      <p>This document describes how ARCA actually works. It is written in plain English and is not legal advice.</p>
      <p>Questions: ${contact}</p>
    </footer>
  </main>
</div>
</body>
</html>`;
}
