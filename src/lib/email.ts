import { Resend } from 'resend'
import { db } from '@/lib/db'

// ─── Module-level state ───────────────────────────────────────────
let resendInstance: Resend | null = null
let cachedApiKey: string | null = null

// ─── Public helpers ───────────────────────────────────────────────

/**
 * Call this whenever the API key changes (e.g. after saving settings)
 * so the next OTP send uses the new credentials immediately.
 */
export function resetEmailClient(): void {
  resendInstance = null
  cachedApiKey = null
  console.log('📧 Email client reset — will re-read config on next use')
}

/**
 * Returns true if a Resend API key is currently stored (DB or env).
 * Does NOT instantiate the SDK — just checks the key exists.
 */
export async function isEmailConfigured(): Promise<boolean> {
  try {
    const apiKey = await getApiKey()
    return !!apiKey
  } catch {
    return false
  }
}

// ─── Internal helpers ──────────────────────────────────────────────

async function getApiKey(): Promise<string | null> {
  try {
    const setting = await db.systemSettings.findUnique({ where: { key: 'resend_api_key' } })
    return setting?.value || process.env.RESEND_API_KEY || null
  } catch (err) {
    console.error('❌ Failed to read email config from DB:', err instanceof Error ? err.message : err)
    // Fallback to env only
    return process.env.RESEND_API_KEY || null
  }
}

async function getResendClient(): Promise<Resend | null> {
  try {
    const apiKey = await getApiKey()

    if (!apiKey) {
      console.warn('⚠️ No Resend API key found (checked DB settings + env). Emails will not be sent.')
      return null
    }

    // Detect API key change — recreate the client
    if (cachedApiKey !== apiKey) {
      console.log(`📧 API key ${cachedApiKey ? 'changed' : 'loaded'} — creating new Resend client`)
      resendInstance = new Resend(apiKey)
      cachedApiKey = apiKey
    }

    // First-time initialisation
    if (!resendInstance) {
      resendInstance = new Resend(apiKey)
      cachedApiKey = apiKey
    }

    return resendInstance
  } catch (err) {
    console.error('❌ getResendClient failed:', err instanceof Error ? err.message : err)
    return null
  }
}

async function getFromEmail(): Promise<string> {
  try {
    const setting = await db.systemSettings.findUnique({ where: { key: 'email_from' } })
    return setting?.value || process.env.EMAIL_FROM || 'onboarding@resend.dev'
  } catch {
    return process.env.EMAIL_FROM || 'onboarding@resend.dev'
  }
}

// ─── Core: Send OTP Email ──────────────────────────────────────────

export async function sendOtpEmail(
  to: string,
  otp: string,
  purpose: string
): Promise<{ sent: boolean; error?: string; errorDetail?: string }> {
  try {
    const resend = await getResendClient()

    if (!resend) {
      console.log(`📧 [SANDBOX] OTP for ${to} (${purpose}): ${otp}`)
      return { sent: false, error: 'Email service not configured', errorDetail: 'No Resend API key found in DB settings or environment variables.' }
    }

    const from = await getFromEmail()
    const subject = purpose === 'signup'
      ? 'Verify Your Email — WC Dashboard'
      : 'Login Verification — WC Dashboard'

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
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
                    <p style="margin: 0 0 8px; color: #334155; font-size: 16px; font-weight: 600;">
                      ${purpose === 'signup' ? 'Verify Your Email Address' : 'Login Verification'}
                    </p>
                    <p style="margin: 0 0 28px; color: #64748b; font-size: 14px; line-height: 1.6;">
                      ${purpose === 'signup'
                        ? 'Thank you for creating an account! Please use the verification code below to complete your registration.'
                        : 'We detected a login attempt to your account. Please verify your identity by entering the code below.'}
                    </p>
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

    console.log(`📧 Sending OTP email to ${to} from ${from} (purpose: ${purpose})...`)

    const { data, error } = await resend.emails.send({
      from: `WC Dashboard <${from}>`,
      to: [to],
      subject,
      html,
    })

    if (error) {
      console.error('❌ Resend API error:', JSON.stringify(error, null, 2))
      // Provide actionable error messages
      const detail = getResendErrorDetail(error)
      return { sent: false, error: error.message || 'Resend API error', errorDetail: detail }
    }

    console.log(`✅ OTP email sent to ${to} (ID: ${data?.id})`)
    return { sent: true }
  } catch (err) {
    console.error('❌ Email send error:', err)
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { sent: false, error: msg, errorDetail: 'Unexpected error while sending email.' }
  }
}

// ─── Test email (used by Settings → Test button) ───────────────────

export async function testEmailConnection(
  apiKey: string,
  fromEmail: string,
  toEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = new Resend(apiKey)

    console.log(`📧 Sending test email to ${toEmail} from ${fromEmail}...`)

    const { data, error } = await resend.emails.send({
      from: `WC Dashboard <${fromEmail}>`,
      to: [toEmail],
      subject: 'Test Email — WC Dashboard',
      html: `
        <div style="padding: 32px; text-align: center; font-family: sans-serif;">
          <h1 style="color: #059669;">✅ Email Test Successful!</h1>
          <p style="color: #64748b; margin-top: 12px;">Your email configuration is working correctly.</p>
          <p style="color: #94a3b8; margin-top: 24px; font-size: 12px;">Sent from WC Dashboard</p>
        </div>
      `,
    })

    if (error) {
      console.error('❌ Test email Resend error:', JSON.stringify(error, null, 2))
      return { success: false, error: error.message || 'Resend API error' }
    }

    console.log(`✅ Test email sent to ${toEmail} (ID: ${data?.id})`)
    return { success: true }
  } catch (error) {
    console.error('❌ Test email error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: msg }
  }
}

// ─── Resend error detail helper ────────────────────────────────────

function getResendErrorDetail(error: { code?: string; message?: string; statusCode?: number; name?: string }): string {
  if (!error) return 'No error details available.'

  const code = error.code || error.name || ''
  const msg = error.message || ''

  if (code.includes('authentication') || code.includes('unauthorized') || msg.includes('API key'))
    return 'The Resend API key is invalid or expired. Please check your API key in Settings.'
  if (code.includes('domain') || msg.includes('domain_verification'))
    return 'The sender domain is not verified in Resend. Use onboarding@resend.dev for testing, or verify your custom domain at resend.com/domains.'
  if (code.includes('rate_limit') || msg.includes('rate'))
    return 'Resend rate limit reached (100 emails/day on free tier). Please wait or upgrade your Resend plan.'
  if (code.includes('not_found') || msg.includes('not found'))
    return 'The recipient email address could not be found.'
  if (msg.includes('quota'))
    return 'Your Resend account has exceeded its email quota. Please check your Resend dashboard.'

  return msg || code || 'Unknown Resend error'
}
