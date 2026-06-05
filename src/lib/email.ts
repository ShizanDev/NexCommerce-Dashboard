import nodemailer from 'nodemailer'
import { Resend } from 'resend'
import { db } from '@/lib/db'

// ─── Module-level state ───────────────────────────────────────────
let nodemailerInstance: nodemailer.Transporter | null = null
let nodemailerUser: string | null = null

let resendInstance: Resend | null = null
let cachedResendApiKey: string | null = null

// ─── Public helpers ───────────────────────────────────────────────

/**
 * Reset all email clients (called after settings change)
 */
export function resetEmailClient(): void {
  nodemailerInstance = null
  nodemailerUser = null
  resendInstance = null
  cachedResendApiKey = null
  console.log('📧 All email clients reset')
}

/**
 * Returns the configured email provider name
 */
export async function getEmailProviderInfo(): Promise<{
  provider: 'gmail' | 'resend' | 'none'
  fromEmail: string
  configured: boolean
}> {
  const gmail = await getGmailConfig()
  const resendKey = await getResendApiKey()

  if (gmail.email && gmail.password) {
    return { provider: 'gmail', fromEmail: gmail.email, configured: true }
  }
  if (resendKey) {
    const from = await getResendFromEmail()
    return { provider: 'resend', fromEmail: from, configured: true }
  }
  return { provider: 'none', fromEmail: '', configured: false }
}

/**
 * Check if email is configured at all
 */
export async function isEmailConfigured(): Promise<boolean> {
  const gmail = await getGmailConfig()
  if (gmail.email && gmail.password) return true

  const resendKey = await getResendApiKey()
  return !!resendKey
}

// ─── Gmail SMTP Configuration ─────────────────────────────────────

async function getGmailConfig(): Promise<{ email: string; password: string }> {
  try {
    const emailSetting = await db.systemSettings.findUnique({ where: { key: 'gmail_email' } })
    const passSetting = await db.systemSettings.findUnique({ where: { key: 'gmail_app_password' } })

    const email = emailSetting?.value || process.env.GMAIL_EMAIL || ''
    const password = passSetting?.value || process.env.GMAIL_APP_PASSWORD || ''

    return { email, password }
  } catch {
    return { email: process.env.GMAIL_EMAIL || '', password: process.env.GMAIL_APP_PASSWORD || '' }
  }
}

async function getGmailTransporter(): Promise<nodemailer.Transporter | null> {
  try {
    const { email, password } = await getGmailConfig()

    if (!email || !password) return null

    // Detect config change
    if (nodemailerUser !== email) {
      console.log(`📧 Creating Gmail SMTP transporter for ${email}`)
      nodemailerInstance = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: email,
          pass: password,
        },
      })
      nodemailerUser = email
    }

    return nodemailerInstance
  } catch (err) {
    console.error('❌ getGmailTransporter failed:', err instanceof Error ? err.message : err)
    return null
  }
}

// ─── Resend Configuration ────────────────────────────────────────

async function getResendApiKey(): Promise<string | null> {
  try {
    const setting = await db.systemSettings.findUnique({ where: { key: 'resend_api_key' } })
    return setting?.value || process.env.RESEND_API_KEY || null
  } catch {
    return process.env.RESEND_API_KEY || null
  }
}

async function getResendFromEmail(): Promise<string> {
  try {
    const setting = await db.systemSettings.findUnique({ where: { key: 'email_from' } })
    return setting?.value || process.env.EMAIL_FROM || 'onboarding@resend.dev'
  } catch {
    return process.env.EMAIL_FROM || 'onboarding@resend.dev'
  }
}

async function getResendClient(): Promise<Resend | null> {
  try {
    const apiKey = await getResendApiKey()
    if (!apiKey) return null

    if (cachedResendApiKey !== apiKey) {
      resendInstance = new Resend(apiKey)
      cachedResendApiKey = apiKey
    }

    if (!resendInstance) {
      resendInstance = new Resend(apiKey)
      cachedResendApiKey = apiKey
    }

    return resendInstance
  } catch {
    return null
  }
}

// ─── Core: Send OTP Email ──────────────────────────────────────────

