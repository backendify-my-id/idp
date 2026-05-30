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
