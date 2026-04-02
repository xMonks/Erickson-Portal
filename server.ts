import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";
import cors from "cors";
import nodemailer from "nodemailer";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import * as dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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

  const getOAuth2Client = () => {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.APP_URL}/auth/callback`
    );
  };

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  // OAuth Routes
  app.get("/api/auth/google/url", (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: "GOOGLE_CLIENT_ID is not configured in environment variables." });
    }
    const oauth2Client = getOAuth2Client();
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/calendar.events"],
      prompt: "consent",
    });
    res.json({ url });
  });

  app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send("No code provided.");
    }
    
    try {
      const oauth2Client = getOAuth2Client();
      const { tokens } = await oauth2Client.getToken(code as string);
      
      // Still set cookie as fallback
      res.cookie("google_tokens", JSON.stringify(tokens), {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
      });

      res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center;">
            <div style="padding: 20px; border-radius: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534;">
              <h2 style="margin-top: 0;">Authentication Successful!</h2>
              <p>You can close this window now.</p>
              <button onclick="window.close()" style="background: #166534; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;">Close Window</button>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS',
                  tokens: ${JSON.stringify(tokens)}
                }, '*');
                setTimeout(() => window.close(), 1000);
              }
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("OAuth error:", error);
      res.status(500).send("Authentication failed. Please check your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
    }
  });

  app.get("/api/auth/status", (req, res) => {
    const tokens = req.cookies.google_tokens || req.query.tokens;
    res.json({ connected: !!tokens });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("google_tokens", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });
    res.json({ success: true });
  });

  // Calendar API
  app.post("/api/calendar/invite", async (req, res) => {
    const { clientName, clientEmail, tokens: bodyTokens } = req.body;
    const tokensStr = bodyTokens ? JSON.stringify(bodyTokens) : req.cookies.google_tokens;

    if (!tokensStr) {
      return res.status(401).json({ error: "Google Calendar not connected." });
    }

    const eventId = process.env.GOOGLE_CALENDAR_EVENT_ID;
    if (!eventId || eventId === "your-event-id") {
      return res.status(400).json({ error: "GOOGLE_CALENDAR_EVENT_ID is not configured in environment variables." });
    }

    try {
      const tokens = JSON.parse(tokensStr);
      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials(tokens);

      const calendar = google.calendar({ version: "v3", auth: oauth2Client });
      
      // 1. Fetch existing event
      const existingEvent = await calendar.events.get({
        calendarId: "primary",
        eventId: eventId,
      });

      const attendees = existingEvent.data.attendees || [];
      
      // 2. Check if already added
      const alreadyAdded = attendees.some(a => a.email === clientEmail);
      if (alreadyAdded) {
        return res.json({ message: "Client is already a guest in the calendar event.", event: existingEvent.data });
      }

      // 3. Add new attendee
      attendees.push({ email: clientEmail, displayName: clientName });

      // 4. Update event
      const response = await calendar.events.update({
        calendarId: "primary",
        eventId: eventId,
        requestBody: {
          ...existingEvent.data,
          attendees: attendees,
        },
        sendUpdates: "all",
      });

      res.json({ message: "Client added to existing calendar event!", event: response.data });
    } catch (error: any) {
      console.error("Calendar error:", error);
      const errorMessage = error?.response?.data?.error?.message || error?.message || "Failed to update calendar event.";
      res.status(500).json({ error: errorMessage });
    }
  });

  // API routes
  app.post("/api/send-email", async (req, res) => {
    const { clientName, clientEmail, isTest, includeCC } = req.body;

    if (!clientName || !clientEmail) {
      return res.status(400).json({ error: "Client name and email are required." });
    }

    const subject = "Welcome: The Art and Science of Coaching (The Essentials Course) by Erickson Coaching International (India Team) (Online, May-June, 2026)";
    const finalSubject = isTest ? `[TEST] ${subject}` : subject;
    const ccRecipient = includeCC ? "preeti@erickson.co.in" : undefined;

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

      // Fallback to Resend
      if (resend) {
        const { data, error } = await resend.emails.send({
          from: "Gaurav Arora <marketing@xmonks.com>",
          to: [clientEmail],
          cc: ccRecipient ? [ccRecipient] : undefined,
          subject: finalSubject,
          html: emailHtml,
        });

        if (error) return res.status(400).json({ error });
        return res.status(200).json({ message: "Email sent successfully via Resend!", data });
      }

      return res.status(500).json({ 
        error: "No email service configured. Please set up GMAIL_USER/GMAIL_APP_PASSWORD or RESEND_API_KEY." 
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
