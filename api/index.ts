import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import { google } from "googleapis";
import { GoogleGenAI } from "@google/genai";
import { readFileSync } from "fs";
import path from "path";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";

const app = express();

app.use(cors());
app.use(express.json());

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

// API routes
app.post("/api/add-to-calendar", async (req, res) => {
  const { email, eventId, calendarId } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const targetEventId = eventId || process.env.GOOGLE_CALENDAR_EVENT_ID;
    if (!targetEventId) {
      return res.status(500).json({ error: "No Event ID provided in request or server secrets." });
    }

    let authClient;
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
      return res.status(500).json({ error: "Missing Google Calendar credentials." });
    }

    const calendar = google.calendar({ version: "v3", auth: authClient });
    
    let finalEventId = targetEventId;
    let finalCalendarId = calendarId || "marketing@xmonks.com";

    if (finalEventId.length > 30 && !finalEventId.includes('_') && !finalEventId.includes('-')) {
      try {
        const decoded = Buffer.from(finalEventId, 'base64').toString('utf8');
        if (decoded.includes(' ')) {
          const parts = decoded.split(' ');
          finalEventId = parts[0];
          if (parts.length > 1 && parts[1].includes('@')) {
            finalCalendarId = parts[1];
          }
        }
      } catch (e) {
        console.log("Not a base64 string");
      }
    }
    
    if (finalEventId.includes('_')) {
      finalEventId = finalEventId.split('_')[0];
    }

    const eventRes = await calendar.events.get({
      calendarId: finalCalendarId,
      eventId: finalEventId,
    });

    const event = eventRes.data;
    const attendees = event.attendees || [];
    
    if (!attendees.find((a: any) => a.email.toLowerCase() === email.toLowerCase())) {
      attendees.push({ email });
      await calendar.events.patch({
        calendarId: finalCalendarId,
        eventId: finalEventId,
        sendUpdates: "all",
        requestBody: { attendees },
      });
    }

    res.status(200).json({ message: "Successfully added to calendar API." });
  } catch (err: any) {
    console.error("Calendar API error:", err);
    res.status(500).json({ error: "Failed to add to calendar. " + (err.message || "") });
  }
});

