import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  Loader2,
  MessageSquare,
  LifeBuoy,
  Dumbbell,
  ShoppingBag,
} from "lucide-react";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { toast } from "sonner";

import PublicLayout from "@/components/PublicLayout";
import { useAuth } from "@/context/AuthContext";
import usePublic from "@/hooks/usePublic";
import { SITE } from "@/lib/site";
import { fadeUp, VP } from "@/components/home/animations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const SUBJECT_MAX = 200;
const MESSAGE_MAX = 5000;

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Your name is required")
    .max(120, "Name is too long"),
  email: z.email({
    error: (issue) =>
      issue.input === "" || issue.input === undefined
        ? "Email is required"
        : "Invalid email format",
  }),
  phone: z
    .string()
    .optional()
    .refine(
      (v) => !v?.trim() || !!parsePhoneNumberFromString(v, "NP")?.isValid(),
      "Invalid phone number",
    ),
  subject: z
    .string()
    .trim()
    .min(1, "Subject is required")
    .max(SUBJECT_MAX, `Subject must be under ${SUBJECT_MAX} characters`),
  message: z
    .string()
    .trim()
    .min(10, "Please write at least 10 characters")
    .max(MESSAGE_MAX, `Message must be under ${MESSAGE_MAX} characters`),
});

type ContactValues = z.infer<typeof contactSchema>;

const contactCards = [
  {
    icon: Mail,
    label: "Email us",
    value: SITE.supportEmail,
    href: `mailto:${SITE.supportEmail}`,
    hint: `We reply ${SITE.responseTime}.`,
  },
  {
    icon: Phone,
    label: "Call us",
    value: SITE.phone,
    href: `tel:${SITE.phoneHref}`,
    hint: "Sun–Fri, 9:00 AM – 6:00 PM (NPT).",
  },
  {
    icon: MapPin,
    label: "Visit us",
    value: SITE.addressLines.join(", "),
    href: null,
    hint: "Drop by during office hours.",
  },
];

const quickLinks = [
  {
    icon: ShoppingBag,
    title: "Order, delivery or refund issue?",
    body: "Include your order number in the message below and we'll pull up the details before we reply.",
    to: "/products",
    cta: "Browse shop",
  },
  {
    icon: LifeBuoy,
    title: "Want to join as a trainer?",
    body: "You don't need to write in — apply directly and our admin team will review your certifications.",
    to: "/become-trainer",
    cta: "Apply now",
  },
];

export default function Contact() {
  const { user } = useAuth();
  const { SubmitContactMessage } = usePublic();
  const submitMessage = SubmitContactMessage();

  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema) as Resolver<ContactValues>,
    defaultValues: { name: "", email: "", phone: "", subject: "", message: "" },
  });

  // Signed-in visitors shouldn't have to retype what we already know. Runs on
  // login state settling too, since `user` starts undefined while /auth/me loads.
  useEffect(() => {
    if (!user) return;
    form.reset({
      ...form.getValues(),
      name: form.getValues("name") || user.name || "",
      email: form.getValues("email") || user.email || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function onSubmit(values: ContactValues) {
    try {
      const res = await submitMessage.mutateAsync({
        name: values.name,
        email: values.email,
        phone: values.phone?.trim() || undefined,
        subject: values.subject,
        message: values.message,
      });
      toast.success(res?.message ?? "Message sent — we'll be in touch soon.");
      form.reset({
        name: user?.name ?? "",
        email: user?.email ?? "",
        phone: "",
        subject: "",
        message: "",
      });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const messageLength = form.watch("message")?.length ?? 0;

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary-950 px-6 py-20">
        <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={VP}
          className="relative z-10 mx-auto max-w-3xl text-center"
        >
          <span className="mb-4 inline-block rounded-full bg-primary-500/20 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-primary-300">
            Contact us
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            We'd love to hear from you
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-white/60">
            Questions about your plan, an order, or partnering with {SITE.name}?
            Send us a message and a real person will get back to you{" "}
            {SITE.responseTime}.
          </p>
        </motion.div>
      </section>

      {/* Contact detail cards */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={VP}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {contactCards.map((c) => (
              <Card key={c.label} className="border-gray-200">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
                    <c.icon className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                    {c.label}
                  </div>
                  {c.href ? (
                    <a
                      href={c.href}
                      className="mt-1 block break-words text-sm font-semibold text-gray-900 hover:text-emerald-700"
                    >
                      {c.value}
                    </a>
                  ) : (
                    <div className="mt-1 text-sm font-semibold text-gray-900">
                      {c.value}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-gray-500">{c.hint}</p>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Form + hours */}
      <section className="bg-white px-6 pb-24">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.4fr_1fr]">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={VP}
          >
            <Card className="border-gray-200">
              <CardContent className="p-6 sm:p-8">
                <div className="mb-6 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-xl font-bold tracking-tight text-gray-900">
                    Send us a message
                  </h2>
                </div>

                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                    noValidate
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Full name{" "}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Ram Bahadur" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Email <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="you@example.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone (optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="98XXXXXXXX" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Subject{" "}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Question about my order"
                                maxLength={SUBJECT_MAX}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Message <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              rows={6}
                              maxLength={MESSAGE_MAX}
                              placeholder="Tell us what you need help with. Include your order number if it's about a purchase."
                              {...field}
                            />
                          </FormControl>
                          <div className="flex items-center justify-between">
                            <FormMessage />
                            <span className="ml-auto text-xs text-gray-400">
                              {messageLength}/{MESSAGE_MAX}
                            </span>
                          </div>
                        </FormItem>
                      )}
                    />

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <Button
                        type="submit"
                        size="lg"
                        disabled={submitMessage.isPending}
                      >
                        {submitMessage.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending…
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" /> Send message
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-gray-500">
                        By sending this you agree to our{" "}
                        <Link
                          to="/terms"
                          className="font-medium text-emerald-700 hover:underline"
                        >
                          Terms
                        </Link>{" "}
                        and{" "}
                        <Link
                          to="/privacy"
                          className="font-medium text-emerald-700 hover:underline"
                        >
                          Privacy Policy
                        </Link>
                        .
                      </p>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={VP}
            className="space-y-5"
          >
            <Card className="border-gray-200">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900">
                    Office hours
                  </h3>
                </div>
                <ul className="space-y-2 text-sm">
                  {SITE.hours.map((h) => (
                    <li
                      key={h.days}
                      className="flex items-center justify-between gap-4 border-b border-dashed border-gray-100 pb-2 last:border-0 last:pb-0"
                    >
                      <span className="text-gray-500">{h.days}</span>
                      <span className="font-medium text-gray-900">
                        {h.time}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-gray-500">
                  All times are Nepal Standard Time (NPT).
                </p>
              </CardContent>
            </Card>

            {quickLinks.map((q) => (
              <Card key={q.title} className="border-gray-200">
                <CardContent className="p-6">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
                    <q.icon className="h-4 w-4 text-emerald-700" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {q.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
                    {q.body}
                  </p>
                  <Button
                    variant="link"
                    className="mt-2 h-auto p-0 text-emerald-700"
                    asChild
                  >
                    <Link to={q.to}>{q.cta} →</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}
