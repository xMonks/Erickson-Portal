import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import { google } from "googleapis";
import { GoogleGenAI } from "@google/genai";
import { readFileSync } from "fs";
import path from "path";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";

const app = express();

app.use(cors());
app.use(express.json());

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

// Gmail Transporter (Gaurav Arora / Default)
const GMAIL_USER = (process.env.GMAIL_USER || "").trim();
const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || "").trim();

const gmailTransporter = GMAIL_USER && GMAIL_APP_PASSWORD
  ? nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    })
  : null;

// Gmail Transporter (Saurav Tiwari)
let SENDER2_USER = (process.env.SENDER2_USER || "").trim();
if (!SENDER2_USER || !SENDER2_USER.includes("@")) {
  SENDER2_USER = "saurav@erickson.co.in";
}
const SENDER2_APP_PASSWORD = (process.env.SENDER2_APP_PASSWORD || "qleb mdcn llda fevv").trim();

const sauravTransporter = SENDER2_USER && SENDER2_APP_PASSWORD
  ? nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: SENDER2_USER,
        pass: SENDER2_APP_PASSWORD,
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
  const { 
    clientName, 
    clientEmail, 
    isTest, 
    ccEmail, 
    courseDatesPart1, 
    courseDatesPart2, 
    courseTimings, 
    courseTimingNote,
    batchStartDate, 
    senderId,
    zoomLink,
    zoomMeetingId,
    zoomPasscode,
    zoomButtonLabel
  } = req.body;

  if (!clientName || !clientEmail) {
    return res.status(400).json({ error: "Client name and email are required." });
  }

  // Determine sender details
  let selectedTransporter = gmailTransporter;
  let fromEmail = GMAIL_USER || "marketing@xmonks.com";
  let fromName = "Gaurav Arora";
  let signName = "Gaurav Arora";
  let signTitle = "Inspirer";

  if (senderId === "saurav") {
    selectedTransporter = sauravTransporter;
    fromEmail = SENDER2_USER;
    fromName = "Saurav Tiwari";
    signName = "Saurav Tiwari";
    signTitle = "Erickson Coaching India";
  }

  const subject = "Welcome: The Art and Science of Coaching (The Essentials Course) by Erickson Coaching International (India Team)";
  const finalSubject = isTest ? `[TEST] ${subject}` : subject;
  const ccRecipient = ccEmail || undefined;

  let part1 = courseDatesPart1;
  let part2 = courseDatesPart2;
  let timings = courseTimings;
  let timingNote = courseTimingNote;
  let startD = batchStartDate;
  let zoomUrl = zoomLink;
  let zoomId = zoomMeetingId;
  let zoomPass = zoomPasscode;
  let zoomLabel = zoomButtonLabel;

  // 1. Always fetch the latest master settings from Firestore (configured in Developer tab)
  if (fbDb) {
    try {
      const docRef = doc(fbDb, 'settings', 'calendarLinks');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.courseDatesPart1) part1 = data.courseDatesPart1;
        if (data.courseDatesPart2) part2 = data.courseDatesPart2;
        if (data.courseTimings) timings = data.courseTimings;
        if (data.courseTimingNote !== undefined) timingNote = data.courseTimingNote;
        if (data.batchStartDate) startD = data.batchStartDate;
        if (data.zoomLink) zoomUrl = data.zoomLink;
        if (data.zoomMeetingId !== undefined && data.zoomMeetingId !== null && data.zoomMeetingId !== "") {
          zoomId = data.zoomMeetingId;
        }
        if (data.zoomPasscode !== undefined && data.zoomPasscode !== null && data.zoomPasscode !== "") {
          zoomPass = data.zoomPasscode;
        }
        if (data.zoomButtonLabel) zoomLabel = data.zoomButtonLabel;
      }
    } catch (e) {
      console.error("Failed to fetch settings from firestore in backend send-email:", e);
    }
  }

  // 2. Allow client override only if client specifically passed a non-legacy custom Zoom URL/Meeting ID
  if (zoomLink && !zoomLink.includes("85070565878")) {
    zoomUrl = zoomLink;
  }
  if (zoomMeetingId && zoomMeetingId !== "850 7056 5878") {
    zoomId = zoomMeetingId;
  }
  if (zoomPasscode && zoomPasscode !== "462023") {
    zoomPass = zoomPasscode;
  }

  // 3. Fallback to the active default Zoom URL if still missing or legacy
  if (!zoomUrl || zoomUrl.includes("85070565878")) {
    zoomUrl = "https://us06web.zoom.us/j/3711171088?pwd=bHJnM0pLaVdEVE14NVRNR2dtNDZIZz09";
  }

  // 4. Auto-extract Zoom Meeting ID & Passcode from zoomUrl
  if (zoomUrl) {
    const idMatch = zoomUrl.match(/\/j\/([0-9]+)/);
    if (idMatch && idMatch[1] && (!zoomId || zoomId === "850 7056 5878")) {
      const digits = idMatch[1];
      if (digits.length === 11) {
        zoomId = `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
      } else if (digits.length === 10 || digits.length === 9) {
        zoomId = `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
      } else {
        zoomId = digits;
      }
    }
    const pwdMatch = zoomUrl.match(/[?&]pwd=([^&#]+)/);
    if (pwdMatch && pwdMatch[1] && (!zoomPass || zoomPass === "462023")) {
      zoomPass = decodeURIComponent(pwdMatch[1]);
    }
  }

  // Strip any old legacy values completely
  if (zoomId === "850 7056 5878") zoomId = "371 117 1088";
  if (zoomPass === "462023") zoomPass = "bHJnM0pLaVdEVE14NVRNR2dtNDZIZz09";

  part1 = part1 || "28th May - 31st May, 2026 & 04th June - 07th June, 2026";
  part2 = part2 || "11th June - 14th June, 2026 & 18th June - 21st June, 2026";
  timings = timings || "06:00 - 09:30 PM IST";
  zoomUrl = zoomUrl || "https://us06web.zoom.us/j/3711171088?pwd=bHJnM0pLaVdEVE14NVRNR2dtNDZIZz09";
  zoomId = zoomId || "371 117 1088";
  zoomPass = zoomPass || "bHJnM0pLaVdEVE14NVRNR2dtNDZIZz09";
  zoomLabel = zoomLabel || "Join Zoom Meeting";

  const parseTimings = (str?: string) => {
    if (!str) return { startTime: "6:00 PM", endTime: "9:30 PM", durationText: "3.50 hours" };
    const clean = str.replace(/\s+/g, " ").trim();
    const parts = clean.split(/\s*[-–—]\s*|\s+to\s+/i);
    if (parts.length >= 2) {
      let p1 = parts[0].trim();
      let p2 = parts[1].trim();
      let p2NoTz = p2.replace(/\b(IST|EST|EDT|CST|CDT|PST|PDT|UTC|GMT)\b/gi, "").trim();
      const p2PeriodMatch = p2NoTz.match(/(AM|PM)/i);
      let p2Period = p2PeriodMatch ? p2PeriodMatch[1].toUpperCase() : "";
      const p1PeriodMatch = p1.match(/(AM|PM)/i);
      let p1Period = p1PeriodMatch ? p1PeriodMatch[1].toUpperCase() : "";
      const getHM = (s: string) => {
        const m = s.match(/(\d+)(?::(\d+))?/);
        if (!m) return null;
        return { h: parseInt(m[1], 10), min: m[2] ? parseInt(m[2], 10) : 0 };
      };
      const hm1 = getHM(p1);
      const hm2 = getHM(p2NoTz);
      if (hm1 && hm2) {
        if (hm1.h >= 13 || hm2.h >= 13) {
          if (hm1.h >= 12) p1Period = "PM"; else p1Period = "AM";
          if (hm2.h >= 12) p2Period = "PM"; else p2Period = "AM";
          if (hm1.h > 12) hm1.h -= 12;
          if (hm2.h > 12) hm2.h -= 12;
        } else {
          if (!p1Period && p2Period) {
            if (p2Period === "PM" && hm1.h >= 1 && hm1.h <= 7) p1Period = "PM";
            else if (p2Period === "PM" && hm1.h >= 8 && hm1.h <= 11) p1Period = "AM";
            else p1Period = p2Period;
          } else if (!p2Period && p1Period) {
            p2Period = p1Period;
          } else if (!p1Period && !p2Period) {
            p1Period = (hm1.h >= 1 && hm1.h <= 7) ? "PM" : "AM";
            p2Period = "PM";
          }
        }
        let totalMins1 = (hm1.h % 12) * 60 + hm1.min;
        if (p1Period === "PM") totalMins1 += 12 * 60;
        let totalMins2 = (hm2.h % 12) * 60 + hm2.min;
        if (p2Period === "PM") totalMins2 += 12 * 60;
        let diff = totalMins2 - totalMins1;
        if (diff < 0) diff += 24 * 60;
        const hours = diff / 60;
        const durationText = Number.isInteger(hours) ? `${hours}.00 hours` : `${hours.toFixed(2)} hours`;
        const formatPart = (hm: { h: number; min: number }, period: string) => {
          const minStr = hm.min > 0 ? (hm.min < 10 ? `0${hm.min}` : `${hm.min}`) : "00";
          return `${hm.h}:${minStr} ${period}`;
        };
        return {
          startTime: formatPart(hm1, p1Period),
          endTime: formatPart(hm2, p2Period),
          durationText
        };
      }
    }
    return { startTime: clean, endTime: "", durationText: "3.50 hours" };
  };

  const buildTimingParagraph = (tms?: string, customNote?: string) => {
    if (customNote && customNote.trim()) return customNote.trim();
    const parsed = parseTimings(tms);
    if (parsed.startTime && parsed.endTime) {
      return `Please note that Part I & II Online consists of 16 live online Zoom sessions each lasting ${parsed.durationText} with an expectation of approximately 45 minutes of outside class time work per online session. We will start at ${parsed.startTime} every day and conclude by ${parsed.endTime}.`;
    }
    if (tms && tms.trim()) {
      return `Please note that Part I & II Online consists of 16 live online Zoom sessions with an expectation of approximately 45 minutes of outside class time work per online session. Sessions will start at ${tms} every day.`;
    }
    return `Please note that Part I & II Online consists of 16 live online Zoom sessions each lasting 3.50 hours with an expectation of approximately 45 minutes of outside class time work per online session. We will start at 6:00 PM every day and conclude by 9:30 PM.`;
  };

  const timingParagraph = buildTimingParagraph(timings, timingNote);

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
                <a href="${zoomUrl}" target="_blank" style="display: inline-block; background-color: #0056b3; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">${zoomLabel}</a>
              </div>
              ${(zoomId || zoomPass) ? `
              <p style="font-size: 14px; margin-top: 16px; color: #6b7280; font-family: 'Courier New', Courier, monospace;">
                ${zoomId ? `Meeting ID: ${zoomId}<br>` : ''}
                ${zoomPass ? `Passcode: ${zoomPass}` : ''}
              </p>` : ''}
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-bottom: 24px;">
              ${timingParagraph}
            </p>

            <p style="font-size: 16px; margin-bottom: 16px;">Before we close, our sincere thanks to you once again for trusting us and bringing your expertise to this program. You, as an organization leader, have the vision, the knowledge, and the experience to add tremendous value to the workshop. Throughout this program, we ask you to stay engaged, and curious, keep us proactive and help us shape the future of Coaching in India.</p>

            <p style="font-size: 16px; margin-bottom: 16px;">We all have it in us to thrive and be the best version of ourselves. We look forward to the magic we’ll co-create in your life. Get ready for super exciting sessions. I wish you all the very best for your Coaching journey and assure you of our utmost commitment. Should you need any clarification, please feel free to reach out to me.</p>

            <p style="font-size: 16px; margin-bottom: 16px;">My personal respect and thanks go out to all of you. Let’s change the world, one conversation at a time!</p>

            <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="margin-bottom: 4px; font-weight: 600;">Great Regards,</p>
              <p style="margin-bottom: 4px; font-weight: 700; color: #0056b3;">${signName}</p>
              <p style="margin: 0; font-size: 14px; color: #6b7280;">${signTitle}</p>
            </div>
          </div>
        </div>
      `;

  try {
    if (selectedTransporter) {
      await selectedTransporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: clientEmail,
        cc: ccRecipient,
        subject: finalSubject,
        html: emailHtml,
      });
      return res.status(200).json({ message: `Email sent successfully via ${fromName}!` });
    }

    return res.status(500).json({ 
      error: "No email service configured for the selected sender. Please verify GMAIL_USER/GMAIL_APP_PASSWORD or SENDER2_USER/SENDER2_APP_PASSWORD." 
    });

  } catch (err: any) {
    console.error("Email error:", err);
    res.status(500).json({ error: "Failed to send email. " + (err.message || "") });
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
        from: `"Gaurav Arora" <${GMAIL_USER}>`,
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
      model: "gemini-3.8-flash",
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

// Heuristic parser for fallback
function fallbackParseParticipant(rawText: string, defaultBatchNumber?: string) {
  const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);
  const parsed: any = {
    firstName: "",
    lastName: "",
    email: "",
    countryCode: "+91",
    phone: "",
    company: "",
    designation: "",
    gender: "",
    batchNumber: defaultBatchNumber || "",
    city: "",
    industry: "",
    linkedIn: "",
    coachingJourney: "TASC",
    otherPrograms: "",
    cmm: "",
    tcc: "",
    tlc: "",
    clientPartner: "",
    leadSource: "Direct",
    totalAmount: 160000,
    paymentReceived: 0,
    paymentStatus: "Pending",
    fullAddress: ""
  };

  const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) parsed.email = emailMatch[0].toLowerCase();

  const phoneMatch = rawText.match(/(?:\+?91[\-\s]?)?([6-9]\d{9})/);
  if (phoneMatch) parsed.phone = phoneMatch[1];

  const batchMatch = rawText.match(/batch[\s\-_:]*([A-Za-z0-9]+)/i);
  if (batchMatch) parsed.batchNumber = batchMatch[1];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if ((lower.startsWith("name:") || lower.startsWith("full name:") || lower.startsWith("participant:")) && !parsed.firstName) {
      const val = line.substring(line.indexOf(":") + 1).trim();
      const parts = val.split(" ");
      parsed.firstName = parts[0] || "";
      parsed.lastName = parts.slice(1).join(" ") || "";
    } else if (lower.startsWith("first name:")) {
      parsed.firstName = line.substring(line.indexOf(":") + 1).trim();
    } else if (lower.startsWith("last name:")) {
      parsed.lastName = line.substring(line.indexOf(":") + 1).trim();
    } else if (lower.startsWith("company:") || lower.startsWith("organization:")) {
      parsed.company = line.substring(line.indexOf(":") + 1).trim();
    } else if (lower.startsWith("designation:") || lower.startsWith("role:") || lower.startsWith("title:")) {
      parsed.designation = line.substring(line.indexOf(":") + 1).trim();
    } else if (lower.startsWith("city:") || lower.startsWith("location:")) {
      parsed.city = line.substring(line.indexOf(":") + 1).trim();
    } else if (lower.startsWith("industry:")) {
      parsed.industry = line.substring(line.indexOf(":") + 1).trim();
    } else if (lower.startsWith("gender:")) {
      parsed.gender = line.substring(line.indexOf(":") + 1).trim();
    } else if (lower.startsWith("linkedin:")) {
      parsed.linkedIn = line.substring(line.indexOf(":") + 1).trim();
    } else if (lower.startsWith("total fee:") || lower.startsWith("fee:") || lower.startsWith("amount:")) {
      const num = parseInt(line.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(num) && num > 0) parsed.totalAmount = num;
    } else if (lower.startsWith("paid:") || lower.startsWith("payment received:")) {
      const num = parseInt(line.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(num)) parsed.paymentReceived = num;
    }
  }

  if (!parsed.firstName && lines.length > 0) {
    const firstLineWords = lines[0].split(" ").map(w => w.trim()).filter(Boolean);
    if (firstLineWords.length >= 1 && !firstLineWords[0].includes("@") && !firstLineWords[0].includes("http")) {
      parsed.firstName = firstLineWords[0];
      parsed.lastName = firstLineWords.slice(1).join(" ");
    }
  }

  if (parsed.totalAmount && parsed.paymentReceived) {
    if (parsed.paymentReceived >= parsed.totalAmount) parsed.paymentStatus = "Paid";
    else if (parsed.paymentReceived > 0) parsed.paymentStatus = "Partial";
  }

  return [parsed];
}

// AI Endpoint 3: Convert raw text to structured Participant DB schema
app.post("/api/ai/parse-participant", async (req, res) => {
  try {
    const { rawText, defaultBatchNumber } = req.body;
    if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
      return res.status(400).json({ error: "Please provide raw text or participant details to convert." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const participants = fallbackParseParticipant(rawText, defaultBatchNumber);
      return res.json({
        success: true,
        source: "heuristic",
        participants,
        summary: `Extracted ${participants.length} participant(s) using pattern matching (Gemini API key not configured).`
      });
    }

    const aiInstance = getGenAI();
    const prompt = `You are an expert data parsing assistant for Erickson Coaching India's Participant Management System.
Analyze the following raw unstructured text (could be an email, lead details, notes, WhatsApp paste, registration form, etc.) and extract all participant records.

Text to parse:
"""
${rawText.trim()}
"""

Default Batch Number (use if not found in text): "${defaultBatchNumber || ""}"

Requirements:
1. Extract every individual participant mentioned in the text.
2. For each participant, map to this exact database structure:
- firstName: string (Mandatory. Capitalize properly).
- lastName: string (Last name or surname. Capitalize properly, default to empty string if none).
- email: string (Mandatory. Valid email address, lowercased. If not found, leave empty string).
- countryCode: string (e.g. "+91" for India, "+1" for US/Canada. Default "+91" if Indian number or unspecified).
- phone: string (Mobile/phone number with only digits, without country code. E.g. "9876543210").
- company: string (Organization/Employer name).
- designation: string (Job title/role).
- gender: string ("Male", "Female", "Other", or empty string if unknown).
- batchNumber: string (Cohort number, e.g. "65", "Batch 65", or default).
- city: string (City name).
- industry: string (Industry/domain).
- linkedIn: string (LinkedIn URL or profile handle if mentioned).
- coachingJourney: string (e.g. "TASC", "Executive Coaching", "ICF ACC", "PCC").
- otherPrograms: string (Any other programs mentioned).
- cmm: string (e.g. "Yes", "No", or specific notes).
- tcc: string (e.g. "Yes", "No", or specific notes).
- tlc: string (e.g. "Yes", "No", or specific notes).
- clientPartner: string (Account manager / partner name if mentioned).
- leadSource: string (e.g. "Website", "LinkedIn", "Referral", "Zoho CRM", "Direct", "Meta Ads").
- totalAmount: number (Course fee in INR as numeric, default 160000 if not specified).
- paymentReceived: number (Amount already received in INR as numeric, default 0).
- paymentStatus: string ("Paid", "Pending", "Partial", "Overdue").
- fullAddress: string (Full street address if available).

Output format:
Respond with ONLY a valid JSON object matching this structure:
{
  "participants": [
    {
      "firstName": "...",
      "lastName": "...",
      "email": "...",
      "countryCode": "+91",
      "phone": "...",
      "company": "...",
      "designation": "...",
      "gender": "...",
      "batchNumber": "...",
      "city": "...",
      "industry": "...",
      "linkedIn": "...",
      "coachingJourney": "...",
      "otherPrograms": "...",
      "cmm": "...",
      "tcc": "...",
      "tlc": "...",
      "clientPartner": "...",
      "leadSource": "...",
      "totalAmount": 160000,
      "paymentReceived": 0,
      "paymentStatus": "Pending",
      "fullAddress": "..."
    }
  ],
  "summary": "Brief 1-line summary of what was converted"
}
`;

    const response = await aiInstance.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text || "";
    let parsedData: any = null;
    try {
      parsedData = JSON.parse(responseText);
    } catch (e) {
      const cleaned = responseText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      parsedData = JSON.parse(cleaned);
    }

    const participantsList = Array.isArray(parsedData?.participants) ? parsedData.participants : [];
    if (participantsList.length === 0) {
      const fallback = fallbackParseParticipant(rawText, defaultBatchNumber);
      return res.json({
        success: true,
        source: "gemini-fallback",
        participants: fallback,
        summary: "Parsed participant using pattern matching."
      });
    }

    const cleanedParticipants = participantsList.map((p: any) => ({
      firstName: (p.firstName || "").trim(),
      lastName: (p.lastName || "").trim(),
      email: (p.email || "").trim().toLowerCase(),
      countryCode: (p.countryCode || "+91").trim(),
      phone: (p.phone || "").replace(/[^0-9]/g, "").slice(-10),
      company: (p.company || "").trim(),
      designation: (p.designation || "").trim(),
      gender: (p.gender || "").trim(),
      batchNumber: (p.batchNumber || defaultBatchNumber || "").trim(),
      city: (p.city || "").trim(),
      industry: (p.industry || "").trim(),
      linkedIn: (p.linkedIn || "").trim(),
      coachingJourney: (p.coachingJourney || "TASC").trim(),
      otherPrograms: (p.otherPrograms || "").trim(),
      cmm: (p.cmm || "").trim(),
      tcc: (p.tcc || "").trim(),
      tlc: (p.tlc || "").trim(),
      clientPartner: (p.clientPartner || "").trim(),
      leadSource: (p.leadSource || "Direct").trim(),
      totalAmount: typeof p.totalAmount === "number" ? p.totalAmount : 160000,
      paymentReceived: typeof p.paymentReceived === "number" ? p.paymentReceived : 0,
      paymentStatus: p.paymentStatus || (p.paymentReceived >= (p.totalAmount || 160000) ? "Paid" : p.paymentReceived > 0 ? "Partial" : "Pending"),
      fullAddress: (p.fullAddress || "").trim(),
    }));

    res.json({
      success: true,
      source: "gemini-3.8-flash",
      participants: cleanedParticipants,
      summary: parsedData.summary || `Successfully converted ${cleanedParticipants.length} participant(s) into database structure.`
    });
  } catch (err: any) {
    console.error("AI Parse Participant Error:", err);
    try {
      const fallback = fallbackParseParticipant(req.body.rawText, req.body.defaultBatchNumber);
      res.json({
        success: true,
        source: "error-fallback",
        participants: fallback,
        summary: "Converted participant using fallback parser: " + err.message
      });
    } catch (innerErr) {
      res.status(500).json({ error: "Failed to parse participant: " + err.message });
    }
  }
});

// Zoho CRM Helper Functions
async function resolveZohoConfig(overrides?: any) {
  let clientId = (overrides?.clientId || "").trim();
  let clientSecret = (overrides?.clientSecret || "").trim();
  let region = (overrides?.region || "").trim().toLowerCase();
  let refreshToken = (overrides?.refreshToken || "").trim();
  let source = "request";

  if (!clientId) {
    clientId = (process.env.ZOHO_CLIENT_ID || (process.env as any).Zoho_Client_Id || "").trim();
    source = "env";
  }
  if (!clientSecret) {
    clientSecret = (process.env.ZOHO_CLIENT_SECRET || (process.env as any).Zoho_Client_Secret || "").trim();
  }
  if (!region) {
    region = (process.env.ZOHO_REGION || (process.env as any).Zoho_Region || "").trim().toLowerCase();
  }
  if (!refreshToken) {
    refreshToken = (process.env.ZOHO_REFRESH_TOKEN || (process.env as any).Zoho_Refresh_Token || "").trim();
  }

  if ((!clientId || !refreshToken) && fbDb) {
    try {
      const zohoDoc = await getDoc(doc(fbDb, "settings", "zohoConfig"));
      if (zohoDoc.exists()) {
        const zData = zohoDoc.data();
        if (!clientId && zData.clientId) clientId = zData.clientId.trim();
        if (!clientSecret && zData.clientSecret) clientSecret = zData.clientSecret.trim();
        if (!region && zData.region) region = zData.region.trim().toLowerCase();
        if (!refreshToken && zData.refreshToken) refreshToken = zData.refreshToken.trim();
        source = source === "env" ? "env+firestore" : "firestore";
      }
    } catch (e) {
      console.warn("Could not read zohoConfig from Firestore:", e);
    }
  }

  if (!region) region = "in";

  let accountsDomain = "accounts.zoho.in";
  let apiDomain = "www.zohoapis.in";

  if (region === "com" || region === "us") {
    accountsDomain = "accounts.zoho.com";
    apiDomain = "www.zohoapis.com";
  } else if (region === "eu") {
    accountsDomain = "accounts.zoho.eu";
    apiDomain = "www.zohoapis.eu";
  } else if (region === "au" || region === "com.au") {
    accountsDomain = "accounts.zoho.com.au";
    apiDomain = "www.zohoapis.com.au";
  } else if (region === "ca") {
    accountsDomain = "accounts.zoho.ca";
    apiDomain = "www.zohoapis.ca";
  } else if (region === "cn" || region === "com.cn") {
    accountsDomain = "accounts.zoho.com.cn";
    apiDomain = "www.zohoapis.com.cn";
  }

  return { clientId, clientSecret, region, refreshToken, accountsDomain, apiDomain, source };
}

app.get("/api/zoho/status", async (req, res) => {
  try {
    const config = await resolveZohoConfig();
    res.json({
      isConfigured: !!(config.clientId && config.clientSecret && config.refreshToken),
      clientIdConfigured: !!config.clientId,
      clientIdMasked: config.clientId ? `${config.clientId.substring(0, 10)}...${config.clientId.slice(-4)}` : null,
      clientSecretConfigured: !!config.clientSecret,
      refreshTokenConfigured: !!config.refreshToken,
      refreshTokenMasked: config.refreshToken ? `${config.refreshToken.substring(0, 8)}...${config.refreshToken.slice(-4)}` : null,
      region: config.region,
      accountsDomain: config.accountsDomain,
      apiDomain: config.apiDomain,
      source: config.source
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to get Zoho status: " + err.message });
  }
});

app.post("/api/zoho/test-connection", async (req, res) => {
  try {
    const config = await resolveZohoConfig(req.body);

    if (!config.clientId || !config.clientSecret) {
      return res.status(400).json({
        success: false,
        error: "Missing Zoho Client ID or Client Secret.",
        diagnostics: {
          clientIdConfigured: !!config.clientId,
          clientSecretConfigured: !!config.clientSecret,
          refreshTokenConfigured: !!config.refreshToken,
          region: config.region
        }
      });
    }

    if (!config.refreshToken) {
      return res.status(400).json({
        success: false,
        error: "Zoho Refresh Token is missing. Please provide a valid Zoho Refresh Token.",
        diagnostics: {
          clientIdConfigured: !!config.clientId,
          clientIdMasked: config.clientId ? `${config.clientId.substring(0, 10)}...` : null,
          clientSecretConfigured: !!config.clientSecret,
          refreshTokenConfigured: false,
          region: config.region,
          accountsDomain: config.accountsDomain
        }
      });
    }

    const tokenUrl = `https://${config.accountsDomain}/oauth/v2/token`;
    const tokenParams = new URLSearchParams({
      refresh_token: config.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token"
    });

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString()
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error || !tokenData.access_token) {
      return res.status(400).json({
        success: false,
        error: tokenData.error === "invalid_code"
          ? "Invalid or expired Zoho Refresh Token. Please regenerate a refresh token in the Zoho API Console."
          : tokenData.error === "invalid_client"
          ? "Invalid Zoho Client ID or Client Secret for region " + config.region
          : `Zoho OAuth error: ${tokenData.error || "Failed to exchange refresh token"}`,
        rawResponse: tokenData,
        diagnostics: {
          clientIdMasked: `${config.clientId.substring(0, 10)}...`,
          region: config.region,
          accountsDomain: config.accountsDomain,
          tokenUrl
        }
      });
    }

    const accessToken = tokenData.access_token;
    const effectiveApiDomain = tokenData.api_domain 
      ? tokenData.api_domain.replace(/^https?:\/\//, "") 
      : config.apiDomain;

    let orgName = "Zoho CRM Connected";
    let userEmail = "";
    let userName = "";

    try {
      const userRes = await fetch(`https://${effectiveApiDomain}/crm/v3/users?type=CurrentUser`, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`
        }
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData.users && userData.users.length > 0) {
          userName = userData.users[0].full_name || "";
          userEmail = userData.users[0].email || "";
        }
      }
    } catch (apiErr) {
      console.warn("Could not fetch user details from Zoho API:", apiErr);
    }

    try {
      const orgRes = await fetch(`https://${effectiveApiDomain}/crm/v3/org`, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`
        }
      });
      if (orgRes.ok) {
        const orgData = await orgRes.json();
        if (orgData.org && orgData.org.length > 0) {
          orgName = orgData.org[0].company_name || orgName;
        }
      }
    } catch (orgErr) {
      console.warn("Could not fetch org details from Zoho API:", orgErr);
    }

    return res.json({
      success: true,
      message: "Successfully connected and authenticated with Zoho CRM!",
      orgName,
      userName,
      userEmail,
      region: config.region,
      apiDomain: effectiveApiDomain,
      accountsDomain: config.accountsDomain,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in
    });
  } catch (err: any) {
    console.error("Zoho connection test error:", err);
    return res.status(500).json({
      success: false,
      error: "Connection test error: " + err.message
    });
  }
});