app.post("/api/send-email", async (req, res) => {
  const { clientName, clientEmail, isTest, ccEmail, courseDatesPart1, courseDatesPart2, courseTimings, batchStartDate } = req.body;

  if (!clientName || !clientEmail) {
    return res.status(400).json({ error: "Client name and email are required." });
  }

  const subject = "Welcome: The Art and Science of Coaching (The Essentials Course) by Erickson Coaching International (India Team)";
  const finalSubject = isTest ? `[TEST] ${subject}` : subject;
  const ccRecipient = ccEmail || undefined;

  let part1 = courseDatesPart1;
  let part2 = courseDatesPart2;
  let timings = courseTimings;
  let startD = batchStartDate;

  if (fbDb && (!part1 || !part2 || !timings || !startD)) {
    try {
      const docRef = doc(fbDb, 'settings', 'calendarLinks');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (!part1) part1 = data.courseDatesPart1;
        if (!part2) part2 = data.courseDatesPart2;
        if (!timings) timings = data.courseTimings;
        if (!startD) startD = data.batchStartDate;
      }
    } catch (e) {
      console.error("Failed to fetch settings from firestore in Vercel send-email:", e);
    }
  }

  part1 = part1 || "28th May - 31st May, 2026 & 04th June - 07th June, 2026";
  part2 = part2 || "11th June - 14th June, 2026 & 18th June - 21st June, 2026";
  timings = timings || "06:00 - 09:30 PM IST";

  const extractStartDate = (part1String: string, explicitStart?: string) => {
    if (explicitStart) return explicitStart;
    const firstSegment = part1String.split("&")[0].trim();
    const startPart = firstSegment.split("-")[0].trim();
    const yearMatch = firstSegment.match(/\b(20\d{2})\b/);
    const year = yearMatch ? `, ${yearMatch[1]}` : "";
    return `${startPart}${year}`;
  };

  const startDateFormatted = extractStartDate(part1, startD);

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
            
            <p style="font-size: 16px; margin-bottom: 16px;">It’s an exciting time for Erickson Coaching International (India Team) and xMonks (Inspire Coaching Systems) as we continue to grow and adapt, remaining always curious, customer-focused, authentic, vulnerable, and committed. Our organization is going through a very humbling phase where we are doing several transformational interventions with many esteemed organizations in the country.</p>
            
            <p style="font-size: 16px; margin-bottom: 16px;">With just a few days from the upcoming online batch of "The Art and Science of Coaching (The Essentials Course)" starting ${startDateFormatted}, I would like to share the following details with you:</p>

            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 24px; margin: 32px 0;">
              <h2 style="font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 16px; color: #0056b3;">Course Details</h2>
              <p style="margin-bottom: 8px;"><strong>Dates:</strong></p>
              <p style="margin-bottom: 4px; padding-left: 12px;">Part I: ${part1}</p>
              <p style="margin-bottom: 16px; padding-left: 12px;">Part II: ${part2}</p>
              
              <p style="margin-bottom: 16px;"><strong>Timings:</strong> ${timings}</p>
              
              <div style="margin-top: 24px;">
                <a href="https://us06web.zoom.us/j/85070565878?pwd=VCLc9OaHuJAaxWnWiPrj3ybPjiH8M3.1" style="display: inline-block; background-color: #0056b3; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Join Zoom Meeting</a>
              </div>
              <p style="font-size: 14px; margin-top: 16px; color: #6b7280;">
                Meeting ID: 850 7056 5878<br>
                Passcode: 462023
              </p>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-bottom: 24px;">
              Please note that Part I & II Online consists of 16 live online Zoom sessions each lasting 3.50 hours with an expectation of approximately 45 minutes of outside class time work per online session. We will start at 6:00 PM every day and conclude by 9:30 PM.
            </p>

            <p style="font-size: 16px; margin-bottom: 16px;">Before we close, our sincere thanks to you once again for trusting us and bringing your expertise to this program. You, as an organization leader, have the vision, the knowledge, and the experience to add tremendous value to the workshop. Throughout this program, we ask you to stay engaged, and curious, keep us proactive and help us shape the future of Coaching in India.</p>

            <p style="font-size: 16px; margin-bottom: 16px;">We all have it in us to thrive and be the best version of ourselves. We look forward to the magic we’ll co-create in your life. Get ready for super exciting sessions. I wish you all the very best for your Coaching journey and assure you of our utmost commitment. Should you need any clarification, please feel free to reach out to me.</p>

            <p style="font-size: 16px; margin-bottom: 16px;">My personal respect and thanks go out to all of you. Let’s change the world, one conversation at a time!</p>

            <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="margin-bottom: 4px; font-weight: 600;">Great Regards,</p>
              <p style="margin-bottom: 4px; font-weight: 700; color: #0056b3;">Gaurav Arora</p>
              <p style="margin: 0; font-size: 14px; color: #6b7280;">Inspirer</p>
            </div>
          </div>
        </div>
      `;

  try {
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

    return res.status(500).json({ error: "No email service configured." });

  } catch (err) {
    console.error("Email error:", err);
    res.status(500).json({ error: "Failed to send email." });
  }
});

app.post("/api/send-generic-email", async (req, res) => {
  const { to, cc, subject, html } = req.body;
  if (!to || !subject || !html) {
    return res.status(400).json({ error: "To, subject and html are required." });
  }
  try {
    if (gmailTransporter) {
      await gmailTransporter.sendMail({
        from: `"Gaurav Arora" <${process.env.GMAIL_USER}>`,
        to,
        cc,
        subject,
        html,
      });
      return res.status(200).json({ message: "Email sent successfully!" });
    }
    return res.status(500).json({ error: "Email service not configured." });
  } catch (err) {
    console.error("Generic Email error:", err);
    res.status(500).json({ error: "Failed to send email." });
  }
});

app.get("/api/latest-videos", async (req, res) => {
  try {
    const playlistId = "PL83z9Rmr_Lf66HvjSOhmIXmZYyJm2AX7I";
    const response = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`);
    if (!response.ok) throw new Error("Failed to fetch RSS feed");
    const xml = await response.text();
    
    const videos = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;
    
    while ((match = entryRegex.exec(xml)) !== null && videos.length < 4) {
      const entry = match[1];
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = entry.match(/<link rel="alternate" href="([\s\S]*?)"\/>/);
      const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      
      if (titleMatch && linkMatch && idMatch) {
        videos.push({
          title: titleMatch[1].replace(/&amp;/g, '&'),
          url: linkMatch[1],
          id: idMatch[1],
          thumbnail: `https://i.ytimg.com/vi/${idMatch[1]}/maxresdefault.jpg`
        });
      }
    }
    
    res.json(videos);
  } catch (err) {
    console.error("Latest videos error:", err);
    res.status(500).json({ error: "Failed to fetch latest videos" });
  }
});

