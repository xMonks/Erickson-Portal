import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, query, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Users, Mail, Loader2, CheckCircle2, AlertCircle, Eye, Send, BookOpen, ExternalLink, MessageCircle, Layers, ChevronDown, Check, X, Filter, Code, RotateCcw, Edit, RefreshCw, AlertTriangle, ArrowRight, Terminal, Copy, Download, Trash2, Maximize2, Minimize2, FileText, ChevronUp, Clock, Info, ShieldAlert } from 'lucide-react';

export interface DispatchLogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'sending' | 'success' | 'error' | 'skipped' | 'report';
  participantName?: string;
  email?: string;
  batch?: string;
  message: string;
  latencyMs?: number;
  errorReason?: string;
}

export interface DispatchRecipientResult {
  name: string;
  email: string;
  batch?: string;
  status: 'delivered' | 'failed' | 'skipped';
  error?: string;
  latencyMs?: number;
}

export interface DispatchReport {
  id: string;
  templateName: string;
  templateSubject: string;
  senderName: string;
  senderEmail: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  total: number;
  delivered: number;
  failed: number;
  skipped: number;
  recipients: DispatchRecipientResult[];
}

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  batchNumber?: string;
  clientPartner?: string;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  headerImage: string;
  headerLink?: string;
  content: string;
}

