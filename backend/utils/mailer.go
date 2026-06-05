package utils

import (
	"fmt"
	"net/smtp"
	"os"
)

func SendEmail(to string, subject string, body string) error {
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASS")

	auth := smtp.PlainAuth("", user, pass, host)

	msg := []byte("To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"\r\n" +
		body + "\r\n")

	addr := fmt.Sprintf("%s:%s", host, port)
	err := smtp.SendMail(addr, auth, user, []string{to}, msg)
	if err != nil {
		return err
	}
	return nil
}

func SendHTMLTemplateEmail(to, subject, title, subtitle, bodyText, otpCode, expiryText, footerWarning string) error {
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASS")

	auth := smtp.PlainAuth("", user, pass, host)

	// Determine if OTP should be rendered
	hasOTP := otpCode != ""
	otpHTML := ""
	if hasOTP {
		otpHTML = fmt.Sprintf(`
          <tr>
            <td align="center" style="padding: 10px 30px 20px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" style="background-color: #1e293b; border: 1px dashed #334155; border-radius: 16px;">
                <tr>
                  <td align="center" style="padding: 16px 36px; font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 900; color: #ffffff; letter-spacing: 6px; padding-left: 42px;">
                    %s
                  </td>
                </tr>
              </table>
              <p style="margin: 14px 0 0 0; font-size: 11px; font-weight: 600; color: #818cf8; text-transform: uppercase; letter-spacing: 0.5px;">
                Masa Berlaku: %s
              </p>
            </td>
          </tr>`, otpCode, expiryText)
	}

	htmlTemplate := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>%s</title>
</head>
<body style="margin: 0; padding: 0; background-color: #090d16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #cbd5e1;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #090d16;">
    <tr>
      <td align="center" style="padding: 40px 10px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
          
          <!-- Gradient Top Bar -->
          <tr>
            <td height="6" style="background: linear-gradient(to right, #6366f1, #a855f7);"></td>
          </tr>

          <!-- Header Logo -->
          <tr>
            <td align="center" style="padding: 30px 30px 20px 30px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #6366f1, #a855f7); padding: 8px 14px; border-radius: 12px; font-weight: 900; font-size: 16px; color: #ffffff; letter-spacing: 0.5px;">
                    B
                  </td>
                  <td style="font-weight: 900; font-size: 18px; color: #ffffff; padding-left: 10px; letter-spacing: -0.5px;">
                    Backendify <span style="color: #818cf8; font-weight: 550;">IdP</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 30px;">
              <div style="border-bottom: 1px solid #1e293b;"></div>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 30px 30px 20px 30px; text-align: left;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                %s
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
                %s
              </p>
              <p style="margin: 20px 0 0 0; font-size: 13.5px; line-height: 1.6; color: #94a3b8; font-weight: 500;">
                %s
              </p>
            </td>
          </tr>

          <!-- OTP Code Box -->
          %s

          <!-- Footer warning -->
          <tr>
            <td style="padding: 0 30px 30px 30px; text-align: left;">
              <p style="margin: 10px 0 0 0; font-size: 11px; line-height: 1.5; color: #475569; font-weight: 550;">
                %s
              </p>
            </td>
          </tr>

          <!-- Copyright Footer -->
          <tr>
            <td align="center" style="padding: 20px 30px; background-color: #0b0f19; border-top: 1px solid #1e293b;">
              <p style="margin: 0; font-size: 10px; font-weight: 600; color: #475569;">
                &copy; 2026 Backendify Identity Provider. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`, subject, title, subtitle, bodyText, otpHTML, footerWarning)

	msg := []byte("To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=utf-8\r\n" +
		"\r\n" +
		htmlTemplate + "\r\n")

	addr := fmt.Sprintf("%s:%s", host, port)
	err := smtp.SendMail(addr, auth, user, []string{to}, msg)
	if err != nil {
		return err
	}
	return nil
}
