"""Outbound email over SMTP, using only the standard library.

SMTP is optional. When SMTP_HOST is not configured, `send_email` writes the
message to the server log instead of raising — a developer running the app
locally can still complete a password reset by copying the link out of the
console, and a misconfigured mail server never turns into a 500 on an endpoint
whose real job is something else.
"""

import os
import smtplib
import ssl
from email.message import EmailMessage


def _env(name: str, default: str = '') -> str:
    return (os.getenv(name) or default).strip()


def is_configured() -> bool:
    return bool(_env('SMTP_HOST'))


def send_email(to: str, subject: str, text_body: str, html_body: str = None) -> bool:
    """Send one email. Returns True if it was handed to the SMTP server.

    Never raises: callers treat email as best-effort delivery.
    """
    host = _env('SMTP_HOST')
    from_addr = _env('SMTP_FROM') or _env('SMTP_USER') or 'no-reply@smartdiet.local'

    if not host:
        print(
            f"[mailer] SMTP_HOST not set — email not sent.\n"
            f"         To      : {to}\n"
            f"         Subject : {subject}\n"
            f"         Body    :\n{text_body}"
        )
        return False

    port = int(_env('SMTP_PORT', '587'))
    user = _env('SMTP_USER')
    password = _env('SMTP_PASSWORD')
    # Port 465 is implicit TLS; everything else starts plaintext and upgrades
    # with STARTTLS unless explicitly disabled (e.g. a local test relay).
    use_ssl = _env('SMTP_USE_SSL', 'true' if port == 465 else 'false').lower() == 'true'
    use_starttls = _env('SMTP_USE_TLS', 'false' if use_ssl else 'true').lower() == 'true'

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = from_addr
    msg['To'] = to
    msg.set_content(text_body)
    if html_body:
        msg.add_alternative(html_body, subtype='html')

    try:
        if use_ssl:
            server = smtplib.SMTP_SSL(host, port, timeout=15, context=ssl.create_default_context())
        else:
            server = smtplib.SMTP(host, port, timeout=15)
        with server:
            if use_starttls:
                server.starttls(context=ssl.create_default_context())
            if user:
                server.login(user, password)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"[mailer] Failed to send email to {to}: {e}")
        return False


def send_password_reset(to: str, name: str, reset_url: str, expires_minutes: int) -> bool:
    subject = 'Reset your SmartDiet Pro password'
    text_body = (
        f"Hi {name},\n\n"
        f"We received a request to reset your SmartDiet Pro password.\n"
        f"Open the link below to choose a new one:\n\n"
        f"{reset_url}\n\n"
        f"This link expires in {expires_minutes} minutes and can only be used once.\n"
        f"If you did not request a reset, you can ignore this email — your "
        f"password stays unchanged.\n\n"
        f"— SmartDiet Pro"
    )
    html_body = f"""\
<html>
  <body style="margin:0;padding:24px;background:#f6f7f9;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <h2 style="margin:0 0 16px;font-size:20px;">Reset your password</h2>
      <p style="margin:0 0 16px;font-size:14px;line-height:22px;">Hi {name},</p>
      <p style="margin:0 0 24px;font-size:14px;line-height:22px;">
        We received a request to reset your SmartDiet Pro password. Choose a new
        one using the button below.
      </p>
      <p style="margin:0 0 24px;">
        <a href="{reset_url}"
           style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;
                  padding:12px 22px;border-radius:8px;font-size:14px;font-weight:bold;">
          Reset password
        </a>
      </p>
      <p style="margin:0 0 8px;font-size:12px;color:#6b7280;line-height:20px;">
        This link expires in {expires_minutes} minutes and can only be used once.
      </p>
      <p style="margin:0;font-size:12px;color:#6b7280;line-height:20px;">
        If you did not request a reset, ignore this email — your password stays unchanged.
      </p>
    </div>
  </body>
</html>
"""
    return send_email(to, subject, text_body, html_body)