interface Video {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'leadership-ideas',
    name: 'Leadership Ideas',
    subject: 'A few ideas that might change how you lead',
    headerImage: 'https://xmonks.com/Gemini_Generated_Image_cl9aeicl9aeicl9a%20%281%29.png',
    content: `
Hi <Name>,
Most leadership challenges aren't skill problems. They're thinking problems.

Here are a few resources our clients find useful:

📝 Blogs

Coaching Doesn't Have Black and White Answers
xmonks.com/blogs/coaching-black-white
Anand Mahindra: An Epitome of Leadership
xmonks.com/blogs/anand-mahindra
Leadership Lessons from the Indian Army
https://xmonks.com/blogs/air-marshal-sanjeev-kapoor-why-no-one-can-break-india-india-pakistan-china

📘 Ebooks

Coaching Philosophy
https://xmonks.com/Ebookspdf/Coaching%20Philosophy%20E-book_Version-II_2021.pdf
The Magic of Coaching Conversations
https://xmonks.com/Ebookspdf/Magic%20of%20Coaching%20Conversation-%20Ebook_2021.pdf
Find Your Coaching Niche
https://xmonks.com/Ebookspdf/Coaching%20Competencies%20-%20EBook_2021_Verion%20II.pdf

These aren't theories — they're patterns we see every day in leaders, managers, and teams.

Take what's useful. Ignore the rest.

And if something resonates, that's worth paying attention to.
    `.trim()
  },
  {
    id: 'live-webinars',
    name: 'Live Webinars',
    subject: 'Join us live — conversations that matter',
    headerImage: 'https://www.xmonks.com/Gemini_Generated_Image_f8q9dsf8q9dsf8q9%20%281%29.png',
    content: `
Hi <Name>,
We regularly host:

• Live webinars on leadership & coaching
• Interactive workshops for managers and HR leaders
• Masterclasses on performance conversations & mindset

These sessions aren't lectures. They're thinking spaces — practical, reflective, and real.

If you'd like to join an upcoming session, you can explore what's coming up below.

Button Register for Upcoming Event : https://erickson.co.in/events-new.html

We'd love to have you in the room.
    `.trim()
  },
  {
    id: 'feedback',
    name: 'Feedback Form',
    subject: 'We Value Your Feedback –The Art & Science of Coaching - Essentials Course (Part I & II)',
    headerImage: 'https://xmonks.com/ChatGPT%20Image%20Apr%2021%2C%202026%2C%2002_27_25%20PM.png',
    headerLink: 'https://docs.google.com/forms/d/e/1FAIpQLScUPAZdgoDHrE7J2lrlVHcYbTIoEgZo46-4yjIZVCpzHIUHMA/viewform?usp=header',
    content: `
Hi <Name>,

Congratulations once again on completing The Art & Science of Coaching – Essentials Course (Part I & II).

This milestone reflects not just your commitment to learning, but your dedication to becoming a more conscious, impactful leader.

As you move forward on your leadership journey, we invite you to pause for a moment and reflect.

Your experience, insights, and honest feedback are incredibly valuable to us. They don’t just help us improve a program — they help us shape transformative experiences for future leaders like you.

We would be truly grateful if you could take a few minutes to share your thoughts:

Button Share Your Feedback : https://docs.google.com/forms/d/e/1FAIpQLScUPAZdgoDHrE7J2lrlVHcYbTIoEgZo46-4yjIZVCpzHIUHMA/viewform?usp=header

Your voice has the power to inspire, refine, and elevate what we create next.

Thank you for being an integral part of this journey.

Warm regards
    `.trim()
  },
  {
    id: 'youtube-videos',
    name: 'Latest YouTube Videos',
    subject: 'Wisdom for Your Journey — Latest from Gaurav Arora',
    headerImage: 'https://yt3.googleusercontent.com/B-izn7KAKWIZjjSxog3fvlu_50Rf2G8X7OaSg9HcpRNm0VkmtwTONdsn50eMFPBYVSn3gf4=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
    headerLink: 'https://www.youtube.com/playlist?list=PL83z9Rmr_Lf66HvjSOhmIXmZYyJm2AX7I',
    content: `
Hi <Name>,

Wisdom isn't just about what we know — it's about what we share.

We've recently released a series of deep-dive conversations on "The xMonks Drive" that explore the intersection of leadership, mindfulness, and human potential.

Here are the latest 4 episodes from our featured playlist you might find valuable:

[VIDEOS_GRID]

These conversations are designed to help you pause, reflect, and grow.

Button Explore Playlist : https://www.youtube.com/playlist?list=PL83z9Rmr_Lf66HvjSOhmIXmZYyJm2AX7I

We hope these insights spark something meaningful for you.
    `.trim()
  },
  {
    id: 'gratitude-diaries',
    name: 'Gratitude Diaries',
    subject: 'With Deep Gratitude – Your Metaphor Diaries',
    headerImage: 'https://xmonks.com/ChatGPT%20Image%20Apr%2030%2C%202026%2C%2002_38_08%20PM.png',
    content: `
Hi <Name>,

Metaphors have a way of touching our imagination and evoking emotions that words alone often cannot capture. They invite us to see deeper truths, sparking insight and shifting perspectives.

With this spirit, we extend our heartfelt gratitude to you for sharing the metaphors you associate with Coaching. Each of your reflections has been lovingly curated into the Metaphor Diaries. We are delighted to share this compilation with you as a token of appreciation and inspiration.

Button View Gratitude Diaries : https://www.xmonks.com/Metaphor%20Diaries%20from%20xMonks%20Batch-63_2026.pdf

In coaching conversations, the use of metaphors opens doors to powerful exploration, helping clients uncover meaning, clarity, and possibility. We hope this collection serves as a reminder of the creativity and depth you bring to the coaching space.

Thank you, once again, for your trust and presence on this journey. Wishing you continued success as you walk the path of growth and transformation.

Great Regards,
Gaurav Arora
    `.trim()
  },
  {
    id: 'tasc-upcoming',
    name: 'TASC Upcoming Dates',
    subject: 'Become an ICF Certified Coach (ACC - ICF) Weekend and Weekday Cohorts September 2026',
    headerImage: '',
    content: `<!doctype html>
<html
  lang="en"
  xmlns="http://www.w3.org/1999/xhtml"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:o="urn:schemas-microsoft-com:office:office"
>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">

  <title>TASC Upcoming Dates</title>

  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->

  <style>
    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: #0a4655;
    }

    * {
      -ms-text-size-adjust: 100%;
      -webkit-text-size-adjust: 100%;
    }

    table,
    td {
      mso-table-lspace: 0 !important;
      mso-table-rspace: 0 !important;
    }

    table {
      border-collapse: collapse !important;
    }

    img {
      border: 0;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
    }

    a {
      text-decoration: none;
    }

    @media screen and (max-width: 640px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
      }

      .mobile-padding {
        padding-left: 18px !important;
        padding-right: 18px !important;
      }

      .logo-image {
        width: 330px !important;
        max-width: 90% !important;
      }

      .stack-column {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }

      .part-one-column {
        padding-right: 0 !important;
        padding-bottom: 16px !important;
      }

      .part-two-column {
        padding-left: 0 !important;
      }

      .banner-title {
        font-size: 27px !important;
        line-height: 34px !important;
      }

      .opening-title {
        font-size: 21px !important;
        line-height: 29px !important;
      }

      .body-copy {
        font-size: 15px !important;
        line-height: 23px !important;
      }

      .contact-item {
        display: block !important;
        padding: 5px 0 !important;
      }
    }
  </style>
</head>

<body
  style="
    margin:0;
    padding:0;
    background-color:#0a4655;
  "
>

  <!-- Hidden email preheader -->
  <div
    style="
      display:none;
      font-size:1px;
      line-height:1px;
      max-height:0;
      max-width:0;
      opacity:0;
      overflow:hidden;
      color:#0a4655;
    "
  >
    Explore the upcoming 2026 cohorts for The Art &amp; Science of Coaching.
  </div>

  <table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
      width:100%;
      background-color:#0a4655;
    "
  >
    <tr>
      <td
        align="center"
        class="mobile-padding"
        style="
          padding:30px 16px;
        "
      >

        <table
          role="presentation"
          class="email-container"
          width="700"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            width:700px;
            max-width:700px;
            background-color:#ffffff;
            border:1px solid #78bfd0;
            border-radius:22px;
            overflow:hidden;
          "
        >

          <!-- Gold accent line -->
          <tr>
            <td
              style="
                height:5px;
                line-height:5px;
                font-size:0;
                background-color:#f4b72d;
              "
            >
              &nbsp;
            </td>
          </tr>

          <!-- Erickson Logo Gradient Header -->
          <tr>
            <td
              align="center"
              style="
                padding:0;
                background-color:#073d4a;
              "
            >
              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  width:100%;
                  background-color:#073d4a;
                  background-image:linear-gradient(
                    135deg,
                    #063743 0%,
                    #0b5668 45%,
                    #14809a 72%,
                    #63b8ce 100%
                  );
                "
              >
                <tr>
                  <td
                    align="center"
                    class="mobile-padding"
                    style="
                      padding:38px 40px;
                    "
                  >
                    <a
                      href="https://www.erickson.co.in/"
                      target="_blank"
                      style="
                        display:inline-block;
                        text-decoration:none;
                      "
                    >
                      <img
                        class="logo-image"
                        src="https://www.erickson.co.in/erickson.png"
                        width="390"
                        alt="Erickson Coaching International India"
                        style="
                          display:block;
                          width:390px;
                          max-width:100%;
                          height:auto;
                          margin:0 auto;
                        "
                      >
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- TASC Main Banner -->
          <tr>
            <td
              class="mobile-padding"
              style="
                padding:30px 40px 22px 40px;
                background-color:#ffffff;
              "
            >
              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  width:100%;
                  background-color:#175a6c;
                  background-image:linear-gradient(
                    90deg,
                    #15576a 0%,
                    #2d8198 52%,
                    #68bdd2 100%
                  );
                  border-radius:4px;
                "
              >
                <tr>
                  <td
                    valign="middle"
                    style="
                      padding:30px 28px;
                    "
                  >
                    <div
                      class="banner-title"
                      style="
                        font-family:Arial,Helvetica,sans-serif;
                        font-size:34px;
                        line-height:41px;
                        font-weight:700;
                        color:#ffffff;
                        letter-spacing:-0.5px;
                      "
                    >
                      TASC Upcoming Dates
                    </div>

                    <div
                      style="
                        padding-top:8px;
                        font-family:Arial,Helvetica,sans-serif;
                        font-size:16px;
                        line-height:24px;
                        color:#edfaff;
                      "
                    >
                      The Art &amp; Science of Coaching — 2026 Cohorts
                    </div>
                  </td>

                  <td
                    width="100"
                    align="center"
                    valign="middle"
                    style="
                      padding:20px 24px 20px 5px;
                    "
                  >
                    <table
                      role="presentation"
                      width="82"
                      cellpadding="0"
                      cellspacing="0"
                      border="0"
                      style="
                        width:82px;
                        height:82px;
                        background-color:#ffffff;
                        border:2px solid #dff5fa;
                      "
                    >
                      <tr>
                        <td
                          align="center"
                          valign="middle"
                          style="
                            font-family:Arial,Helvetica,sans-serif;
                            font-size:13px;
                            line-height:16px;
                            font-weight:700;
                            color:#0b6683;
                          "
                        >
                          ICF<br>

                          <span
                            style="
                              font-size:25px;
                              line-height:29px;
                              color:#0aa384;
                            "
                          >
                            1
                          </span>

                          <br>

                          <span
                            style="
                              font-size:9px;
                              line-height:12px;
                              font-weight:700;
                              color:#5d7780;
                            "
                          >
                            LEVEL
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td
              class="mobile-padding"
              style="
                padding:2px 40px 13px 40px;
                background-color:#ffffff;
              "
            >
              <div
                style="
                  font-family:Arial,Helvetica,sans-serif;
                  font-size:16px;
                  line-height:24px;
                  color:#365d68;
                "
              >
                Hello <strong>{{FIRST_NAME}}</strong>,
              </div>
            </td>
          </tr>

          <!-- Opening Statement -->
          <tr>
            <td
              class="mobile-padding"
              style="
                padding:0 40px 26px 40px;
                background-color:#ffffff;
              "
            >
              <div
                class="opening-title"
                style="
                  padding-bottom:10px;
                  font-family:Arial,Helvetica,sans-serif;
                  font-size:23px;
                  line-height:31px;
                  font-weight:700;
                  text-align:center;
                  color:#0d4b5d;
                "
              >
                Begin your journey towards professional coaching mastery.
              </div>

              <div
                class="body-copy"
                style="
                  font-family:Arial,Helvetica,sans-serif;
                  font-size:16px;
                  line-height:25px;
                  text-align:center;
                  color:#365d68;
                "
              >
                The Art &amp; Science of Coaching Essentials Program equips
                you with practical, solution-focused coaching tools to create
                meaningful transformation in individuals, teams, and
                organisations.
              </div>
            </td>
          </tr>

          <!-- Programme Dates -->
          <tr>
            <td
              class="mobile-padding"
              style="
                padding:4px 40px 28px 40px;
                background-color:#ffffff;
              "
            >
              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
              >
                <tr>

                  <!-- Part I -->
                  <td
                    class="stack-column part-one-column"
                    width="50%"
                    valign="top"
                    style="
                      width:50%;
                      padding-right:9px;
                    "
                  >
                    <table
                      role="presentation"
                      width="100%"
                      cellpadding="0"
                      cellspacing="0"
                      border="0"
                      style="
                        width:100%;
                        background-color:#f3f5f6;
                        border-radius:16px;
                      "
                    >
                      <tr>
                        <td
                          align="center"
                          style="
                            padding:24px 18px 15px 18px;
                            font-family:Georgia,'Times New Roman',serif;
                            font-size:22px;
                            line-height:28px;
                            font-style:italic;
                            font-weight:700;
                            color:#0d4b5d;
                          "
                        >
                          Part I
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:0 18px 12px 18px;">
                          <table
                            role="presentation"
                            width="100%"
                            cellpadding="0"
                            cellspacing="0"
                            border="0"
                            style="
                              width:100%;
                              background-color:#ffffff;
                              border:1px solid #b8dfeb;
                              border-radius:10px;
                            "
                          >
                            <tr>
                              <td
                                width="42"
                                align="center"
                                valign="middle"
                                style="
                                  padding:16px 0 16px 12px;
                                  font-family:Arial,Helvetica,sans-serif;
                                  font-size:22px;
                                  line-height:22px;
                                  color:#55b8d2;
                                "
                              >
                                &#128197;
                              </td>

                              <td
                                style="
                                  padding:14px 12px 14px 7px;
                                  font-family:Arial,Helvetica,sans-serif;
                                  font-size:16px;
                                  line-height:24px;
                                  color:#123f52;
                                "
                              >
                                <strong>17–20 September</strong><br>
                                2026
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:0 18px 22px 18px;">
                          <table
                            role="presentation"
                            width="100%"
                            cellpadding="0"
                            cellspacing="0"
                            border="0"
                            style="
                              width:100%;
                              background-color:#ffffff;
                              border:1px solid #b8dfeb;
                              border-radius:10px;
                            "
                          >
                            <tr>
                              <td
                                width="42"
                                align="center"
                                valign="middle"
                                style="
                                  padding:16px 0 16px 12px;
                                  font-family:Arial,Helvetica,sans-serif;
                                  font-size:22px;
                                  line-height:22px;
                                  color:#55b8d2;
                                "
                              >
                                &#128197;
                              </td>

                              <td
                                style="
                                  padding:14px 12px 14px 7px;
                                  font-family:Arial,Helvetica,sans-serif;
                                  font-size:16px;
                                  line-height:24px;
                                  color:#123f52;
                                "
                              >
                                <strong>24–27 September</strong><br>
                                2026
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <!-- Part II -->
                  <td
                    class="stack-column part-two-column"
                    width="50%"
                    valign="top"
                    style="
                      width:50%;
                      padding-left:9px;
                    "
                  >
                    <table
                      role="presentation"
                      width="100%"
                      cellpadding="0"
                      cellspacing="0"
                      border="0"
                      style="
                        width:100%;
                        background-color:#f3f5f6;
                        border-radius:16px;
                      "
                    >
                      <tr>
                        <td
                          align="center"
                          style="
                            padding:24px 18px 15px 18px;
                            font-family:Georgia,'Times New Roman',serif;
                            font-size:22px;
                            line-height:28px;
                            font-style:italic;
                            font-weight:700;
                            color:#0d4b5d;
                          "
                        >
                          Part II
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:0 18px 12px 18px;">
                          <table
                            role="presentation"
                            width="100%"
                            cellpadding="0"
                            cellspacing="0"
                            border="0"
                            style="
                              width:100%;
                              background-color:#ffffff;
                              border:1px solid #b8dfeb;
                              border-radius:10px;
                            "
                          >
                            <tr>
                              <td
                                width="42"
                                align="center"
                                valign="middle"
                                style="
                                  padding:16px 0 16px 12px;
                                  font-family:Arial,Helvetica,sans-serif;
                                  font-size:22px;
                                  line-height:22px;
                                  color:#55b8d2;
                                "
                              >
                                &#128197;
                              </td>

                              <td
                                style="
                                  padding:14px 12px 14px 7px;
                                  font-family:Arial,Helvetica,sans-serif;
                                  font-size:16px;
                                  line-height:24px;
                                  color:#123f52;
                                "
                              >
                                <strong>8–11 October</strong><br>
                                2026
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:0 18px 22px 18px;">
                          <table
                            role="presentation"
                            width="100%"
                            cellpadding="0"
                            cellspacing="0"
                            border="0"
                            style="
                              width:100%;
                              background-color:#ffffff;
                              border:1px solid #b8dfeb;
                              border-radius:10px;
                            "
                          >
                            <tr>
                              <td
                                width="42"
                                align="center"
                                valign="middle"
                                style="
                                  padding:16px 0 16px 12px;
                                  font-family:Arial,Helvetica,sans-serif;
                                  font-size:22px;
                                  line-height:22px;
                                  color:#55b8d2;
                                "
                              >
                                &#128197;
                              </td>

                              <td
                                style="
                                  padding:14px 12px 14px 7px;
                                  font-family:Arial,Helvetica,sans-serif;
                                  font-size:16px;
                                  line-height:24px;
                                  color:#123f52;
                                "
                              >
                                <strong>15–18 October</strong><br>
                                2026
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>

                </tr>
              </table>
            </td>
          </tr>

          <!-- Learning Outcomes -->
          <tr>
            <td
              class="mobile-padding"
              style="
                padding:2px 40px 28px 40px;
                background-color:#ffffff;
              "
            >
              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  width:100%;
                  background-color:#f5fafc;
                  border:1px solid #d3e9ef;
                  border-radius:15px;
                "
              >
                <tr>
                  <td
                    align="center"
                    style="
                      padding:25px 24px 9px 24px;
                      font-family:Arial,Helvetica,sans-serif;
                      font-size:23px;
                      line-height:29px;
                      font-weight:700;
                      color:#0d4b5d;
                    "
                  >
                    What You Will Learn
                  </td>
                </tr>

                <tr>
                  <td
                    align="center"
                    style="
                      padding:0 24px 15px 24px;
                      font-family:Arial,Helvetica,sans-serif;
                      font-size:16px;
                      line-height:24px;
                      color:#365d68;
                    "
                  >
                    Through this programme, you will learn to:
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 25px 23px 25px;">
                    <table
                      role="presentation"
                      width="100%"
                      cellpadding="0"
                      cellspacing="0"
                      border="0"
                    >
                      <tr>
                        <td
                          width="29"
                          valign="top"
                          style="
                            padding:6px 0;
                            font-family:Arial,Helvetica,sans-serif;
                            font-size:18px;
                            line-height:24px;
                            font-weight:700;
                            color:#159fba;
                          "
                        >
                          &#10003;
                        </td>

                        <td
                          valign="top"
                          style="
                            padding:6px 0;
                            font-family:Arial,Helvetica,sans-serif;
                            font-size:15px;
                            line-height:23px;
                            color:#244f5c;
                          "
                        >
                          Conduct structured and impactful coaching
                          conversations
                        </td>
                      </tr>

                      <tr>
                        <td
                          width="29"
                          valign="top"
                          style="
                            padding:6px 0;
                            font-family:Arial,Helvetica,sans-serif;
                            font-size:18px;
                            line-height:24px;
                            font-weight:700;
                            color:#159fba;
                          "
                        >
                          &#10003;
                        </td>

                        <td
                          valign="top"
                          style="
                            padding:6px 0;
                            font-family:Arial,Helvetica,sans-serif;
                            font-size:15px;
                            line-height:23px;
                            color:#244f5c;
                          "
                        >
                          Apply solution-focused coaching techniques in real
                          situations
                        </td>
                      </tr>

                      <tr>
                        <td
                          width="29"
                          valign="top"
                          style="
                            padding:6px 0;
                            font-family:Arial,Helvetica,sans-serif;
                            font-size:18px;
                            line-height:24px;
                            font-weight:700;
                            color:#159fba;
                          "
                        >
                          &#10003;
                        </td>

                        <td
                          valign="top"
                          style="
                            padding:6px 0;
                            font-family:Arial,Helvetica,sans-serif;
                            font-size:15px;
                            line-height:23px;
                            color:#244f5c;
                          "
                        >
                          Build the core competencies required for
                          professional coaching
                        </td>
                      </tr>

                      <tr>
                        <td
                          width="29"
                          valign="top"
                          style="
                            padding:6px 0;
                            font-family:Arial,Helvetica,sans-serif;
                            font-size:18px;
                            line-height:24px;
                            font-weight:700;
                            color:#159fba;
                          "
                        >
                          &#10003;
                        </td>

                        <td
                          valign="top"
                          style="
                            padding:6px 0;
                            font-family:Arial,Helvetica,sans-serif;
                            font-size:15px;
                            line-height:23px;
                            color:#244f5c;
                          "
                        >
                          Help clients move from challenges to actionable
                          outcomes
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Registration CTA -->
          <tr>
            <td
              align="center"
              class="mobile-padding"
              style="
                padding:4px 40px 16px 40px;
                background-color:#ffffff;
              "
            >
              <a
                href="mailto:saurav@erickson.co.in?subject=TASC%20Essentials%20Program%20Registration%20Inquiry"
                style="
                  display:block;
                  padding:18px 24px;
                  background-color:#f3b72f;
                  background-image:linear-gradient(
                    90deg,
                    #f4bd29 0%,
                    #f2a03d 48%,
                    #ee844b 100%
                  );
                  border-radius:14px;
                  font-family:Arial,Helvetica,sans-serif;
                  font-size:19px;
                  line-height:23px;
                  font-weight:700;
                  text-align:center;
                  color:#073f55;
                "
              >
                Register for TASC
              </a>
            </td>
          </tr>

          <!-- Contact Section -->
          <tr>
            <td
              class="mobile-padding"
              style="
                padding:10px 40px 36px 40px;
                background-color:#ffffff;
              "
            >
              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  width:100%;
                  background-color:#e9f7fa;
                  border:1px solid #c5e7ef;
                  border-radius:14px;
                "
              >
                <tr>
                  <td
                    align="center"
                    style="
                      padding:21px 18px 8px 18px;
                      font-family:Arial,Helvetica,sans-serif;
                      font-size:19px;
                      line-height:25px;
                      font-weight:700;
                      color:#0d4b5d;
                    "
                  >
                    Want to connect?
                  </td>
                </tr>

                <tr>
                  <td
                    align="center"
                    style="
                      padding:0 18px 21px 18px;
                      font-family:Arial,Helvetica,sans-serif;
                      font-size:15px;
                      line-height:24px;
                      color:#365d68;
                    "
                  >
                    <span
                      class="contact-item"
                      style="
                        display:inline-block;
                        padding:0 10px;
                      "
                    >
                      Email:
                      <a
                        href="mailto:saurav@erickson.co.in"
                        style="
                          font-weight:700;
                          color:#087b9d;
                        "
                      >
                        saurav@erickson.co.in
                      </a>
                    </span>

                    <span
                      class="contact-item"
                      style="
                        display:inline-block;
                        padding:0 10px;
                      "
                    >
                      Call/WhatsApp:
                      <a
                        href="https://wa.me/918797679796?text=Hi%20Saurav%2C%20I%20would%20like%20to%20know%20more%20about%20the%20upcoming%20TASC%20Essentials%20Program."
                        target="_blank"
                        style="
                          font-weight:700;
                          color:#087b9d;
                        "
                      >
                        +91 87976 79796
                      </a>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td
              align="center"
              style="
                padding:20px 28px 25px 28px;
                background-color:#f5fafb;
                border-top:1px solid #dcecef;
                font-family:Arial,Helvetica,sans-serif;
                font-size:12px;
                line-height:19px;
                color:#71888f;
              "
            >
              Erickson Coaching International India<br>
              Empowering coaches. Transforming lives.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`.trim()
  },
  {
    id: 'pcc-roadmap',
    name: 'Roadmap to ICF PCC',
    subject: '🎯 Your Roadmap to ICF PCC',
    headerImage: 'https://www.erickson.co.in/wp-content/uploads/2026/09/sq-post.jpg.jpeg',
    headerLink: 'https://us02web.zoom.us/meeting/register/YijnmjVARqaL3bkOoW98WA',
    content: `
Hi <Name>,

🎯 Your Roadmap to ICF PCC

Are you a coach ready to take the next step in your professional journey?

Join us for a live interactive session and discover:

✨ Why is ICF PCC an important milestone for coaches?
✨ What does the journey to PCC actually look like?
✨ What should you know before beginning your PCC journey?
✨ How can PCC contribute to your professional growth?
✨ What are the next steps to get started?

📅 27 September
⏰ 10:30 AM – 12:00 PM
💻 Live Meeting Mode

Whether you’re just exploring PCC or ready to take the next step, this session will give you a clearer understanding of the PCC journey and what lies ahead.

Button Register Now : https://us02web.zoom.us/meeting/register/YijnmjVARqaL3bkOoW98WA
    `.trim()
  }
];