// Initialize server-side Firebase
let fbDb: any = null;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  const firebaseConfig = JSON.parse(readFileSync(configPath, "utf-8"));
  const fbApp = initializeApp(firebaseConfig, "firebase-server-app-vercel");
  fbDb = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);
  console.log("Firebase server-side connection initialized on Vercel.");
} catch (err) {
  console.error("Failed to initialize server-side Firebase connection on Vercel:", err);
}

// Get Google Gen AI client with robust lazy-initialization
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required.");
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

async function fetchProjectData() {
  if (!fbDb) {
    return { participants: [], transactions: [], settings: null };
  }
  try {
    // 1. Participants
    const partSnap = await getDocs(collection(fbDb, "participants"));
    const participants: any[] = [];
    partSnap.forEach((d) => {
      participants.push({ id: d.id, ...d.data() });
    });

    // 2. Transactions
    const transSnap = await getDocs(collection(fbDb, "adsBudgetTransactions"));
    const transactions: any[] = [];
    transSnap.forEach((d) => {
      transactions.push({ id: d.id, ...d.data() });
    });

    // 3. ROI settings
    let settings: any = null;
    try {
      const docRef = doc(fbDb, "settings", "roiData");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        settings = docSnap.data();
      }
    } catch (e) {
      console.warn("Could not load settings/roiData", e);
    }

    return { participants, transactions, settings };
  } catch (err) {
    console.error("Error fetching project data from Firestore:", err);
    return { participants: [], transactions: [], settings: null };
  }
}