app.post("/api/zoho/exchange-code", async (req, res) => {
  try {
    const code = (req.body?.code || "").trim();
    if (!code) {
      return res.status(400).json({ success: false, error: "Authorization code (grant token) is required." });
    }
    const config = await resolveZohoConfig(req.body);
    if (!config.clientId || !config.clientSecret) {
      return res.status(400).json({ success: false, error: "Zoho Client ID or Client Secret is missing." });
    }

    const tokenUrl = `https://${config.accountsDomain}/oauth/v2/token`;
    const tokenParams = new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "authorization_code"
    });

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString()
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error || !tokenData.access_token) {
      return res.status(400).json({
        success: false,
        error: tokenData.error === "invalid_code"
          ? "The Zoho Grant Code is invalid or has expired (Zoho grant codes expire after 2–10 minutes). Please generate a fresh code in Zoho API Console."
          : `Zoho error: ${tokenData.error || "Failed to exchange code"}`,
        rawResponse: tokenData
      });
    }

    const newRefreshToken = tokenData.refresh_token;

    if (newRefreshToken && fbDb) {
      try {
        await setDoc(doc(fbDb, "settings", "zohoConfig"), {
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          refreshToken: newRefreshToken,
          region: config.region,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn("Failed to auto-save refresh token to Firestore:", e);
      }
    }

    const effectiveApiDomain = tokenData.api_domain 
      ? tokenData.api_domain.replace(/^https?:\/\//, "") 
      : config.apiDomain;

    let orgName = "Zoho CRM Connected";
    let userName = "";
    let userEmail = "";

    try {
      const userRes = await fetch(`https://${effectiveApiDomain}/crm/v3/users?type=CurrentUser`, {
        headers: { Authorization: `Zoho-oauthtoken ${tokenData.access_token}` }
      });
      if (userRes.ok) {
        const uData = await userRes.json();
        if (uData.users && uData.users.length > 0) {
          userName = uData.users[0].full_name || "";
          userEmail = uData.users[0].email || "";
        }
      }
    } catch (_) {}

    try {
      const orgRes = await fetch(`https://${effectiveApiDomain}/crm/v3/org`, {
        headers: { Authorization: `Zoho-oauthtoken ${tokenData.access_token}` }
      });
      if (orgRes.ok) {
        const oData = await orgRes.json();
        if (oData.org && oData.org.length > 0) {
          orgName = oData.org[0].company_name || orgName;
        }
      }
    } catch (_) {}

    return res.json({
      success: true,
      message: "Grant code successfully exchanged for a permanent Refresh Token! Saved to project database.",
      refreshToken: newRefreshToken,
      orgName,
      userName,
      userEmail,
      apiDomain: effectiveApiDomain,
      accountsDomain: config.accountsDomain
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: "Exchange error: " + err.message });
  }
});


export default app;
