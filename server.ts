import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import nodemailer from "nodemailer";
import { google } from "googleapis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Gmail Transporter
  const gmailTransporter = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD 
    ? nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      })
    : null;

  app.use(cors());
  app.use(express.json());

  // API routes
  app.post("/api/add-to-calendar", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
      const eventId = process.env.GOOGLE_CALENDAR_EVENT_ID;
      if (!eventId) {
        return res.status(500).json({ error: "GOOGLE_CALENDAR_EVENT_ID is not configured in the server secrets." });
      }

      let authClient;
      // If service account credentials exist explicitly, use JWT authentication
      if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
        authClient = new google.auth.JWT({
          email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, ''),
          scopes: ['https://www.googleapis.com/auth/calendar.events']
        });
      } else if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
        authClient = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        );
        authClient.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
      } else {
        return res.status(500).json({ error: "Missing Google Calendar credentials. The default AI Studio platform doesn't have calendar access enabled. Please configure GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY secrets, OR GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN." });
      }

      const calendar = google.calendar({ version: "v3", auth: authClient });
      // The host calendar specified in the template link
      const calendarId = "marketing@xmonks.com";

      // Note: we might need to handle the case where "marketing@xmonks.com" requires delegated access
      // If standard ADC is used, the service account must have access to this calendar.
      const eventRes = await calendar.events.get({
        calendarId,
        eventId: eventId,
      });

      const event = eventRes.data;
      const attendees = event.attendees || [];
      
      // Add if not already present
      if (!attendees.find((a: any) => a.email.toLowerCase() === email.toLowerCase())) {
        attendees.push({ email });
        await calendar.events.patch({
          calendarId,
          eventId: eventId,
          sendUpdates: "all", // Send the calendar invite to the new guest
          requestBody: {
            attendees,
          },
        });
      }

      res.status(200).json({ message: "Successfully added to calendar API." });
    } catch (err: any) {
      console.error("Calendar API error:", err);
      res.status(500).json({ error: "Failed to add to calendar. " + (err.message || "") });
    }
  });

  app.post("/api/send-email", async (req, res) => {
    const { clientName, clientEmail, isTest, ccEmail } = req.body;

    if (!clientName || !clientEmail) {
      return res.status(400).json({ error: "Client name and email are required." });
    }

    const subject = "Welcome: The Art and Science of Coaching (The Essentials Course) by Erickson Coaching International (India Team) (Online, May-June, 2026)";
    const finalSubject = isTest ? `[TEST] ${subject}` : subject;
    const ccRecipient = ccEmail || undefined;

    const emailHtml = `
          <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #0056b3; padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Welcome to Your Coaching Journey</h1>
            </div>
            <div style="padding: 32px 24px;">
              <p style="font-size: 16px; margin-bottom: 24px;">Dear ${clientName},</p>
              <p style="font-size: 16px; margin-bottom: 16px;">Warm greetings!</p>
              <p style="font-size: 16px; margin-bottom: 16px;">I would like to personally welcome you to <strong>‘The Art & Science of Coaching (The Essentials Course)’</strong>.</p>
              <p style="font-size: 16px; margin-bottom: 16px;">Congratulations and sincere gratitude for trusting us as your partner in your Coaching Journey. Coaching is about you as a whole person: your values, goals, work, balance, fulfillment, and life purpose.</p>
              
              <blockquote style="border-left: 4px solid #0056b3; padding-left: 16px; margin: 24px 0; font-style: italic; color: #4b5563;">
                "The battle is to reduce the gap between Who I know/ believe/ think I am and Who I want to BE. The real self and the expected self."
              </blockquote>

              <p style="font-size: 16px; margin-bottom: 16px;">The world of Coaching is an exciting space in which we Inspire, Implement, Integrate, and Celebrate our client’s insights and accomplishments. Coaching allows us to unblock that ability in us. We are passionate about supporting you to extend your reach and become even more than you dreamed possible.</p>
              
              <p style="font-size: 16px; margin-bottom: 16px;">It’s an exciting time for Erickson Coaching International (India Team) and xMonks (Inspire Coaching Systems) as we continue to grow and adapt, remaining always curious, customer-focused, authentic, vulnerable, and committed.</p>

              <div style="background-color: #f3f4f6; border-radius: 8px; padding: 24px; margin: 32px 0;">
                <h2 style="font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 16px; color: #0056b3;">Course Details</h2>
                <p style="margin-bottom: 8px;"><strong>Dates:</strong></p>
                <p style="margin-bottom: 4px; padding-left: 12px;">Part I: 28th May - 31st May, 2026 & 04th June - 07th June, 2026</p>
                <p style="margin-bottom: 16px; padding-left: 12px;">Part II: 11th June - 14th June, 2026 & 18th June - 21st June, 2026</p>
                
                <p style="margin-bottom: 16px;"><strong>Timings:</strong> 06:00 - 09:30 PM IST</p>
                
                <div style="margin-top: 24px;">
                  <a href="https://us06web.zoom.us/j/85070565878?pwd=VCLc9OaHuJAaxWnWiPrj3ybPjiH8M3.1" style="display: inline-block; background-color: #0056b3; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Join Zoom Meeting</a>
                </div>
                <p style="font-size: 14px; margin-top: 16px; color: #6b7280;">
                  Meeting ID: 850 7056 5878<br>
                  Passcode: 462023
                </p>
              </div>

              <p style="font-size: 14px; color: #6b7280; margin-bottom: 24px;">
                Please note that Part I & II Online consists of 16 live online Zoom sessions each lasting 3.50 hours with an expectation of approximately 45 minutes of outside class time work per online session.
              </p>

              <p style="font-size: 16px; margin-bottom: 16px;">We look forward to the magic we’ll co-create in your life. I wish you all the very best for your Coaching journey and assure you of our utmost commitment.</p>

              <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                <p style="margin-bottom: 4px; font-weight: 600;">Great Regards,</p>
                <p style="margin-bottom: 4px; font-weight: 700; color: #0056b3;">Gaurav Arora</p>
                <p style="margin: 0; font-size: 14px; color: #6b7280;">Inspirer</p>
              </div>
            </div>
          </div>
        `;

    try {
      // Try Gmail first if configured
      if (gmailTransporter) {
        await gmailTransporter.sendMail({
          from: `"Gaurav Arora" <${process.env.GMAIL_USER}>`,
          to: clientEmail,
          cc: ccRecipient,
          subject: finalSubject,
          html: emailHtml,
        });
        return res.status(200).json({ message: "Email sent successfully via Gmail!" });
      }

      return res.status(500).json({ 
        error: "No email service configured. Please set up GMAIL_USER/GMAIL_APP_PASSWORD." 
      });

    } catch (err) {
      console.error("Email error:", err);
      res.status(500).json({ error: "Failed to send email. Check your credentials." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
