import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

let transporter;
let etherealAccount;
let accountReady = false;

async function createEtherealAccount() {
  try {
    etherealAccount = await nodemailer.createTestAccount();
    console.log("✅ Ethereal test account created");
    console.log("📧 Test Email Account:", etherealAccount.user);
    console.log("🔑 Test Password:", etherealAccount.pass);
    console.log("🌐 Web Interface: https://ethereal.email");
    console.log("📬 View sent emails at: https://ethereal.email/messages");
    
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: etherealAccount.user,
        pass: etherealAccount.pass,
      },
    });

    // Verify transporter configuration
    await transporter.verify();
    accountReady = true;
    console.log("✅ Email service is ready to send messages (Ethereal)");
  } catch (error) {
    console.error("❌ Error creating Ethereal account:", error);
    throw error;
  }
}

// Initialize Ethereal account on module load
createEtherealAccount().catch(err => {
  console.error("Failed to initialize Ethereal:", err);
});

export async function sendRFPEmail(rfp, vendor) {
  try {
    // Wait for transporter to be ready if it's still initializing
    if (!accountReady || !transporter) {
      console.log("⏳ Waiting for Ethereal account to be ready...");
      let attempts = 0;
      while (!accountReady && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      if (!accountReady || !transporter) {
        throw new Error("Ethereal account not ready. Please restart the server.");
      }
    }

    const mailOptions = {
      from: `"RFP Management System" <${etherealAccount.user}>`,
      to: vendor.email,
      subject: `RFP Request: ${rfp.rfpId}`,
      html: generateRFPEmailTemplate(rfp, vendor),
      replyTo: etherealAccount.user,
    };

    const info = await transporter.sendMail(mailOptions);
    
    // Get the preview URL from Ethereal
    const previewUrl = nodemailer.getTestMessageUrl(info);
    
    console.log("✅ Email sent to", vendor.email, "(via Ethereal)");
    console.log("📧 Message ID:", info.messageId);
    if (previewUrl) {
      console.log("🔗 Preview URL:", previewUrl);
      console.log("💡 View the email at:", previewUrl);
    }
    
    return { 
      success: true, 
      messageId: info.messageId,
      previewUrl: previewUrl || null,
      note: "Email sent via Ethereal (test service). Use the preview URL to view the email."
    };
  } catch (error) {
    console.error("❌ Error sending email to", vendor.email, ":", error);
    return { success: false, error: error.message };
  }
}

function generateRFPEmailTemplate(rfp, vendor) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .rfp-details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #2563eb; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        pre { white-space: pre-wrap; font-family: inherit; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Request for Proposal (RFP)</h1>
          <p>RFP ID: ${rfp.rfpId}</p>
        </div>
        <div class="content">
          <p>Dear ${vendor.contactPerson},</p>
          <p>We are pleased to invite <strong>${vendor.name}</strong> to submit a proposal for the following requirements:</p>
          
          <div class="rfp-details">
            <h2>RFP Details</h2>
            <pre>${rfp.chatbotResponse}</pre>
          </div>
          
          <p>Please review the requirements above and submit your proposal by replying to this email.</p>
          <p><strong>Important:</strong> Please include the RFP ID (${rfp.rfpId}) in your reply subject or body to ensure your proposal is properly matched.</p>
          <p>Your proposal should include:</p>
          <ul>
            <li>Pricing information (itemized if possible)</li>
            <li>Total price</li>
            <li>Delivery timeline</li>
            <li>Payment terms</li>
            <li>Warranty details</li>
            <li>Any additional terms and conditions</li>
          </ul>
          
          <p>You can format your proposal in any way you prefer - our AI system will automatically extract the key information from your response.</p>
          <p>We look forward to receiving your proposal.</p>
          <p>Best regards,<br>RFP Management Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please reply directly to this email with your proposal.</p>
          <p>RFP ID: ${rfp.rfpId} | Vendor: ${vendor.name}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export default transporter;