function assembleContext(participants: any[], transactions: any[], settings: any) {
  const totalParticipants = participants.length;
  
  const batchCounts: Record<string, number> = {};
  const cityCounts: Record<string, number> = {};
  const industryCounts: Record<string, number> = {};
  const sourceCounts: Record<string, number> = {};
  const genderCounts: Record<string, number> = {};
  const partnerCounts: Record<string, number> = {};
  const paymentStatusCounts: Record<string, number> = {};
  
  let totalFee = 0;
  let totalReceived = 0;
  let totalRemaining = 0;
  
  const debtors: any[] = [];
  
  // Multidimensional cross-tabulations and precise participant profiling
  const batchLeadMatrix: Record<string, Record<string, number>> = {};
  const batchCityMatrix: Record<string, Record<string, number>> = {};
  const rawParticipantRows: string[] = [];

  participants.forEach((p, idx) => {
    const b = p.batchNumber ? String(p.batchNumber) : 'Unassigned';
    const s = p.leadSource || 'Direct/Referral';
    const c = p.city || 'Not specified';

    if (p.batchNumber) batchCounts[p.batchNumber] = (batchCounts[p.batchNumber] || 0) + 1;
    if (p.city) cityCounts[p.city] = (cityCounts[p.city] || 0) + 1;
    if (p.industry) industryCounts[p.industry] = (industryCounts[p.industry] || 0) + 1;
    if (p.leadSource) sourceCounts[p.leadSource] = (sourceCounts[p.leadSource] || 0) + 1;
    if (p.gender) genderCounts[p.gender] = (genderCounts[p.gender] || 0) + 1;
    if (p.clientPartner) partnerCounts[p.clientPartner] = (partnerCounts[p.clientPartner] || 0) + 1;
    
    const fee = Number(p.totalAmount) || 0;
    const received = Number(p.paymentReceived) || 0;
    const remaining = Number(p.remainingAmount) || 0;
    
    totalFee += fee;
    totalReceived += received;
    totalRemaining += remaining;
    
    if (remaining > 0) {
      debtors.push({
        name: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
        email: p.email || 'N/A',
        batch: p.batchNumber || 'Unassigned',
        remaining
      });
    }
    
    let status = p.paymentStatus || 'Pending';
    if (!p.paymentStatus) {
      if (received >= fee && fee > 0) status = 'Paid';
      else if (received > 0) status = 'Partial';
      else status = 'Unpaid';
    }
    paymentStatusCounts[status] = (paymentStatusCounts[status] || 0) + 1;

    // Cross-tabulate Batch X Lead Source
    if (!batchLeadMatrix[b]) batchLeadMatrix[b] = {};
    batchLeadMatrix[b][s] = (batchLeadMatrix[b][s] || 0) + 1;

    // Cross-tabulate Batch X City
    if (!batchCityMatrix[b]) batchCityMatrix[b] = {};
    batchCityMatrix[b][c] = (batchCityMatrix[b][c] || 0) + 1;

    // Compile sanitized record
    rawParticipantRows.push(`Record #${idx+1}: Batch ${b} | Lead Source: ${s} | City: ${c} | Fee: INR ${fee} | Paid: INR ${received} | Status: ${status}`);
  });

  let matrixStr = "";
  Object.entries(batchLeadMatrix).forEach(([b, sources]) => {
    matrixStr += `  - Batch ${b}:\n`;
    Object.entries(sources).forEach(([s, count]) => {
      matrixStr += `    - Lead Source "${s}": ${count} students / enrollments\n`;
    });
  });

  let cityMatrixStr = "";
  Object.entries(batchCityMatrix).forEach(([b, cities]) => {
    cityMatrixStr += `  - Batch ${b}:\n`;
    Object.entries(cities).forEach(([c, count]) => {
      cityMatrixStr += `    - City "${c}": ${count} students\n`;
    });
  });

  let totalAdSpend = 0;
  let totalAdCredit = 0;
  const platformSpend: Record<string, number> = {};
  
  transactions.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.type === 'spend') {
      totalAdSpend += amt;
      platformSpend[t.platform] = (platformSpend[t.platform] || 0) + amt;
    } else if (t.type === 'credit') {
      totalAdCredit += amt;
    }
  });

  let context = `
# ERICKSON COACHING INDIA - LIVE DATABASE ENVIRONMENT DATA CONTEXT
Generated at UTC: ${new Date().toISOString()}

## SUMMARY OF ENROLLMENT
- **Total Registered Students (All Batches/Cohorts):** ${totalParticipants} students
- **Cohort (Batch) Distributions:**
${Object.entries(batchCounts).map(([b, c]) => `  - Batch ${b}: ${c} students`).join('\n')}

## RETRIEVAL CROSS-REFERENCE MATRIX (BATCH-WISE BREAKDOWNS)
### Lead Sources per Cohort Batch:
${matrixStr || "  - No lead source mappings recorded."}

### Cities per Cohort Batch:
${cityMatrixStr || "  - No city mappings recorded."}

## FINANCIAL METRICS & RECEIVABLES
- **Total Revenue Forecasted (Fees):** INR ${totalFee.toLocaleString('en-IN')}
- **Total Payments Collected:** INR ${totalReceived.toLocaleString('en-IN')}
- **Total Outstanding Receivables (Balance Due):** INR ${totalRemaining.toLocaleString('en-IN')}
- **Collection Progress Percentage:** ${totalFee > 0 ? ((totalReceived / totalFee) * 100).toFixed(1) : '0'}%
- **Payment Status breakdown (Manual & Auto-computed):**
${Object.entries(paymentStatusCounts).map(([stat, count]) => `  - ${stat}: ${count} clients`).join('\n')}

- **List of Key Clients with Outstanding Receivables (Debtors):**
${debtors.slice(0, 30).map(d => `  - Name: ${d.name}, Email: ${d.email}, Cohort: Batch ${d.batch}, Balance: INR ${d.remaining.toLocaleString('en-IN')}`).join('\n')}

## ADVERTISING CAMPAIGNS & MARKETING CHANNELS
- **Total Ads Budget Spent:** INR ${totalAdSpend.toLocaleString('en-IN')}
- **Total Ads Credits Allocated:** INR ${totalAdCredit.toLocaleString('en-IN')}
- **Spendings per platform:**
${Object.entries(platformSpend).map(([platform, spend]) => `  - ${platform}: INR ${spend.toLocaleString('en-IN')}`).join('\n')}

- **Recent Advertising Ledger Transactions (Latest 20 entries):**
${transactions.slice(0, 20).map(t => `  - Date: ${t.date}, Platform: ${t.platform}, Type: ${t.type.toUpperCase()}, Amount: INR ${t.amount}, Narration: ${t.description}`).join('\n')}

## LEAD ACQUISITION & PARTNER ASSIGNMENTS
- **Lead Source distribution mapping (where clients signed up from):**
${Object.entries(sourceCounts).map(([src, count]) => `  - ${src || 'Direct/Referral'}: ${count} leads`).join('\n')}

- **Client Partner client assignment (Account Manager loads):**
${Object.entries(partnerCounts).map(([part, count]) => `  - ${part}: ${count} clients`).join('\n')}

## GEOGRAPHICAL & DEMOGRAPHY SPREAD
- **Cities representation (Hotspots):**
${Object.entries(cityCounts).map(([c, count]) => `  - ${c || 'Not specified'}: ${count} clients`).join('\n')}

- **Professional Industries representation:**
${Object.entries(industryCounts).map(([ind, count]) => `  - ${ind || 'Not specified'}: ${count} clients`).join('\n')}

- **Gender breakdown:**
${Object.entries(genderCounts).map(([g, count]) => `  - ${g || 'Not specified'}: ${count}`).join('\n')}

## SETTINGS & INTEGRATIONS
- **Use CRM Sync for live conversion tracking:** ${settings?.useCrmConversions ? 'ENABLED' : 'DISABLED'}
- **Current Standard course fee rate:** INR ${settings?.courseFee ? settings.courseFee.toLocaleString('en-IN') : '75,050'}
- **Registered ROI Cohort Targets:**
${settings?.batches ? settings.batches.map((b: any) => `  - ID: ${b.id}, Name: ${b.name}, Start Date: ${b.startDate}`).join('\n') : "No custom batch layouts initialized."}

## GRANULAR SANITIZED PARTICIPANT REGISTRY (COMPLETE ENROLLMENT LIST)
This is the database registry of all active enrollments. Scan these rows directly to do math, query/filter, and count precisely (e.g. how many from a specific lead source in a given batch):
${rawParticipantRows.join('\n') || "No student records registered."}
`;
  return context;
}

