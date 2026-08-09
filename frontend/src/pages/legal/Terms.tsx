import { Link } from "react-router-dom";
import LegalPage, { type LegalSection } from "@/components/legal/LegalPage";
import { SITE } from "@/lib/site";

const sections: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance of these terms",
    body: (
      <>
        <p>
          These Terms of Service ("Terms") are an agreement between you and{" "}
          <strong>{SITE.legalName}</strong> ("{SITE.name}", "we", "us"),
          covering your use of our website, web application, and the coaching,
          nutrition and e-commerce services offered through them (together, the
          "Service").
        </p>
        <p>
          By creating an account, placing an order, or otherwise using the
          Service, you confirm that you have read and accept these Terms and our{" "}
          <Link to="/privacy">Privacy Policy</Link>. If you do not agree, please
          do not use the Service.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "Eligibility",
    body: (
      <>
        <p>
          You must be at least 16 years old to hold a trainee account. Trainer
          applicants must be at least 25 years old and able to evidence the
          certifications they submit. If you are under 18, you may only use the
          Service with the consent and supervision of a parent or legal
          guardian.
        </p>
        <p>
          You may not use the Service if a doctor has advised you against
          physical exercise or dietary change, unless you have their clearance.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Accounts and roles",
    body: (
      <>
        <p>The Service has three account types:</p>
        <ul>
          <li>
            <strong>Trainee</strong> — receives plans, logs meals, exercise and
            water intake, buys products, and can request a trainer.
          </li>
          <li>
            <strong>Trainer</strong> — an independently certified professional
            who is verified by us and then builds and monitors plans for
            assigned trainees.
          </li>
          <li>
            <strong>Administrator</strong> — our staff, who manage the
            catalogue, verify trainers, approve assignments and subscriptions,
            and handle support.
          </li>
        </ul>
        <p>
          You are responsible for the accuracy of the information you give us,
          for keeping your password confidential, and for everything that
          happens under your account. Tell us immediately at{" "}
          <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> if you
          suspect unauthorised access. One person, one account — accounts may
          not be shared, sold or transferred.
        </p>
      </>
    ),
  },
  {
    id: "health-disclaimer",
    title: "Health disclaimer — please read",
    body: (
      <>
        <p>
          <strong>
            {SITE.name} does not provide medical advice, diagnosis or treatment.
          </strong>{" "}
          Diet plans, workout plans, calorie and macronutrient targets, weekly
          reports and any other output of the Service are general wellness
          information, not clinical guidance, and they are no substitute for
          consultation with a qualified physician, registered dietitian or other
          healthcare professional.
        </p>
        <p>
          Consult a doctor before starting any new exercise or nutrition
          programme, especially if you are pregnant or nursing, or if you have
          or suspect a heart condition, diabetes, an eating disorder, a food
          allergy, an injury, or any other medical condition. If you feel unwell
          while following a plan, stop immediately and seek medical help.
        </p>
        <p>
          You participate in all physical activity at your own risk, and you are
          responsible for verifying that any food recommended to you is safe for
          your allergies and conditions.
        </p>
      </>
    ),
  },
  {
    id: "trainers",
    title: "Trainer services and matching",
    body: (
      <>
        <p>
          Trainers on {SITE.name} are independent professionals, not our
          employees. We verify the certifications they upload and may remove a
          trainer at any time, but we do not guarantee any particular trainer's
          availability, methods or results. The advice a trainer gives you is
          their own.
        </p>
        <p>
          A trainee-trainer match begins with a request, is accepted by the
          trainer, and is confirmed by an administrator. Either side may end an
          assignment; an administrator may also end one, for example after a
          complaint.
        </p>
        <p>
          In-app chat and calls exist so you can discuss your plan. Do not use
          them to arrange payments outside the Service, to share other people's
          personal data, or to send abusive or unlawful content.
        </p>
      </>
    ),
  },
  {
    id: "ai",
    title: "AI-generated recommendations",
    body: (
      <>
        <p>
          Parts of the Service — meal and exercise suggestions, food search and
          recognition, the AI assistant and weekly summaries — are produced
          automatically from the profile data and logs you provide, with the
          help of nutrition databases and machine-learning models.
        </p>
        <p>
          These outputs can be incomplete, out of date or simply wrong.
          Nutrition figures in particular are estimates and will vary with
          portion size, brand and preparation. Always apply your own judgement,
          and defer to your trainer or doctor over an automated suggestion.
        </p>
      </>
    ),
  },
  {
    id: "subscriptions",
    title: "Subscriptions",
    body: (
      <>
        <p>
          Some features require a paid subscription. The current fee, billing
          period and inclusions are shown on the subscription page before you
          pay, and that page prevails over any other description.
        </p>
        <p>
          Subscriptions may need administrator approval before they activate,
          for example where payment is confirmed manually. If a subscription
          request is rejected, any amount you have paid is refunded through the
          original payment method.
        </p>
        <p>
          Unless stated otherwise at checkout, fees are quoted in Nepalese
          Rupees (NPR), are inclusive of applicable taxes, and are
          non-refundable for the portion of a period already used. You can stop
          a subscription from renewing at any time; access continues until the
          end of the period you have paid for.
        </p>
      </>
    ),
  },
  {
    id: "orders",
    title: "Products, orders and payment",
    body: (
      <>
        <p>
          Product listings are an invitation to order, not an offer. We accept
          your order when we confirm it; until then we may decline it — for
          example if an item is out of stock or a price was listed in error.
        </p>
        <p>
          We accept cash on delivery, <strong>eSewa</strong>, and card payment
          via <strong>Stripe</strong>. Card and wallet payments are handled by
          those providers, and we never receive or store your full card details.
          Title and risk in goods pass to you on delivery.
        </p>
        <p>
          You may cancel an order at no cost before it is dispatched. After
          delivery, unopened and unused items in their original packaging may be
          returned within 7 days of receipt; consumables such as supplements
          cannot be returned once opened, for hygiene reasons. Faulty or
          incorrectly supplied items are replaced or refunded in full. Contact{" "}
          <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> with
          your order number to start a return.
        </p>
      </>
    ),
  },
  {
    id: "promos",
    title: "Promo codes and reward points",
    body: (
      <>
        <p>
          Promo codes and reward points have no cash value, cannot be exchanged
          for cash, and may carry usage limits, minimum spends or expiry dates.
          We may withdraw or adjust a code, and cancel points, where we
          reasonably believe they have been obtained or used abusively — for
          example through duplicate accounts or cancelled-and-rebooked orders.
        </p>
      </>
    ),
  },
  {
    id: "conduct",
    title: "Acceptable use",
    body: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>
            impersonate anyone, or misrepresent your qualifications, identity or
            health information;
          </li>
          <li>
            upload unlawful, misleading, defamatory, obscene or infringing
            content, or anyone else's personal data without their consent;
          </li>
          <li>
            scrape, resell or redistribute plans, exercise or food data, or any
            other part of the Service;
          </li>
          <li>
            attempt to bypass authentication or role restrictions, probe or
            attack our infrastructure, or upload malicious files; or
          </li>
          <li>
            use the Service to give medical advice if you are not qualified to
            do so.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "content",
    title: "Your content and reviews",
    body: (
      <>
        <p>
          You keep ownership of what you upload — profile photos, logs, chat
          messages, product and trainer reviews. You grant us a non-exclusive,
          royalty-free licence to host, store and display that content as needed
          to operate the Service, and to show reviews publicly alongside your
          display name.
        </p>
        <p>
          Reviews must reflect genuine experience. We may remove content that
          breaches these Terms, and we may remove or suspend reviews that appear
          to be incentivised or fake.
        </p>
      </>
    ),
  },
  {
    id: "ip",
    title: "Our intellectual property",
    body: (
      <p>
        The Service, including its software, design, text, logos and curated
        exercise and food libraries, belongs to {SITE.legalName} or its
        licensors and is protected by intellectual property law. We grant you a
        limited, personal, non-transferable licence to use the Service for its
        intended purpose. Nothing here transfers ownership of anything to you.
      </p>
    ),
  },
  {
    id: "availability",
    title: "Availability and changes to the Service",
    body: (
      <p>
        We aim to keep the Service running but do not promise uninterrupted
        availability; maintenance, outages of third-party providers, and factors
        outside our control can all interrupt it. We may add, change or withdraw
        features. Where a change materially reduces what a paid subscription
        offers, we will tell subscribers in advance.
      </p>
    ),
  },
  {
    id: "suspension",
    title: "Suspension and termination",
    body: (
      <>
        <p>
          You may close your account at any time by contacting us. We may
          suspend or terminate an account that breaches these Terms, that we are
          required to act against by law, or that poses a risk to other users —
          normally with notice, and immediately where the breach is serious.
        </p>
        <p>
          On termination your right to use the Service stops. We retain records
          we are legally required to keep, as described in the{" "}
          <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </>
    ),
  },
];

export default function Terms() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      intro={`The rules for using ${SITE.name} — your account, our trainers and AI features, purchases, subscriptions, and the limits of what we can be responsible for.`}
      sections={sections}
      contactEmail={SITE.supportEmail}
    />
  );
}
