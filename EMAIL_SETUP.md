# Email Setup Guide

## Sending Emails (Outbound)

The system uses Nodemailer to send RFP emails to vendors. Configure the following environment variables in your `.env` file:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
REPLY_TO_EMAIL=your-email@gmail.com
```

### Gmail Setup:
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the app password (not your regular password) in `SMTP_PASS`

### Other Email Providers:
- **Outlook/Hotmail**: Use `smtp-mail.outlook.com` on port 587
- **SendGrid**: Use `smtp.sendgrid.net` on port 587 with your SendGrid credentials
- **Mailgun**: Use `smtp.mailgun.org` on port 587 with your Mailgun credentials

## Receiving Emails (Inbound - Webhook)

The system includes a webhook endpoint to receive vendor proposal emails: `POST /proposals/inbound`

### Production Setup Options:

#### Option 1: SendGrid Inbound Parse
1. Go to SendGrid Dashboard → Settings → Inbound Parse
2. Add a new hostname (e.g., `rfp.yourdomain.com`)
3. Set the POST URL to: `https://your-api-domain.com/proposals/inbound`
4. SendGrid will forward emails to your webhook

#### Option 2: Mailgun Routes
1. Go to Mailgun Dashboard → Receiving → Routes
2. Create a route that forwards emails to: `https://your-api-domain.com/proposals/inbound`
3. Configure the route to match emails containing "RFP-" in the subject

#### Option 3: AWS SES + Lambda
1. Set up AWS SES to receive emails
2. Configure SES to trigger a Lambda function
3. Lambda function should POST to your webhook endpoint

#### Option 4: Manual Testing
For development/testing, you can manually POST to the webhook:

```bash
curl -X POST http://localhost:5000/proposals/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "from": "vendor@example.com",
    "subject": "Re: RFP Request: RFP-1234567890-123",
    "text": "We propose the following:\n\nTotal Price: $50,000\nDelivery: 30 days\nPayment Terms: Net 30\nWarranty: 1 year",
    "html": "<p>We propose the following:</p><p>Total Price: $50,000<br>Delivery: 30 days<br>Payment Terms: Net 30<br>Warranty: 1 year</p>",
    "rfpId": "RFP-1234567890-123"
  }'
```

### Webhook Payload Format:
```json
{
  "from": "vendor@example.com",
  "subject": "Re: RFP Request: RFP-1234567890-123",
  "text": "Email text content",
  "html": "Email HTML content (optional)",
  "rfpId": "RFP-1234567890-123" // Optional, will be extracted from subject/body if not provided
}
```

### How It Works:
1. Vendor replies to the RFP email
2. Email service forwards the email to the webhook endpoint
3. System extracts RFP ID from email subject or body
4. AI extracts structured data from the proposal
5. Proposal is stored in the database
6. Proposal appears in the RFP detail view

## Testing Email Functionality

### Test Sending Emails:
1. Create an RFP
2. Select vendors
3. Click "Send RFP to n vendor(s)"
4. Check vendor email inboxes

### Test Receiving Proposals:
1. Use the manual POST method above, or
2. Set up a test email service webhook
3. Send a test email reply
4. Check the Dashboard → RFP Details → Proposals tab

## Troubleshooting

### Emails Not Sending:
- Check SMTP credentials in `.env`
- Verify firewall/network allows SMTP connections
- Check server logs for error messages
- For Gmail, ensure App Password is used (not regular password)

### Proposals Not Appearing:
- Verify webhook endpoint is accessible
- Check that RFP ID is in the email subject or body
- Verify vendor email matches the RFP vendor list
- Check server logs for extraction errors

