export interface ParsedTimings {
  startTime: string;
  endTime: string;
  durationText: string;
}

export function parseCourseTimings(str?: string): ParsedTimings {
  if (!str) {
    return {
      startTime: "6:00 PM",
      endTime: "9:30 PM",
      durationText: "3.50 hours"
    };
  }

  const clean = str.replace(/\s+/g, " ").trim();
  const parts = clean.split(/\s*[-–—]\s*|\s+to\s+/i);

  if (parts.length >= 2) {
    let p1 = parts[0].trim();
    let p2 = parts[1].trim();

    // Check timezone if present at end (e.g. IST, EST, UTC)
    let p2NoTz = p2.replace(/\b(IST|EST|EDT|CST|CDT|PST|PDT|UTC|GMT)\b/gi, "").trim();

    // Check am/pm on p2
    const p2PeriodMatch = p2NoTz.match(/(AM|PM)/i);
    let p2Period = p2PeriodMatch ? p2PeriodMatch[1].toUpperCase() : "";

    // Check am/pm on p1
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
          if (p2Period === "PM" && hm1.h >= 1 && hm1.h <= 7) {
            p1Period = "PM";
          } else if (p2Period === "PM" && hm1.h >= 8 && hm1.h <= 11) {
            p1Period = "AM";
          } else {
            p1Period = p2Period;
          }
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

  return {
    startTime: clean,
    endTime: "",
    durationText: "3.50 hours"
  };
}

export function getCourseTimingParagraph(timings?: string, customNote?: string): string {
  if (customNote && customNote.trim()) {
    return customNote.trim();
  }

  const { startTime, endTime, durationText } = parseCourseTimings(timings);

  if (startTime && endTime) {
    return `Please note that Part I & II Online consists of 16 live online Zoom sessions each lasting ${durationText} with an expectation of approximately 45 minutes of outside class time work per online session. We will start at ${startTime} every day and conclude by ${endTime}.`;
  }

  if (timings && timings.trim()) {
    return `Please note that Part I & II Online consists of 16 live online Zoom sessions with an expectation of approximately 45 minutes of outside class time work per online session. We will start at ${timings} every day.`;
  }

  return `Please note that Part I & II Online consists of 16 live online Zoom sessions each lasting 3.50 hours with an expectation of approximately 45 minutes of outside class time work per online session. We will start at 6:00 PM every day and conclude by 9:30 PM.`;
}