export async function sendOtpEmail(
  to: string,
  otp: string,
  purpose: string
): Promise<{ sent: boolean; error?: string; errorDetail?: string; provider?: string }> {
  try {
    const subject = purpose === 'signup'
      ? 'Verify Your Email — WC Dashboard'
      : 'Login Verification — WC Dashboard'

    const html = generateOtpHtml(otp, purpose)

    // ── Strategy 1: Try Gmail SMTP first ──
    const gmailConfig = await getGmailConfig()
    if (gmailConfig.email && gmailConfig.password) {
      const result = await sendViaGmail(gmailConfig.email, to, subject, html, otp, purpose)
      if (result.sent) return { ...result, provider: 'gmail' }
      // Gmail failed, fall through to Resend
      console.warn(`📧 Gmail failed: ${result.error}. Trying Resend...`)
    }

    // ── Strategy 2: Try Resend ──
    const resendApiKey = await getResendApiKey()
    if (resendApiKey) {
      const result = await sendViaResend(to, subject, html, otp, purpose)
      if (result.sent) return { ...result, provider: 'resend' }
      console.warn(`📧 Resend failed: ${result.error}. Falling back to sandbox.`)
    }

    // ── Fallback: Sandbox mode ──
    console.log(`📧 [SANDBOX] OTP for ${to} (${purpose}): ${otp}`)
    return {
      sent: false,
      error: 'No email service configured',
      errorDetail: 'Configure Gmail SMTP or Resend API key in Settings to send real emails.',
    }
  } catch (err) {
    console.error('❌ Email send error:', err)
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { sent: false, error: msg }
  }
}

// ─── Send via Gmail SMTP ───────────────────────────────────────────

async function sendViaGmail(
  fromEmail: string,
  to: string,
  subject: string,
  html: string,
  otp: string,
  purpose: string
): Promise<{ sent: boolean; error?: string; errorDetail?: string }> {
  try {
    const transporter = await getGmailTransporter()
    if (!transporter) {
      return { sent: false, error: 'Gmail transporter not available' }
    }

    console.log(`📧 Sending OTP via Gmail SMTP to ${to} from ${fromEmail}...`)

    const info = await transporter.sendMail({
      from: `WC Dashboard <${fromEmail}>`,
      to,
      subject,
      html,
    })

    console.log(`✅ OTP sent via Gmail to ${to} (MessageId: ${info.messageId})`)
    return { sent: true }
  } catch (err) {
    console.error('❌ Gmail SMTP error:', err)
    const msg = err instanceof Error ? err.message : 'Unknown error'
    const detail = getGmailErrorDetail(msg)
    return { sent: false, error: msg, errorDetail: detail }
  }
}

// ─── Send via Resend ──────────────────────────────────────────────

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  otp: string,
  purpose: string
): Promise<{ sent: boolean; error?: string; errorDetail?: string }> {
  try {
    const resend = await getResendClient()
    if (!resend) {
      return { sent: false, error: 'Resend client not available' }
    }

    const from = await getResendFromEmail()
    console.log(`📧 Sending OTP via Resend to ${to} from ${from}...`)

    const { data, error } = await resend.emails.send({
      from: `WC Dashboard <${from}>`,
      to: [to],
      subject,
      html,
    })

    if (error) {
      console.error('❌ Resend API error:', JSON.stringify(error, null, 2))
      const detail = getResendErrorDetail(error)
      return { sent: false, error: error.message || 'Resend API error', errorDetail: detail }
    }

    console.log(`✅ OTP sent via Resend to ${to} (ID: ${data?.id})`)
    return { sent: true }
  } catch (err) {
    console.error('❌ Resend error:', err)
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { sent: false, error: msg }
  }
}

// ─── Test email (used by Settings → Test button) ───────────────────