// AI Endpoint 1: Insights Generator
app.get("/api/ai/insights", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        success: false,
        error: "Gemini API key is not configured. Please add GEMINI_API_KEY to Secrets in Settings.",
        isConfigured: false
      });
    }

    const { participants, transactions, settings } = await fetchProjectData();
    const context = assembleContext(participants, transactions, settings);

    const aiInstance = getGenAI();
    const response = await aiInstance.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Based on the provided Erickson Coaching system database parameters, generate a high-level executive dashboard analysis. 
Return your response structured in a professional report using clear Markdown. 
In the report, compile:
1. **Cohort & Enrollment Momentum**: Analysis of cohort performance, which batch displays strongest recruitment momentum, and lead source effectiveness.
2. **Financial Performance Overview**: Critique outstanding fees, collection metrics, and suggest financial collection safety rules.
3. **Marketing ROI Insights**: Correlate ad platform spend against lead sources and conversions, diagnosing which ad platform has the strongest ROI/efficiency and which needs optimization.
4. **Strategic Priorities**: 3-4 concrete, data-based recommendations for management strictly derived from this data to accelerate enrollment and cash collection.

Here is the system data context:
${context}`,
      config: {
        systemInstruction: "You are the Erickson Coaching India Portal Lead Business Strategist. Address the business admins with a professional, metrics-driven slate, keeping the report data-honest and strictly using the project data."
      }
    });

    res.json({
      success: true,
      isConfigured: true,
      report: response.text,
      stats: {
        totalParticipants: participants.length,
        totalFee: participants.reduce((acc, p) => acc + (Number(p.totalAmount) || 0), 0),
        totalReceived: participants.reduce((acc, p) => acc + (Number(p.paymentReceived) || 0), 0),
        totalRemaining: participants.reduce((acc, p) => acc + (Number(p.remainingAmount) || 0), 0),
        totalAdSpend: transactions.filter(t => t.type === 'spend').reduce((acc, t) => acc + (Number(t.amount) || 0), 0)
      }
    });
  } catch (err: any) {
    console.error("AI Insights Endpoint Error:", err);
    res.status(500).json({ error: "Failed to generate AI Insights: " + err.message });
  }
});

// AI Endpoint 2: Interactive Chatbox
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({ 
        success: false,
        error: "Gemini API key is not configured. Please add GEMINI_API_KEY in Settings > Secrets to enable Erickson AI Copilot.",
        isConfigured: false
      });
    }

    const { participants, transactions, settings } = await fetchProjectData();
    const context = assembleContext(participants, transactions, settings);

    const systemInstruction = `You are Erickson Coaching India's Portal AI Assistant. Your task is to analyze the program's data and answer questions accurately.