export default function ResourcesView({ 
  currentUser, 
  onNavigateToDeveloper 
}: { 
  currentUser: string; 
  onNavigateToDeveloper?: () => void;
}) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [customTemplates, setCustomTemplates] = useState<Record<string, Partial<Template>>>({});
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(TEMPLATES[0].id);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form states for editing
  const [editSubject, setEditSubject] = useState('');
  const [editHeaderImage, setEditHeaderImage] = useState('');
  const [editHeaderLink, setEditHeaderLink] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editName, setEditName] = useState('');

  const templates = useMemo(() => {
    return TEMPLATES.map(t => {
      if (customTemplates[t.id]) {
        return { ...t, ...customTemplates[t.id] };
      }
      return t;
    });
  }, [customTemplates]);

  const selectedTemplate = useMemo(() => {
    return templates.find(t => t.id === selectedTemplateId) || templates[0];
  }, [templates, selectedTemplateId]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false);
  const [batchSearchTerm, setBatchSearchTerm] = useState('');
  const batchDropdownRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<{ current: number; total: number; email: string } | null>(null);
  const [selectedSender, setSelectedSender] = useState<"gaurav" | "saurav">("gaurav");
  const [senderStatus, setSenderStatus] = useState<{
    isChecking: boolean;
    success?: boolean;
    message?: string;
  }>({ isChecking: false });
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [showPreview, setShowPreview] = useState(false);
  const [latestVideos, setLatestVideos] = useState<Video[]>([]);
  const [isFetchingVideos, setIsFetchingVideos] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  // Dispatch Console & Reporting State
  const [dispatchLogs, setDispatchLogs] = useState<DispatchLogEntry[]>([]);
  const [finalReport, setFinalReport] = useState<DispatchReport | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(true);
  const [logFilter, setLogFilter] = useState<'all' | 'success' | 'error' | 'skipped'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [reportFilter, setReportFilter] = useState<'all' | 'delivered' | 'failed' | 'skipped'>('all');
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  const addLog = (entry: Omit<DispatchLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: DispatchLogEntry = {
      ...entry,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
    };
    setDispatchLogs(prev => [...prev, newEntry]);
  };

  const handleClearLogs = () => {
    setDispatchLogs([]);
  };

  const handleCopyLogs = () => {
    const text = dispatchLogs
      .map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const handleExportReportCsv = () => {
    if (!finalReport) return;
    const headers = ['Recipient Name', 'Email', 'Batch', 'Status', 'Latency (ms)', 'Error Reason'];
    const rows = finalReport.recipients.map(r => [
      `"${(r.name || '').replace(/"/g, '""')}"`,
      `"${r.email}"`,
      `"${r.batch || ''}"`,
      `"${r.status.toUpperCase()}"`,
      `"${r.latencyMs || ''}"`,
      `"${(r.error || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `dispatch-report-${finalReport.templateName.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (autoScroll && consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [dispatchLogs, autoScroll]);

  const filteredLogs = useMemo(() => {
    if (logFilter === 'all') return dispatchLogs;
    if (logFilter === 'success') return dispatchLogs.filter(l => l.type === 'success');
    if (logFilter === 'error') return dispatchLogs.filter(l => l.type === 'error');
    if (logFilter === 'skipped') return dispatchLogs.filter(l => l.type === 'skipped');
    return dispatchLogs;
  }, [dispatchLogs, logFilter]);

  const logCounts = useMemo(() => {
    return {
      all: dispatchLogs.length,
      success: dispatchLogs.filter(l => l.type === 'success').length,
      error: dispatchLogs.filter(l => l.type === 'error').length,
      skipped: dispatchLogs.filter(l => l.type === 'skipped').length
    };
  }, [dispatchLogs]);

  const reportFilteredRecipients = useMemo(() => {
    if (!finalReport) return [];
    if (reportFilter === 'all') return finalReport.recipients;
    return finalReport.recipients.filter(r => r.status === reportFilter);
  }, [finalReport, reportFilter]);

  const checkSenderConnection = async (senderIdToTest = selectedSender) => {
    setSenderStatus({ isChecking: true });
    try {
      const res = await fetch("/api/email/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: senderIdToTest })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setSenderStatus({ isChecking: false, success: true, message: data.message });
      } else {
        setSenderStatus({
          isChecking: false,
          success: false,
          message: data.error || "Gmail SMTP credentials rejected (535 Bad Credentials)."
        });
      }
    } catch (err: any) {
      setSenderStatus({
        isChecking: false,
        success: false,
        message: err.message || "Failed to contact email service."
      });
    }
  };

  useEffect(() => {
    checkSenderConnection(selectedSender);
  }, [selectedSender]);

  useEffect(() => {
    const fetchCustomTemplates = async () => {
      try {
        const docRef = doc(db, 'settings', 'customTemplates');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCustomTemplates(docSnap.data() as Record<string, Partial<Template>>);
        }
      } catch (err) {
        console.error("Error fetching custom templates:", err);
      }
    };
    fetchCustomTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      setEditName(selectedTemplate.name);
      setEditSubject(selectedTemplate.subject);
      setEditHeaderImage(selectedTemplate.headerImage || '');
      setEditHeaderLink(selectedTemplate.headerLink || '');
      setEditContent(selectedTemplate.content);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (batchDropdownRef.current && !batchDropdownRef.current.contains(event.target as Node)) {
        setIsBatchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'calendarLinks');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data());
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (selectedTemplate.id === 'youtube-videos' && latestVideos.length === 0) {
      fetchLatestVideos();
    }
  }, [selectedTemplate.id]);

  const fetchLatestVideos = async () => {
    setIsFetchingVideos(true);
    try {
      const response = await fetch('/api/latest-videos');
      if (response.ok) {
        const data = await response.json();
        setLatestVideos(data);
      }
    } catch (err) {
      console.error("Error fetching videos:", err);
    } finally {
      setIsFetchingVideos(false);
    }
  };

  const isAdmin = currentUser === 'admin' || currentUser === 'marketing@xmonks.com';
  const isGlobalUser = isAdmin || currentUser === 'Sheena' || currentUser === 'Vikram';

  useEffect(() => {
    const q = query(collection(db, 'participants'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const parts: Participant[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (isGlobalUser || data.clientPartner === currentUser) {
          parts.push({ id: doc.id, ...data } as Participant);
        }
      });
      setParticipants(parts);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser, isGlobalUser]);

  const batches = useMemo(() => {
    const batchSet = new Set<string>();
    participants.forEach(p => {
      if (p.batchNumber) batchSet.add(p.batchNumber);
    });
    return Array.from(batchSet).sort((a, b) => parseInt(a) - parseInt(b));
  }, [participants]);

  const batchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    participants.forEach(p => {
      if (p.batchNumber) {
        counts[p.batchNumber] = (counts[p.batchNumber] || 0) + 1;
      }
    });
    return counts;
  }, [participants]);

  const filteredParticipants = participants.filter(p => {
    const matchesSearch = (p.firstName + ' ' + p.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBatch = selectedBatches.length > 0 
      ? Boolean(p.batchNumber && selectedBatches.includes(p.batchNumber)) 
      : true;
    return matchesSearch && matchesBatch;
  });

  const toggleParticipant = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredParticipants.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredParticipants.map(p => p.id));
    }
  };

  const handleToggleBatch = (batch: string) => {
    const isSelected = selectedBatches.includes(batch);
    const nextBatches = isSelected
      ? selectedBatches.filter(b => b !== batch)
      : [...selectedBatches, batch];
    
    setSelectedBatches(nextBatches);

    if (nextBatches.length > 0) {
      const batchIds = participants
        .filter(p => p.batchNumber && nextBatches.includes(p.batchNumber))
        .map(p => p.id);
      setSelectedIds(batchIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectAllBatches = () => {
    setSelectedBatches([...batches]);
    const allBatchIds = participants
      .filter(p => p.batchNumber && batches.includes(p.batchNumber))
      .map(p => p.id);
    setSelectedIds(allBatchIds);
  };

  const handleClearBatches = () => {
    setSelectedBatches([]);
    setSelectedIds([]);
  };

  const handleSaveTemplate = async () => {
    setIsSavingTemplate(true);
    try {
      const nextCustom = {
        ...customTemplates,
        [selectedTemplateId]: {
          name: editName,
          subject: editSubject,
          headerImage: editHeaderImage,
          headerLink: editHeaderLink,
          content: editContent,
          id: selectedTemplateId
        }
      };
      const docRef = doc(db, 'settings', 'customTemplates');
      await setDoc(docRef, nextCustom);
      setCustomTemplates(nextCustom);
      setShowEditModal(false);
      setStatus({ type: 'success', message: 'Template custom code saved successfully.' });
    } catch (err) {
      console.error("Error saving custom template:", err);
      setStatus({ type: 'error', message: 'Failed to save template custom code.' });
    } finally {
      setIsSavingTemplate(false);
      setTimeout(() => setStatus({ type: null, message: '' }), 5000);
    }
  };

  const handleResetTemplate = async () => {
    if (!window.confirm('Are you sure you want to restore the default HTML code for this template? Any custom edits will be permanently lost.')) {
      return;
    }
    setIsSavingTemplate(true);
    try {
      const nextCustom = { ...customTemplates };
      delete nextCustom[selectedTemplateId];
      const docRef = doc(db, 'settings', 'customTemplates');
      await setDoc(docRef, nextCustom);
      setCustomTemplates(nextCustom);
      setShowEditModal(false);
      setStatus({ type: 'success', message: 'Template restored to default code.' });
    } catch (err) {
      console.error("Error resetting custom template:", err);
      setStatus({ type: 'error', message: 'Failed to restore template to default.' });
    } finally {
      setIsSavingTemplate(false);
      setTimeout(() => setStatus({ type: null, message: '' }), 5000);
    }
  };

  const getTemplateHtml = (participantName: string, template: Template) => {
    if (template.id === 'tasc-upcoming') {
      return template.content
        .replace(/\{\{FIRST_NAME\}\}/g, participantName)
        .replace(/<Name>/g, participantName);
    }
    const contentHtml = template.content
      .replace('Hi <Name>,', `<p style="font-size: 16px; margin-bottom: 20px;">Hi ${participantName},</p>`)
      .split('\n\n')
      .map(para => {
        // Special headers
        if (para.includes('📝 Blogs') || para.includes('📘 Ebooks')) {
          return `<h3 style="color: #0056b3; margin-top: 28px; margin-bottom: 12px; font-size: 18px;">${para.trim()}</h3>`;
        }

        if (para.trim().startsWith('🎯')) {
          return `<h2 style="color: #0f172a; margin-top: 8px; margin-bottom: 16px; font-size: 20px; font-weight: 800;">${para.trim()}</h2>`;
        }
        
        // Videos Grid detection
        if (para.includes('[VIDEOS_GRID]')) {
            if (latestVideos.length === 0) return `<div style="text-align: center; padding: 20px; color: #94a3b8; font-style: italic;">Loading latest videos...</div>`;
            
            const videoCards = latestVideos.map(video => `
                <div style="width: 48%; display: inline-block; vertical-align: top; margin-bottom: 24px; margin-right: 2%;">
                    <a href="${video.url}" style="text-decoration: none; color: inherit; display: block;">
                        <img src="${video.thumbnail}" alt="${video.title}" style="width: 100%; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" referrerPolicy="no-referrer">
                        <div style="font-weight: 600; font-size: 13px; color: #1e293b; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 36px;">
                            ${video.title}
                        </div>
                    </a>
                </div>
            `).join('');
            
            return `
                <div style="margin: 24px 0;">
                    ${videoCards}
                    <div style="clear: both;"></div>
                </div>
            `;
        }
        
        // Bullet points
        if (para.trim().startsWith('•') || para.trim().startsWith('✨')) {
            const items = para.trim().split('\n').map(item => `
                <li style="margin-bottom: 8px; padding-left: 4px;">${item.trim()}</li>
            `).join('');
            return `<ul style="padding-left: 4px; list-style-type: none; color: #475569; margin-bottom: 20px;">${items}</ul>`;
        }

        // Schedule / Event Details Box
        if (para.includes('📅') || para.includes('⏰') || para.includes('💻')) {
            const lines = para.split('\n').map(line => `
                <div style="margin-bottom: 6px; font-weight: 600; color: #1e293b; font-size: 15px;">${line.trim()}</div>
            `).join('');
            return `
                <div style="margin: 24px 0; padding: 18px 24px; background: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 10px;">
                    ${lines}
                </div>
            `;
        }

        // Button detection
        if (para.trim().startsWith('Button') || para.trim().startsWith('👉') || /^(Register Now|Join Now):/i.test(para.trim())) {
            const match = para.match(/(?:Button|👉)?\s*(.+?)\s*:\s*(https?:\/\/\S+)/i);
            if (match) {
                const label = match[1].trim();
                let url = match[2].trim();
                
                if (settings?.gratitudeDiariesLink && label.includes('Gratitude Diaries')) {
                   url = settings.gratitudeDiariesLink;
                }
                
                return `
                    <div style="margin: 32px 0; text-align: center;">
                        <a href="${url}" style="background-color: #0056b3; color: #ffffff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 86, 179, 0.2);">
                            ${label}
                        </a>
                    </div>
                `;
            }
        }
        
        // Convert URLs to clickable links and handle regular lines
        const lines = para.split('\n').map(line => {
             // Basic URL detection for xmonks.com and other links
             if (line.includes('xmonks.com') || line.includes('erickson.co.in')) {
                 const urlMatch = line.match(/(https?:\/\/\S+|xmonks\.com\/\S+)/);
                 if (urlMatch) {
                    const matchedUrl = urlMatch[1];
                    const fullUrl = matchedUrl.startsWith('http') ? matchedUrl : `https://${matchedUrl}`;
                    return `<div style="margin-bottom: 8px;"><a href="${fullUrl}" style="color: #0056b3; text-decoration: none; font-weight: 500;">${line.trim()}</a></div>`;
                 }
             }
             return `<div style="margin-bottom: 4px;">${line.trim()}</div>`;
        }).join('');
        
        return `<div style="margin-bottom: 20px; font-size: 15px; color: #334155;">${lines}</div>`;
      })
      .join('');

    return `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background: #ffffff;">
        ${template.headerLink ? `<a href="${template.headerLink}" style="display: block;">` : ''}
          <img src="${template.headerImage}" alt="Header" style="width: 100%; height: auto; display: block;" referrerPolicy="no-referrer">
        ${template.headerLink ? '</a>' : ''}
        <div style="padding: 32px 40px;">
          ${contentHtml}
          <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #f1f5f9; text-align: center;">
            <p style="margin-bottom: 4px; font-weight: 700; color: #1e293b;">Erickson Coaching India</p>
            <p style="margin: 0; font-size: 13px; color: #94a3b8; letter-spacing: 0.02em;">Transforming lives through coaching excellence</p>
          </div>
        </div>
      </div>
    `;
  };

  const handleBulkSend = async () => {
    if (selectedIds.length === 0) return;
    setIsSending(true);
    setStatus({ type: null, message: '' });
    setSendProgress(null);
    setIsConsoleExpanded(true);

    const targets = participants.filter(p => selectedIds.includes(p.id));
    const senderName = selectedSender === 'saurav' ? 'Saurav Tiwari' : 'Gaurav Arora';
    const senderEmail = selectedSender === 'saurav' ? 'saurav@erickson.co.in' : 'marketing@xmonks.com';
    const startTimeMs = Date.now();
    const sessionId = Math.random().toString(36).substring(2, 8);

    addLog({
      type: 'info',
      message: `========================================================`
    });
    addLog({
      type: 'info',
      message: `🚀 [DISPATCH INITIATED] Template: "${selectedTemplate.name}" | Targets: ${targets.length} recipient(s) | Sender: ${senderName} <${senderEmail}>`
    });

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    let fatalAuthError = false;
    let lastError = '';
    const reportRecipients: DispatchRecipientResult[] = [];

    for (let i = 0; i < targets.length; i++) {
      const participant = targets[i];
      const participantFullName = `${participant.firstName || ''} ${participant.lastName || ''}`.trim() || 'Participant';

      if (!participant.email || !participant.email.includes('@')) {
        skippedCount++;
        const skipReason = `Missing or invalid email address (${participant.email || 'None'})`;
        addLog({
          type: 'skipped',
          participantName: participantFullName,
          email: participant.email || 'N/A',
          batch: participant.batchNumber,
          message: `⚠️ [${i + 1}/${targets.length}] SKIPPED: ${participantFullName} (Batch ${participant.batchNumber || 'N/A'}) - ${skipReason}`
        });
        reportRecipients.push({
          name: participantFullName,
          email: participant.email || 'N/A',
          batch: participant.batchNumber,
          status: 'skipped',
          error: skipReason
        });
        continue;
      }

      setSendProgress({
        current: i + 1,
        total: targets.length,
        email: participant.email
      });

      addLog({
        type: 'sending',
        participantName: participantFullName,
        email: participant.email,
        batch: participant.batchNumber,
        message: `⏳ [${i + 1}/${targets.length}] Dispatching to ${participantFullName} <${participant.email}>...`
      });

      const t0 = Date.now();
      try {
        const html = getTemplateHtml(participant.firstName, selectedTemplate);
        const response = await fetch('/api/send-generic-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: participant.email,
            subject: selectedTemplate.subject,
            html,
            senderId: selectedSender
          })
        });

        const latency = Date.now() - t0;
        const data = await response.json().catch(() => ({}));

        if (response.ok) {
          successCount++;
          addLog({
            type: 'success',
            participantName: participantFullName,
            email: participant.email,
            batch: participant.batchNumber,
            latencyMs: latency,
            message: `✅ [${i + 1}/${targets.length}] DELIVERED to ${participant.email} in ${latency}ms`
          });
          reportRecipients.push({
            name: participantFullName,
            email: participant.email,
            batch: participant.batchNumber,
            status: 'delivered',
            latencyMs: latency
          });
        } else {
          failCount++;
          lastError = data.error || 'Server error';
          addLog({
            type: 'error',
            participantName: participantFullName,
            email: participant.email,
            batch: participant.batchNumber,
            latencyMs: latency,
            errorReason: lastError,
            message: `❌ [${i + 1}/${targets.length}] FAILED for ${participant.email} (${latency}ms) — ${lastError}`
          });
          reportRecipients.push({
            name: participantFullName,
            email: participant.email,
            batch: participant.batchNumber,
            status: 'failed',
            error: lastError,
            latencyMs: latency
          });

          // If Gmail SMTP rejected credentials, halt immediately - do NOT fake progress for 20+ more participants
          if (
            data.code === 'EAUTH' || 
            response.status === 401 ||
            (data.error && (data.error.includes('535') || data.error.includes('Authentication Failed') || data.error.includes('not configured')))
          ) {
            fatalAuthError = true;
            addLog({
              type: 'error',
              message: `🛑 [HALTED] Gmail SMTP Authentication Failed (535 Bad Credentials). Google rejected the app password. Aborting remaining ${targets.length - (i + 1)} delivery attempts.`
            });

            // Mark remaining targets as failed due to auth cancellation
            for (let j = i + 1; j < targets.length; j++) {
              const rem = targets[j];
              const remName = `${rem.firstName || ''} ${rem.lastName || ''}`.trim() || 'Participant';
              failCount++;
              reportRecipients.push({
                name: remName,
                email: rem.email || 'N/A',
                batch: rem.batchNumber,
                status: 'failed',
                error: 'Cancelled: Gmail SMTP Authentication Failed (535 Bad Credentials)'
              });
            }
            break;
          }
        }
      } catch (err: any) {
        const latency = Date.now() - t0;
        failCount++;
        const errMsg = err.message || 'Network error';
        if (!lastError) lastError = errMsg;
        addLog({
          type: 'error',
          participantName: participantFullName,
          email: participant.email,
          batch: participant.batchNumber,
          latencyMs: latency,
          errorReason: errMsg,
          message: `❌ [${i + 1}/${targets.length}] NETWORK ERROR for ${participant.email}: ${errMsg}`
        });
        reportRecipients.push({
          name: participantFullName,
          email: participant.email,
          batch: participant.batchNumber,
          status: 'failed',
          error: errMsg,
          latencyMs: latency
        });
      }
      // Small pacing delay
      await new Promise(r => setTimeout(r, 150));
    }

    const endTimeMs = Date.now();
    const durationSeconds = parseFloat(((endTimeMs - startTimeMs) / 1000).toFixed(1));

    setIsSending(false);
    setSendProgress(null);

    const reportSummary = `📊 [DISPATCH SUMMARY] Total: ${targets.length} | Delivered: ${successCount} | Failed: ${failCount} | Skipped: ${skippedCount} | Duration: ${durationSeconds}s`;
    addLog({
      type: 'report',
      message: reportSummary
    });
    addLog({
      type: 'info',
      message: `========================================================`
    });

    const reportObj: DispatchReport = {
      id: sessionId,
      templateName: selectedTemplate.name,
      templateSubject: selectedTemplate.subject,
      senderName,
      senderEmail,
      startTime: new Date(startTimeMs).toLocaleTimeString(),
      endTime: new Date(endTimeMs).toLocaleTimeString(),
      durationSeconds,
      total: targets.length,
      delivered: successCount,
      failed: failCount,
      skipped: skippedCount,
      recipients: reportRecipients
    };

    setFinalReport(reportObj);
    setShowReportModal(true);

    if (fatalAuthError) {
      setSenderStatus({
        isChecking: false,
        success: false,
        message: lastError
      });
      setStatus({
        type: 'error',
        message: `Dispatch halted: ${lastError}`
      });
    } else if (failCount === 0 && skippedCount === 0) {
      setStatus({
        type: 'success',
        message: `Successfully delivered "${selectedTemplate.name}" to all ${successCount} participant(s)!`
      });
      setSelectedIds([]);
      setTimeout(() => setStatus({ type: null, message: '' }), 8000);
    } else {
      setStatus({
        type: 'error',
        message: `Dispatch finished: ${successCount} delivered, ${failCount} failed, ${skippedCount} skipped. See Console & Report below.`
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Resource Center</h2>
          <p className="text-slate-500">Pick a template and share exclusive resources with your participants.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Template Selector */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Templates
            </h3>
            <div className="space-y-2">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplateId(t.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedTemplate.id === t.id 
                      ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/10 text-blue-700' 
                      : 'bg-white border-slate-100 hover:border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <p className="font-bold text-sm">{t.name}</p>
                  <p className="text-xs opacity-70 truncate mt-1">{t.subject}</p>
                </button>
              ))}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                 onClick={() => setShowPreview(true)}
                 className="py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-all cursor-pointer"
              >
                <Eye className="w-4 h-4 text-slate-500" />
                Preview
              </button>
              <button
                 onClick={() => setShowEditModal(true)}
                 className="py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shadow-blue-100"
              >
                <Code className="w-4 h-4" />
                Edit Code
              </button>
            </div>
          </div>
          
          {status.type && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl flex items-center gap-3 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}
            >
              {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <p className="font-semibold text-sm">{status.message}</p>
            </motion.div>
          )}
        </div>

        {/* Participant Selector */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full max-h-[600px]">
            <div className="p-6 border-b border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Select Recipients
                </h3>
                <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {selectedIds.length} Selected
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search participants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                  />
                </div>

                {/* Multi-Batch Selector Dropdown */}
                <div className="relative w-full sm:w-64 shrink-0" ref={batchDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsBatchDropdownOpen(prev => !prev)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/80 border rounded-xl transition-all text-sm font-semibold cursor-pointer ${
                      selectedBatches.length > 0
                        ? 'border-blue-400 bg-blue-50/60 text-blue-900 shadow-2xs'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Layers className={`w-4 h-4 shrink-0 ${selectedBatches.length > 0 ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span className="truncate">
                        {selectedBatches.length === 0
                          ? 'Select Batches'
                          : selectedBatches.length === 1
                          ? `Batch ${selectedBatches[0]}`
                          : selectedBatches.length === batches.length
                          ? `All Batches (${batches.length})`
                          : `${selectedBatches.length} Batches Selected`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {selectedBatches.length > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded-full">
                          {selectedBatches.length}
                        </span>
                      )}
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isBatchDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {/* Dropdown Popover */}
                  {isBatchDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-96">
                      {/* Header */}
                      <div className="p-3 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Filter className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-xs font-bold text-slate-800">Filter Multiple Batches</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleSelectAllBatches}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            Select All
                          </button>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            onClick={handleClearBatches}
                            className="text-[11px] font-bold text-slate-500 hover:text-rose-600 hover:underline cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      {/* Search batches if many */}
                      {batches.length > 5 && (
                        <div className="p-2 border-b border-slate-100 bg-white">
                          <input
                            type="text"
                            placeholder="Search batch numbers..."
                            value={batchSearchTerm}
                            onChange={(e) => setBatchSearchTerm(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      )}

                      {/* Batches List */}
                      <div className="overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar max-h-60">
                        {batches
                          .filter(b => !batchSearchTerm || b.toLowerCase().includes(batchSearchTerm.toLowerCase()))
                          .map(batch => {
                            const isChecked = selectedBatches.includes(batch);
                            const count = batchCounts[batch] || 0;
                            return (
                              <button
                                key={batch}
                                type="button"
                                onClick={() => handleToggleBatch(batch)}
                                className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                                  isChecked ? 'bg-blue-50/80 text-blue-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                      isChecked
                                        ? 'bg-blue-600 border-blue-600 text-white'
                                        : 'border-slate-300 bg-white'
                                    }`}
                                  >
                                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <span className="text-xs font-semibold">Batch {batch}</span>
                                </div>
                                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                  isChecked ? 'bg-blue-200/70 text-blue-800 font-bold' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {count} {count === 1 ? 'participant' : 'participants'}
                                </span>
                              </button>
                            );
                          })}
                        {batches.length === 0 && (
                          <div className="p-4 text-center text-xs text-slate-400">
                            No batches available
                          </div>
                        )}
                      </div>

                      {/* Footer Summary */}
                      <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500 text-[11px]">
                          {selectedBatches.length === 0
                            ? 'All batches shown'
                            : `${selectedBatches.length} of ${batches.length} batches selected`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsBatchDropdownOpen(false)}
                          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs cursor-pointer shadow-2xs"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Selected Batches Chips */}
              {selectedBatches.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    Active Batches:
                  </span>
                  {selectedBatches.map(b => (
                    <span
                      key={b}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold shadow-2xs"
                    >
                      <span>Batch {b}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleBatch(b)}
                        className="p-0.5 hover:bg-blue-200/60 rounded-full text-blue-600 hover:text-blue-900 cursor-pointer"
                        title={`Remove Batch ${b}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={handleClearBatches}
                    className="text-xs text-slate-400 hover:text-rose-600 font-semibold underline ml-1 cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
               <div className="space-y-1">
                  <button 
                  onClick={toggleAll}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedIds.length === filteredParticipants.length ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                    {selectedIds.length === filteredParticipants.length && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm font-bold text-slate-700">Select All ({filteredParticipants.length})</span>
                </button>
                {filteredParticipants.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => toggleParticipant(p.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left group"
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedIds.includes(p.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 group-hover:border-blue-400'}`}>
                      {selectedIds.includes(p.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-700 truncate">{p.firstName} {p.lastName}</p>
                        {p.batchNumber && (
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                            Batch {p.batchNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{p.email}</p>
                    </div>
                  </button>
                ))}
               </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-4">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Email Sender Profile
                  </span>
                  
                  <div className="flex items-center gap-2">
                    {senderStatus.isChecking ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                        Checking SMTP...
                      </span>
                    ) : senderStatus.success === true ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        SMTP Verified
                      </span>
                    ) : senderStatus.success === false ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                        <AlertCircle className="w-3 h-3 text-rose-600" />
                        SMTP Auth Failed
                      </span>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => checkSenderConnection(selectedSender)}
                      disabled={senderStatus.isChecking}
                      title="Test SMTP credentials for selected sender"
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${senderStatus.isChecking ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
                      Test
                    </button>
                  </div>
                </div>

                <select
                  value={selectedSender}
                  onChange={(e) => setSelectedSender(e.target.value as "gaurav" | "saurav")}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none"
                >
                  <option value="gaurav">Gaurav Arora (marketing@xmonks.com)</option>
                  <option value="saurav">Saurav Tiwari (saurav@erickson.co.in)</option>
                </select>
              </div>

              {/* Warning if SMTP credentials are failing */}
              {senderStatus.success === false && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1.5 flex-1">
                      <p className="text-xs font-bold text-amber-900">
                        Gmail SMTP Authentication Failed ({selectedSender === 'saurav' ? 'Saurav Tiwari' : 'Gaurav Arora'})
                      </p>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Google rejected the app password (<strong>535 Bad Credentials</strong>). Emails will not reach inboxes until a fresh 16-character Google App Password is saved in Developer Settings.
                      </p>
                      {onNavigateToDeveloper && (
                        <button
                          type="button"
                          onClick={onNavigateToDeveloper}
                          className="mt-1 text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1.5 rounded-lg border border-blue-200 shadow-2xs hover:bg-blue-50 transition-all"
                        >
                          Configure App Password in Developer Settings
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Live progress indicator during send */}
              {isSending && sendProgress && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      Sending email {sendProgress.current} of {sendProgress.total}...
                    </span>
                    <span className="text-blue-600 font-mono">
                      {Math.round((sendProgress.current / sendProgress.total) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-blue-200/60 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-200"
                      style={{ width: `${(sendProgress.current / sendProgress.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-blue-700 truncate">Dispatching to: {sendProgress.email}</p>
                </div>
              )}

              {/* Prominent result alert directly above the button */}
              {status.type && (
                <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
                  status.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {status.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 space-y-1">
                    <p className="font-bold text-sm leading-snug">
                      {status.type === 'success' ? 'Email Dispatch Completed' : 'Email Delivery Failed'}
                    </p>
                    <p className="leading-relaxed opacity-95">{status.message}</p>
                    {status.type === 'error' && (
                      <div className="pt-2">
                        <p className="text-[11px] font-semibold text-rose-900">
                          To fix this, go to <strong>Developer Settings &gt; Email Senders &amp; SMTP</strong> to test and update the 16-character Google App Password for {selectedSender === 'saurav' ? 'Saurav Tiwari' : 'Gaurav Arora'}.
                        </p>
                        {onNavigateToDeveloper && (
                          <button
                            type="button"
                            onClick={onNavigateToDeveloper}
                            className="mt-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                          >
                            Go to Email Senders Settings
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setStatus({ type: null, message: '' })}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <button
                onClick={handleBulkSend}
                disabled={isSending || selectedIds.length === 0}
                className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200 disabled:bg-slate-300 disabled:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending to Selected Participants...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send "{selectedTemplate.name}" to {selectedIds.length} Participants
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Email Dispatch Console & Real-Time Activity Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden text-slate-100 transition-all">
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 bg-slate-900/90 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-tight">
                  Email Dispatch Console
                </h3>
                {isSending ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    DISPATCHING ({sendProgress?.current || 0}/{sendProgress?.total || selectedIds.length})
                  </span>
                ) : finalReport ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    REPORT READY ({finalReport.delivered}/{finalReport.total} DELIVERED)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                    IDLE / STANDBY
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Live stream of Google SMTP handshakes, participant statuses, network latencies, and completion reports.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center flex-wrap gap-2">
            {finalReport && (
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-blue-900/50"
              >
                <FileText className="w-3.5 h-3.5" />
                View Full Report
              </button>
            )}

            {finalReport && (
              <button
                type="button"
                onClick={handleExportReportCsv}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Download CSV delivery report"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                Export CSV
              </button>
            )}

            {dispatchLogs.length > 0 && (
              <button
                type="button"
                onClick={handleCopyLogs}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Copy all console output"
              >
                {copiedLogs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                {copiedLogs ? 'Copied' : 'Copy'}
              </button>
            )}

            {dispatchLogs.length > 0 && (
              <button
                type="button"
                onClick={handleClearLogs}
                disabled={isSending}
                className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950/40 hover:text-rose-300 text-slate-400 border border-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                title="Clear console output"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsConsoleExpanded(!isConsoleExpanded)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-700"
              title={isConsoleExpanded ? "Collapse Console" : "Expand Console"}
            >
              {isConsoleExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Console Body */}
        {isConsoleExpanded && (
          <div className="p-5 space-y-4 bg-slate-900/60">
            {/* KPI Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Target Queue</p>
                <p className="text-lg font-black text-white mt-0.5">
                  {isSending ? (sendProgress?.total || selectedIds.length) : (finalReport?.total || selectedIds.length || 0)}
                </p>
              </div>

              <div className="bg-slate-950/70 border border-emerald-900/40 p-3 rounded-2xl">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Delivered</p>
                <p className="text-lg font-black text-emerald-400 mt-0.5">
                  {finalReport ? finalReport.delivered : logCounts.success}
                </p>
              </div>

              <div className="bg-slate-950/70 border border-rose-900/40 p-3 rounded-2xl">
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Failed / Rejected</p>
                <p className="text-lg font-black text-rose-400 mt-0.5">
                  {finalReport ? finalReport.failed : logCounts.error}
                </p>
              </div>

              <div className="bg-slate-950/70 border border-amber-900/40 p-3 rounded-2xl">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Skipped (No Email)</p>
                <p className="text-lg font-black text-amber-400 mt-0.5">
                  {finalReport ? finalReport.skipped : logCounts.skipped}
                </p>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl col-span-2 sm:col-span-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Duration</p>
                <p className="text-lg font-black text-blue-400 mt-0.5">
                  {finalReport ? `${finalReport.durationSeconds}s` : isSending ? 'Streaming...' : '—'}
                </p>
              </div>
            </div>

            {/* Filter Tabs & Auto Scroll Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setLogFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    logFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Logs ({logCounts.all})
                </button>
                <button
                  type="button"
                  onClick={() => setLogFilter('success')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    logFilter === 'success' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50' : 'text-slate-400 hover:text-emerald-300'
                  }`}
                >
                  Delivered ({logCounts.success})
                </button>
                <button
                  type="button"
                  onClick={() => setLogFilter('error')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    logFilter === 'error' ? 'bg-rose-950 text-rose-300 border border-rose-800/50' : 'text-slate-400 hover:text-rose-300'
                  }`}
                >
                  Failed ({logCounts.error})
                </button>
                <button
                  type="button"
                  onClick={() => setLogFilter('skipped')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    logFilter === 'skipped' ? 'bg-amber-950 text-amber-300 border border-amber-800/50' : 'text-slate-400 hover:text-amber-300'
                  }`}
                >
                  Skipped ({logCounts.skipped})
                </button>
              </div>

              <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span className="text-[11px] font-medium">Auto-scroll to bottom</span>
              </label>
            </div>

            {/* Terminal Window */}
            <div className="bg-slate-950 border border-slate-800/90 rounded-2xl p-4 font-mono text-xs overflow-y-auto max-h-80 custom-scrollbar shadow-inner">
              {filteredLogs.length === 0 ? (
                <div className="py-10 text-center text-slate-500 space-y-2">
                  <Terminal className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                  <p className="font-sans font-medium text-slate-400 text-sm">Console Standby</p>
                  <p className="font-sans text-xs text-slate-500 max-w-md mx-auto">
                    Select a template and recipients (e.g. Batch 66) above, then click Send to monitor live SMTP delivery handshakes, response latencies, and completion reports here.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredLogs.map(log => {
                    const badgeClass = 
                      log.type === 'success' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60' :
                      log.type === 'error' ? 'bg-rose-950/90 text-rose-300 border-rose-800 font-bold' :
                      log.type === 'skipped' ? 'bg-amber-950/80 text-amber-300 border-amber-800/60' :
                      log.type === 'sending' ? 'bg-blue-950/80 text-blue-300 border-blue-800/60 animate-pulse' :
                      log.type === 'report' ? 'bg-indigo-950 text-indigo-300 border-indigo-700 font-bold' :
                      'bg-slate-900 text-slate-400 border-slate-800';

                    const badgeLabel = 
                      log.type === 'success' ? 'DELIVERED' :
                      log.type === 'error' ? 'ERROR' :
                      log.type === 'skipped' ? 'SKIPPED' :
                      log.type === 'sending' ? 'DISPATCH' :
                      log.type === 'report' ? 'REPORT' :
                      'SYSTEM';

                    return (
                      <div key={log.id} className="flex items-start gap-2.5 py-1 px-1.5 rounded hover:bg-slate-900/60 transition-colors leading-relaxed">
                        <span className="text-slate-500 shrink-0 select-none">[{log.timestamp}]</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase shrink-0 font-bold tracking-wider ${badgeClass}`}>
                          {badgeLabel}
                        </span>
                        <span className={`flex-1 break-words ${
                          log.type === 'success' ? 'text-emerald-300' :
                          log.type === 'error' ? 'text-rose-300 font-semibold' :
                          log.type === 'skipped' ? 'text-amber-300' :
                          log.type === 'report' ? 'text-indigo-200 font-semibold' :
                          'text-slate-300'
                        }`}>
                          {log.message}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={consoleBottomRef} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {/* Final Completion Report Modal */}
        {showReportModal && finalReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReportModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">Email Dispatch Completion Report</h3>
                    <p className="text-xs text-slate-400">
                      Template: <strong>{finalReport.templateName}</strong> &bull; Sender: {finalReport.senderName} ({finalReport.senderEmail})
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowReportModal(false)}
                  className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* KPI Strip */}
              <div className="p-6 bg-slate-50 border-b border-slate-200 shrink-0">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Delivery Rate</p>
                    <p className={`text-2xl font-black mt-1 ${
                      finalReport.delivered === finalReport.total && finalReport.total > 0
                        ? 'text-emerald-600'
                        : finalReport.delivered > 0
                        ? 'text-blue-600'
                        : 'text-rose-600'
                    }`}>
                      {finalReport.total > 0 ? `${Math.round((finalReport.delivered / finalReport.total) * 100)}%` : '0%'}
                    </p>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Targets</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{finalReport.total}</p>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/30">
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Delivered</p>
                    <p className="text-2xl font-black text-emerald-600 mt-1">{finalReport.delivered}</p>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-rose-200 bg-rose-50/30">
                    <p className="text-xs font-bold text-rose-700 uppercase tracking-wider">Failed / Rejected</p>
                    <p className="text-2xl font-black text-rose-600 mt-1">{finalReport.failed}</p>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 col-span-2 sm:col-span-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Duration</p>
                    <p className="text-2xl font-black text-slate-800 mt-1">{finalReport.durationSeconds}s</p>
                  </div>
                </div>
              </div>

              {/* Recipients Table */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-bold text-sm text-slate-900">
                    Recipient Breakdown ({reportFilteredRecipients.length} of {finalReport.recipients.length})
                  </h4>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setReportFilter('all')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        reportFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({finalReport.recipients.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportFilter('delivered')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        reportFilter === 'delivered' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-emerald-700'
                      }`}
                    >
                      Delivered ({finalReport.delivered})
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportFilter('failed')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        reportFilter === 'failed' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600 hover:text-rose-700'
                      }`}
                    >
                      Failed ({finalReport.failed})
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-3">#</th>
                        <th className="p-3">Participant</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Batch</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Latency</th>
                        <th className="p-3">Details / Diagnostic Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {reportFilteredRecipients.map((rec, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-900">{rec.name}</td>
                          <td className="p-3 font-mono text-[11px] text-slate-600">{rec.email}</td>
                          <td className="p-3">
                            {rec.batch ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                Batch {rec.batch}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="p-3">
                            {rec.status === 'delivered' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Delivered
                              </span>
                            ) : rec.status === 'failed' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                <AlertCircle className="w-3 h-3 text-rose-600" /> Failed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                Skipped
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-slate-500">
                            {rec.latencyMs ? `${rec.latencyMs}ms` : '—'}
                          </td>
                          <td className="p-3 text-[11px] text-slate-600 max-w-xs truncate" title={rec.error}>
                            {rec.error ? (
                              <span className="text-rose-700 font-semibold">{rec.error}</span>
                            ) : (
                              <span className="text-emerald-700">Dispatched via Google SMTP</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={handleExportReportCsv}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  Download Full CSV Report
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Close Report
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowPreview(false)}
               className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
             />
             <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
             >
                <div className="px-6 py-4 bg-slate-900 flex items-center justify-between">
                  <h3 className="text-white font-bold">Email Preview</h3>
                  <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar">
                   <div dangerouslySetInnerHTML={{ __html: getTemplateHtml('Participant', selectedTemplate) }} />
                </div>
             </motion.div>
          </div>
        )}

        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowEditModal(false)}
               className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
             />
             <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
             >
                {/* Header */}
                <div className="px-6 py-4 bg-slate-900 flex items-center justify-between text-white shrink-0">
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Code className="w-5 h-5 text-blue-400" />
                      Edit HTML & Code for Template
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Customize layout, subjects, and text with real-time preview.</p>
                  </div>
                  <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Split Content */}
                <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2">
                  
                  {/* Editor Panel */}
                  <div className="p-6 border-r border-slate-100 overflow-y-auto space-y-4 flex flex-col h-full max-h-[calc(90vh-140px)]">
                    <div className="grid grid-cols-2 gap-4 shrink-0">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Template Name</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Subject Line</label>
                        <input
                          type="text"
                          value={editSubject}
                          onChange={(e) => setEditSubject(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 shrink-0">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Header Image URL</label>
                        <input
                          type="text"
                          value={editHeaderImage}
                          onChange={(e) => setEditHeaderImage(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-mono text-slate-700"
                          placeholder="https://example.com/image.png"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Header Link URL (Optional)</label>
                        <input
                          type="text"
                          value={editHeaderLink}
                          onChange={(e) => setEditHeaderLink(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-mono text-slate-700"
                          placeholder="https://example.com"
                        />
                      </div>
                    </div>

                    {/* Code Textarea container */}
                    <div className="flex-1 flex flex-col min-h-[300px]">
                      <div className="flex items-center justify-between mb-1.5 shrink-0">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Template Content / HTML Code</label>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Supports <code>&lt;Name&gt;</code> placeholder
                        </span>
                      </div>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full flex-1 p-4 bg-slate-900 text-slate-100 rounded-2xl font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/30 overflow-y-auto resize-none custom-scrollbar shadow-inner"
                        placeholder="Write plain text or raw HTML here..."
                      />
                    </div>
                  </div>

                  {/* Real-time Preview Panel */}
                  <div className="p-6 bg-slate-50 overflow-y-auto flex flex-col h-full max-h-[calc(90vh-140px)]">
                    <div className="flex items-center gap-2 mb-3 text-slate-500 shrink-0">
                      <Eye className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-bold uppercase tracking-wider">Real-time Live Preview</span>
                    </div>
                    <div className="flex-1 bg-white border border-slate-200/80 rounded-2xl p-4 overflow-y-auto custom-scrollbar shadow-inner flex justify-center items-start min-h-[300px]">
                      <div className="w-full scale-90 origin-top transform">
                        <div dangerouslySetInnerHTML={{ __html: getTemplateHtml('Participant Name', {
                          id: selectedTemplate.id,
                          name: editName,
                          subject: editSubject,
                          headerImage: editHeaderImage,
                          headerLink: editHeaderLink,
                          content: editContent
                        }) }} />
                      </div>
                    </div>
                  </div>

                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
                  <button
                    type="button"
                    onClick={handleResetTemplate}
                    disabled={isSavingTemplate}
                    className="px-4 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset to Default
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      disabled={isSavingTemplate}
                      className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveTemplate}
                      disabled={isSavingTemplate}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-100 disabled:bg-slate-300 disabled:shadow-none"
                    >
                      {isSavingTemplate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Save Template Code
                    </button>
                  </div>
                </div>

             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
