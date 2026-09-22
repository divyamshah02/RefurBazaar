import resend

resend.api_key = "re_dADYy8RV_2HTJNAKGuzzDeikTdz9zbdME"

params: resend.Emails.SendParams = {
  "from": "Support <support@recarvit.com>",
  "to": ["divyamshah1234@gmail.com"],
  "subject": "hello world",
  "html": "<p>it works!</p>"
}

email = resend.Emails.send(params)
print(email)