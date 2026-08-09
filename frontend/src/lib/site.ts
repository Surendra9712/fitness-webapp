/**
 * Company / contact details shown on the public Contact, Terms and Privacy
 * pages and in the footer.
 *
 * NOTE: these are placeholders — replace them with the real registered
 * details before going live. They live here (rather than inline in each page)
 * so there is exactly one place to update.
 */
export const SITE = {
  name: "SmartDietPro",
  legalName: "SmartDietPro Pvt. Ltd.",
  tagline: "Personalised nutrition, training and gear — in one place.",

  supportEmail: "support@smartdietpro.com",
  privacyEmail: "privacy@smartdietpro.com",
  phone: "+977 01-4123456",
  phoneHref: "+9770 14123456",

  addressLines: ["Kamalpokhari, Ward No. 1", "Kathmandu 44600, Nepal"],

  /** Displayed on the contact page; Nepal Standard Time. */
  hours: [
    { days: "Sunday – Friday", time: "9:00 AM – 6:00 PM" },
    { days: "Saturday", time: "Closed" },
  ],

  /** Typical first-response time quoted to visitors. */
  responseTime: "within 1–2 business days",

  /** Shown on the legal pages. */
  legalEffectiveDate: "25 July 2026",

  socials: [] as { label: string; href: string }[],
} as const;
