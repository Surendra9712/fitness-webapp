import { Link } from "react-router-dom";
import LegalPage, { type LegalSection } from "@/components/legal/LegalPage";
import { SITE } from "@/lib/site";

const sections: LegalSection[] = [
  {
    id: "overview",
    title: "Who we are and what this covers",
    body: (
      <>
        <p>
          <strong>{SITE.legalName}</strong> ("{SITE.name}", "we", "us") is the
          controller of the personal data described here. This policy explains
          what we collect when you use our website and web application, why we
          collect it, who we share it with, and the choices you have.
        </p>
        <p>
          It applies to trainees, trainers and visitors alike. Using the Service
          is also subject to our <Link to="/terms">Terms of Service</Link>.
        </p>
      </>
    ),
  },
  {
    id: "collect",
    title: "Data we collect",
    body: (
      <>
        <p>
          <strong>You give us directly:</strong>
        </p>
        <ul>
          <li>
            <strong>Account details</strong> — name, email address, password
            (stored only as a bcrypt hash), role, and profile photo.
          </li>
          <li>
            <strong>Profile and health data</strong> — date of birth, gender,
            height, weight, activity level, fitness goal, dietary preferences
            and restrictions, allergies, and any medical notes you choose to
            add.
          </li>
          <li>
            <strong>Activity logs</strong> — meals, exercises, water intake, and
            daily and weekly progress records.
          </li>
          <li>
            <strong>Trainer credentials</strong> — for trainer applicants:
            specialisation, years of experience, availability, biography, and
            uploaded certificate files.
          </li>
          <li>
            <strong>Orders and payments</strong> — items ordered, delivery
            address, phone number, payment method, and the transaction reference
            returned by the payment provider.
          </li>
          <li>
            <strong>Communications</strong> — chat messages and call records
            with your trainer, product and trainer reviews, and anything you
            send through our <Link to="/contact">contact form</Link> or by
            email.
          </li>
        </ul>
        <p>
          <strong>We collect automatically:</strong> basic technical data such
          as IP address, browser and device type, and timestamps of requests,
          which our servers log for security and troubleshooting.
        </p>
        <p>
          <strong>We do not collect</strong> your full card number or bank
          credentials. Card payments go directly to Stripe and wallet payments
          to eSewa; we receive only the outcome and a reference.
        </p>
      </>
    ),
  },
  {
    id: "sensitive",
    title: "Health data",
    body: (
      <p>
        Body metrics, dietary restrictions, allergies and medical notes are
        sensitive personal data. We collect them only because they are necessary
        to generate your plan and targets, we process them on the basis of your
        explicit consent given when you complete your profile, and you can
        withdraw that consent by clearing those fields or closing your account.
        Doing so may make personalised plans unavailable to you.
      </p>
    ),
  },
  {
    id: "why",
    title: "Why we use your data",
    body: (
      <ul>
        <li>
          <strong>To run your account</strong> — authentication, role-based
          access, and account security.
        </li>
        <li>
          <strong>To deliver the Service</strong> — calculate calorie and
          macronutrient targets, generate meal and exercise recommendations,
          build weekly reports, and let your trainer follow your progress.
        </li>
        <li>
          <strong>To match you with a trainer</strong> — share the profile data
          your assigned trainer needs to plan for you.
        </li>
        <li>
          <strong>To process orders and subscriptions</strong> — payment,
          delivery, invoicing, returns and refunds.
        </li>
        <li>
          <strong>To communicate</strong> — order and assignment notifications,
          plan updates, support replies, and service announcements.
        </li>
        <li>
          <strong>To keep the Service safe and lawful</strong> — prevent fraud
          and abuse, enforce our Terms, and meet accounting and legal
          obligations.
        </li>
        <li>
          <strong>To improve the Service</strong> — aggregated, non-identifying
          analysis of how features are used.
        </li>
      </ul>
    ),
  },
  {
    id: "sharing",
    title: "Who can see your data",
    body: (
      <>
        <ul>
          <li>
            <strong>Your assigned trainer</strong> sees your profile metrics,
            goals, logs and progress — only while the assignment is active.
          </li>
          <li>
            <strong>Our administrators</strong> can access account, order and
            support records to operate the platform.
          </li>
          <li>
            <strong>Other users</strong> see only what is inherently public:
            your display name and photo on reviews, and, for trainers, your
            public profile.
          </li>
          <li>
            <strong>Service providers</strong> acting on our instructions —
            payment processors (eSewa, Stripe), hosting and database providers,
            email/notification delivery, and the nutrition data and AI providers
            behind food search and recommendations.
          </li>
          <li>
            <strong>Authorities</strong>, where we are legally required to
            disclose, or to establish or defend legal claims.
          </li>
          <li>
            <strong>A buyer or successor</strong>, if the business is
            reorganised, merged or sold — with notice to you beforehand.
          </li>
        </ul>
        <p>
          <strong>We never sell your personal data</strong>, and we do not share
          it with advertisers.
        </p>
      </>
    ),
  },
  {
    id: "ai-processing",
    title: "Automated processing and AI",
    body: (
      <p>
        Meal and exercise recommendations, food recognition and the AI assistant
        process your profile and log data automatically to produce suggestions.
        Where an external AI or nutrition provider is involved, we send only the
        data needed for that request and never your contact details or payment
        information. These features are advisory: they do not make decisions
        with legal or similarly significant effects, and a human — you, your
        trainer, or an administrator — remains in control of what you actually
        do.
      </p>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and local storage",
    body: (
      <p>
        We use browser local storage to hold your session token so you stay
        signed in, and to remember your shopping cart between visits. These are
        strictly necessary for the Service to function. We do not use
        advertising or cross-site tracking cookies. Clearing your browser
        storage signs you out and empties your cart.
      </p>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: (
      <ul>
        <li>
          <strong>Account, profile and log data</strong> — for as long as your
          account is open.
        </li>
        <li>
          <strong>After you close your account</strong> — deleted or anonymised
          within 90 days, apart from the exceptions below.
        </li>
        <li>
          <strong>Order and payment records</strong> — retained for up to 7
          years to satisfy tax and accounting law.
        </li>
        <li>
          <strong>Contact-form messages</strong> — retained for up to 24 months
          so we have context if you write to us again.
        </li>
        <li>
          <strong>Security logs</strong> — retained for up to 12 months.
        </li>
      </ul>
    ),
  },
  {
    id: "security",
    title: "How we protect it",
    body: (
      <p>
        Passwords are hashed with bcrypt and never stored in readable form.
        Access is controlled by signed, expiring session tokens and enforced
        per-role, so a trainer cannot reach data outside their assignments.
        Traffic is encrypted in transit, uploads are type- and size-restricted,
        and administrative access is limited to staff who need it. No system is
        perfectly secure, so please use a strong, unique password and tell us at
        once if you suspect a problem with your account.
      </p>
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    body: (
      <>
        <p>You can ask us to:</p>
        <ul>
          <li>give you a copy of the personal data we hold about you;</li>
          <li>
            correct anything inaccurate — most fields you can edit yourself in
            your profile;
          </li>
          <li>
            delete your account and data, subject to the retention periods
            above;
          </li>
          <li>restrict or object to particular processing; or</li>
          <li>withdraw a consent you previously gave.</li>
        </ul>
        <p>
          Email <a href={`mailto:${SITE.privacyEmail}`}>{SITE.privacyEmail}</a>{" "}
          and we will respond within 30 days. We may need to verify your
          identity before acting on a request.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        The Service is not intended for children under 16, and we do not
        knowingly collect their data. If you believe a child has given us
        personal data, contact{" "}
        <a href={`mailto:${SITE.privacyEmail}`}>{SITE.privacyEmail}</a> and we
        will delete it.
      </p>
    ),
  },
  {
    id: "transfers",
    title: "International transfers",
    body: (
      <p>
        We are based in Nepal, but some of our providers — hosting, payment and
        AI services — operate servers in other countries. Where data leaves
        Nepal we rely on contractual protections with those providers requiring
        them to keep it confidential and to process it only on our instructions.
      </p>
    ),
  },
];

export default function Privacy() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro={`What ${SITE.name} collects about you — including body metrics and dietary data — why we need it, who can see it, how long we keep it, and how to get it removed.`}
      sections={sections}
      contactEmail={SITE.privacyEmail}
    />
  );
}
