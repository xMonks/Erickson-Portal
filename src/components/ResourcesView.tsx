import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Users, Mail, Loader2, CheckCircle2, AlertCircle, Eye, Send, BookOpen, ExternalLink, MessageCircle } from 'lucide-react';

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
  }
];

export default function ResourcesView({ currentUser }: { currentUser: string }) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(TEMPLATES[0]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [showPreview, setShowPreview] = useState(false);
  const [latestVideos, setLatestVideos] = useState<Video[]>([]);
  const [isFetchingVideos, setIsFetchingVideos] = useState(false);

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

  useEffect(() => {
    const q = query(collection(db, 'participants'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const parts: Participant[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (isAdmin || data.clientPartner === currentUser) {
          parts.push({ id: doc.id, ...data } as Participant);
        }
      });
      setParticipants(parts);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser, isAdmin]);

  const filteredParticipants = participants.filter(p => {
    const matchesSearch = (p.firstName + ' ' + p.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBatch = selectedBatch ? p.batchNumber === selectedBatch : true;
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

  const batches = useMemo(() => {
    const batchSet = new Set<string>();
    participants.forEach(p => {
      if (p.batchNumber) batchSet.add(p.batchNumber);
    });
    return Array.from(batchSet).sort((a, b) => parseInt(a) - parseInt(b));
  }, [participants]);

  const handleBatchSelect = (batch: string) => {
    setSelectedBatch(batch);
    if (batch) {
      const batchIds = participants
        .filter(p => p.batchNumber === batch)
        .map(p => p.id);
      setSelectedIds(batchIds);
    } else {
      setSelectedIds([]);
    }
  };

  const getTemplateHtml = (participantName: string, template: Template) => {
    const contentHtml = template.content
      .replace('Hi <Name>,', `<p style="font-size: 16px; margin-bottom: 20px;">Hi ${participantName},</p>`)
      .split('\n\n')
      .map(para => {
        // Special headers
        if (para.includes('📝 Blogs') || para.includes('📘 Ebooks')) {
          return `<h3 style="color: #0056b3; margin-top: 28px; margin-bottom: 12px; font-size: 18px;">${para.trim()}</h3>`;
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
        if (para.trim().startsWith('•')) {
            const items = para.trim().split('\n').map(item => `
                <li style="margin-bottom: 8px; padding-left: 4px;">${item.replace('•', '').trim()}</li>
            `).join('');
            return `<ul style="padding-left: 20px; color: #475569; margin-bottom: 20px;">${items}</ul>`;
        }

        // Button detection
        if (para.trim().startsWith('Button')) {
            const match = para.match(/Button\s+(.+)\s+:\s+(https?:\/\/\S+)/i);
            if (match) {
                const label = match[1].trim();
                const url = match[2].trim();
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

    const targets = participants.filter(p => selectedIds.includes(p.id));
    let successCount = 0;
    let failCount = 0;

    for (const participant of targets) {
      try {
        const html = getTemplateHtml(participant.firstName, selectedTemplate);
        const response = await fetch('/api/send-generic-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: participant.email,
            subject: selectedTemplate.subject,
            html
          })
        });

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
      // Small delay
      await new Promise(r => setTimeout(r, 200));
    }

    setIsSending(false);
    setStatus({
      type: failCount === 0 ? 'success' : 'error',
      message: `Sent to ${successCount} participants${failCount > 0 ? `, failed for ${failCount}` : ''}.`
    });
    if (failCount === 0) setSelectedIds([]);
    setTimeout(() => setStatus({ type: null, message: '' }), 5000);
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
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
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
            
            <button
               onClick={() => setShowPreview(true)}
               className="w-full py-3 rounded-xl border border-blue-200 text-blue-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-50 transition-all"
            >
              <Eye className="w-4 h-4" />
              Preview Template
            </button>
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
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <select
                    value={selectedBatch}
                    onChange={(e) => handleBatchSelect(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-semibold text-slate-700"
                  >
                    <option value="">Select Batch</option>
                    {batches.map(batch => (
                      <option key={batch} value={batch}>Batch {batch}</option>
                    ))}
                  </select>
                </div>
              </div>
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
                    <div>
                      <p className="text-sm font-bold text-slate-700">{p.firstName} {p.lastName}</p>
                      <p className="text-xs text-slate-400">{p.email}</p>
                    </div>
                  </button>
                ))}
               </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={handleBulkSend}
                disabled={isSending || selectedIds.length === 0}
                className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200 disabled:bg-slate-300 disabled:shadow-none transition-all flex items-center justify-center gap-2"
              >
                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Send Resources to {selectedIds.length} Participants
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
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
      </AnimatePresence>
    </div>
  );
}

function X({ className, onClick }: { className?: string, onClick?: () => void }) {
  return (
    <svg onClick={onClick} className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
  );
}