export async function testEmailConnection(
  provider: 'gmail' | 'resend',
  config: {
    email?: string
    password?: string
    apiKey?: string
    fromEmail?: string
    toEmail?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    if (provider === 'gmail') {
      if (!config.email || !config.password || !config.toEmail) {
        return { success: false, error: 'Gmail email, app password, and recipient are required' }
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: config.email, pass: config.password },
      })

      console.log(`📧 Sending test email via Gmail to ${config.toEmail} from ${config.email}...`)

      const info = await transporter.sendMail({
        from: `WC Dashboard <${config.email}>`,
        to: config.toEmail,
        subject: 'Test Email — WC Dashboard',
        html: `
          <div style="padding: 32px; text-align: center; font-family: sans-serif;">
            <h1 style="color: #059669;">✅ Gmail SMTP Test Successful!</h1>
            <p style="color: #64748b; margin-top: 12px;">Your email configuration is working correctly.</p>
            <p style="color: #94a3b8; margin-top: 24px; font-size: 12px;">Sent from WC Dashboard via Gmail SMTP</p>
          </div>
        `,
      })

      console.log(`✅ Gmail test email sent (MessageId: ${info.messageId})`)
      return { success: true }
    }

    // Resend provider
    if (provider === 'resend') {
      if (!config.apiKey || !config.toEmail) {
        return { success: false, error: 'Resend API key and recipient are required' }
      }

      const resend = new Resend(config.apiKey)
      const fromEmail = config.fromEmail || 'onboarding@resend.dev'

      console.log(`📧 Sending test email via Resend to ${config.toEmail} from ${fromEmail}...`)

      const { error } = await resend.emails.send({
        from: `WC Dashboard <${fromEmail}>`,
        to: [config.toEmail],
        subject: 'Test Email — WC Dashboard',
        html: `
          <div style="padding: 32px; text-align: center; font-family: sans-serif;">
            <h1 style="color: #059669;">✅ Resend Test Successful!</h1>
            <p style="color: #64748b; margin-top: 12px;">Your email configuration is working correctly.</p>
            <p style="color: #94a3b8; margin-top: 24px; font-size: 12px;">Sent from WC Dashboard via Resend</p>
          </div>
        `,
      })

      if (error) {
        console.error('❌ Resend test error:', JSON.stringify(error, null, 2))
        return { success: false, error: error.message || 'Resend API error' }
      }

      console.log('✅ Resend test email sent')
      return { success: true }
    }

    return { success: false, error: 'Unknown provider' }
  } catch (err) {
    console.error('❌ Test email error:', err)
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: msg }
  }
}

// ─── HTML Template ─────────────────────────────────────────────────

function generateOtpHtml(otp: string, purpose: string): string {
  const title = purpose === 'signup' ? 'Verify Your Email — WC Dashboard' : 'Login Verification — WC Dashboard'
  const heading = purpose === 'signup' ? 'Verify Your Email Address' : 'Login Verification'
  const description = purpose === 'signup'
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

// ─── Error detail helpers ──────────────────────────────────────────

function getGmailErrorDetail(message: string): string {
  if (message.includes('Invalid login') || message.includes('authentication'))
    return 'Gmail login failed. Please check your email and App Password. Note: Regular Gmail password will NOT work — you must create an App Password at myaccount.google.com/apppasswords.'
  if (message.includes('ETIMEDOUT') || message.includes('ENOTFOUND') || message.includes('network'))
    return 'Could not connect to Gmail SMTP server. Check your internet connection.'
  if (message.includes('Too many') || message.includes('rate'))
    return 'Gmail rate limit reached. Please wait a few minutes before sending more emails.'
  if (message.includes('User not found') || message.includes('No such user'))
    return 'The Gmail address does not exist. Please check the email address.'
  return message || 'Unknown Gmail error'
}

function getResendErrorDetail(error: { code?: string; message?: string; statusCode?: number; name?: string }): string {
  if (!error) return 'No error details available.'
  const code = error.code || error.name || ''
  const msg = error.message || ''

  if (code.includes('authentication') || msg.includes('API key'))
    return 'The Resend API key is invalid or expired.'
  if (code.includes('domain') || msg.includes('domain_verification'))
    return 'The sender domain is not verified in Resend. Use onboarding@resend.dev for testing.'
  if (code.includes('rate_limit') || msg.includes('rate'))
    return 'Resend rate limit reached (100 emails/day on free tier).'
  if (code.includes('not_found') || msg.includes('not found'))
    return 'The recipient email address could not be found.'
  return msg || code || 'Unknown Resend error'
}
