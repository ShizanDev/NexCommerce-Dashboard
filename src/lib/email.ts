import nodemailer from 'nodemailer'

// ─── Configuration (read from .env only — not from database) ─────────
// Owner configures email in .env — customers never see this.
// Gmail SMTP is the default and recommended provider.

const GMAIL_EMAIL = process.env.GMAIL_EMAIL || ''
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || ''

// ─── Module-level cache ────────────────────────────────────────────

let transporterInstance: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  if (!GMAIL_EMAIL || !GMAIL_APP_PASSWORD) return null

  if (!transporterInstance) {
    console.log(`📧 Creating Gmail SMTP transporter for ${GMAIL_EMAIL}`)
    transporterInstance = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_EMAIL,
        pass: GMAIL_APP_PASSWORD,
      },
    })
  }

  return transporterInstance
}

// ─── Public helpers ─────────────────────────────────────────────────

/**
 * Check if email is configured via .env
 */
export function isEmailConfigured(): boolean {
  return !!(GMAIL_EMAIL && GMAIL_APP_PASSWORD)
}

/**
 * Returns email provider info
 */
export function getEmailProviderInfo(): {
  provider: 'gmail' | 'none'
  fromEmail: string
  configured: boolean
} {
  if (GMAIL_EMAIL && GMAIL_APP_PASSWORD) {
    return { provider: 'gmail', fromEmail: GMAIL_EMAIL, configured: true }
  }
  return { provider: 'none', fromEmail: '', configured: false }
}

/**
 * Reset email client (if credentials change)
 */
export function resetEmailClient(): void {
  transporterInstance = null
}

// ─── Core: Send OTP Email ──────────────────────────────────────────

export async function sendOtpEmail(
  to: string,
  otp: string,
  purpose: string
): Promise<{ sent: boolean; error?: string; errorDetail?: string; provider?: string }> {
  try {
    const subject =
      purpose === 'signup'
        ? 'Verify Your Email — WC Dashboard'
        : 'Login Verification — WC Dashboard'

    const html = generateOtpHtml(otp, purpose)

    // ── Try Gmail SMTP ──
    const transporter = getTransporter()
    if (transporter) {
      console.log(`📧 Sending OTP via Gmail SMTP to ${to} from ${GMAIL_EMAIL}...`)

      const info = await transporter.sendMail({
        from: `WC Dashboard <${GMAIL_EMAIL}>`,
        to,
        subject,
        html,
      })

      console.log(`✅ OTP sent via Gmail to ${to} (MessageId: ${info.messageId})`)
      return { sent: true, provider: 'gmail' }
    }

    // ── Fallback: Sandbox mode ──
    console.log(`📧 [SANDBOX] OTP for ${to} (${purpose}): ${otp}`)
    console.log(`📧 [SANDBOX] Email not configured. Set GMAIL_EMAIL and GMAIL_APP_PASSWORD in .env`)
    return {
      sent: false,
      error: 'No email service configured',
      errorDetail:
        'Gmail SMTP is not configured. Set GMAIL_EMAIL and GMAIL_APP_PASSWORD environment variables to send real OTP emails.',
    }
  } catch (err) {
    console.error('❌ Email send error:', err)
    const msg = err instanceof Error ? err.message : 'Unknown error'
    const detail = getGmailErrorDetail(msg)
    return { sent: false, error: msg, errorDetail: detail }
  }
}

// ─── Test email connection ──────────────────────────────────────────

export async function testEmailConnection(
  toEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = getTransporter()
    if (!transporter) {
      return { success: false, error: 'Gmail SMTP is not configured in .env' }
    }

    console.log(`📧 Sending test email to ${toEmail}...`)

    const info = await transporter.sendMail({
      from: `WC Dashboard <${GMAIL_EMAIL}>`,
      to: toEmail,
      subject: 'Test Email — WC Dashboard',
      html: `
        <div style="padding: 32px; text-align: center; font-family: sans-serif;">
          <h1 style="color: #059669;">✅ Gmail SMTP Test Successful!</h1>
          <p style="color: #64748b; margin-top: 12px;">Your email configuration is working correctly.</p>
          <p style="color: #94a3b8; margin-top: 24px; font-size: 12px;">Sent from WC Dashboard via Gmail SMTP</p>
        </div>
      `,
    })

    console.log(`✅ Test email sent (MessageId: ${info.messageId})`)
    return { success: true }
  } catch (err) {
    console.error('❌ Test email error:', err)
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: msg }
  }
}

// ─── HTML Template ─────────────────────────────────────────────────

function generateOtpHtml(otp: string, purpose: string): string {
  const title =
    purpose === 'signup'
      ? 'Verify Your Email — WC Dashboard'
      : 'Login Verification — WC Dashboard'
  const heading =
    purpose === 'signup' ? 'Verify Your Email Address' : 'Login Verification'
  const description =
    purpose === 'signup'
      ? 'Thank you for creating an account! Please use the verification code below to complete your registration.'
      : 'We detected a login attempt to your account. Please verify your identity by entering the code below.'

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="480" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden;">
              <tr>
                <td style="background: linear-gradient(135deg, #059669, #0d9488); padding: 32px 40px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">WC Dashboard</h1>
                  <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">WooCommerce Order Management</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <p style="margin: 0 0 8px; color: #334155; font-size: 16px; font-weight: 600;">${heading}</p>
                  <p style="margin: 0 0 28px; color: #64748b; font-size: 14px; line-height: 1.6;">${description}</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="background-color: #f0fdf4; border: 2px dashed #059669; border-radius: 12px; padding: 24px;">
                        <span style="font-size: 36px; font-weight: 800; color: #059669; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</span>
                      </td>
                    </tr>
                  </table>
                  <p style="margin: 20px 0 0; color: #64748b; font-size: 13px; text-align: center;">
                    This code expires in <strong style="color: #059669;">5 minutes</strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f8fafc; padding: 20px 40px; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
                    If you didn't request this code, you can safely ignore this email.
                  </p>
                  <p style="margin: 8px 0 0; color: #94a3b8; font-size: 12px; text-align: center;">
                    &copy; ${new Date().getFullYear()} WC Dashboard
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

// ─── Error detail helper ─────────────────────────────────────────────

function getGmailErrorDetail(message: string): string {
  if (message.includes('Invalid login') || message.includes('authentication'))
    return 'Gmail login failed. Check your GMAIL_EMAIL and GMAIL_APP_PASSWORD in .env. Note: Regular Gmail password will NOT work — you must use an App Password from myaccount.google.com/apppasswords.'
  if (message.includes('ETIMEDOUT') || message.includes('ENOTFOUND') || message.includes('network'))
    return 'Could not connect to Gmail SMTP server. Check your internet connection.'
  if (message.includes('Too many') || message.includes('rate'))
    return 'Gmail rate limit reached. Please wait a few minutes before sending more emails.'
  if (message.includes('User not found') || message.includes('No such user'))
    return 'The Gmail address does not exist. Check the GMAIL_EMAIL in .env.'
  return message || 'Unknown Gmail error'
}