STRICT GUIDELINES:
1. You must ONLY use the provided data about the program, participants, budget, and transactions to answer queries.
2. If the user asks about something outside of this data (e.g. general web knowledge, generic programming or marketing advice, unrelated topics, or other programs), politely but professionally inform them that you are only authorized to discuss the Erickson Coaching India Portal, cohorts, financials, and participant insights based on your database context.
3. Keep answers concise, highly structured, professional, and factual. Use tables or lists where helpful!
4. Represent all financial figures in Indian Rupees (INR) exactly as they are recorded in the database.
5. If the user asks for insights, provide actionable metrics: ROI on ad spend channels, collection percentage, cohort enrollment velocity, demographic hot spots, partner performances, etc.
6. NEVER fabricate or assume data that is not explicitly present in the data context.
7. Avoid exposing internal software database code configurations or variables in discussion unless specifically asked by developers.
8. Maintain Erickson International's professional, customer-focused, and supportive coaching tone.
9. You have access to the exact live database metrics below. Read them carefully and do math if needed.

LIVE DATABASE DATA CONTEXT:
${context}
`;

    const aiInstance = getGenAI();

    // Convert messages to expected Gemini format { role: 'user' | 'model', parts: [{ text: content }] }
    const formattedContents = messages.map((m: any) => {
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || "" }]
      };
    });

    const response = await aiInstance.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    res.json({
      success: true,
      isConfigured: true,
      reply: response.text
    });
  } catch (err: any) {
    console.error("AI Chat Endpoint Error:", err);
    res.status(500).json({ error: "AI Chat Assistant failed to answer: " + err.message });
  }
});

export default app;
