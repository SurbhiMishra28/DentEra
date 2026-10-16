// data/landingData.js — single source of truth for landing content.
// Landing.jsx (home sections) and LandingSection.jsx (dedicated pages) both
// import from here so the two never drift apart.
import {
  Tooth, Smile, ShieldCheck, Sparkles, Medal, Heart, Wallet, Clock, Droplet, Users,
} from '../components/Icons.jsx'

export const SERVICES = [
  { icon: Tooth, title: 'Check-ups & Cleaning', desc: 'Routine exams, scaling and polishing that catch small issues before they become painful ones.' },
  { icon: Smile, title: 'Braces & Aligners', desc: 'Metal, ceramic and clear aligner options to straighten smiles at every age — with clear plans.' },
  { icon: ShieldCheck, title: 'Dental Implants', desc: 'Permanent, natural-looking replacements for missing teeth, planned and placed end to end.' },
  { icon: Sparkles, title: 'Root Canal & Surgery', desc: 'Gentle root canals, wisdom-tooth extractions and gum care handled by specialists.' }
]

export const DOCTORS = [
  { img: '/doctor-1.jpg', name: 'Dr. Meera Sharma', role: 'Chief Dentist · Root Canal Specialist', exp: '12+ years experience' },
  { img: '/doctor-2.jpg', name: 'Dr. Arjun Patel', role: 'Orthodontist · Braces & Aligners', exp: '10+ years experience' },
  { img: '/doctor-3.jpg', name: 'Dr. Nisha Rao', role: 'Pediatric Dentist · Kids\' Specialist', exp: '8+ years experience' },
  { img: '/doctor-4.jpg', name: 'Dr. Vikram Singh', role: 'Implantologist · Oral Surgery', exp: '14+ years experience' },
  { img: '/doctor-5.jpg', name: 'Dr. Kavita Menon', role: 'Endodontist · Root Canals', exp: '9+ years experience' },
  { img: '/doctor-6.jpg', name: 'Dr. Rahul Deshmukh', role: 'Prosthodontist · Crowns & Bridges', exp: '11+ years experience' },
  { img: '/doctor-7.jpg', name: 'Dr. Sneha Kulkarni', role: 'Periodontist · Gum Care', exp: '7+ years experience' },
  { img: '/doctor-8.jpg', name: 'Dr. Aditya Joshi', role: 'Oral & Maxillofacial Surgeon', exp: '13+ years experience' }
]

export const WHY_CHOOSE = [
  { icon: Medal, title: 'Certified specialists', desc: 'Every dentist at DentEra is a licensed specialist — from root canals to kids\' dentistry — so you\'re always in expert hands.' },
  { icon: Heart, title: 'Painless, gentle care', desc: 'Numbing before every procedure, slow hands, and honest explanations. Most patients say the visit was easier than expected.' },
  { icon: Wallet, title: 'Transparent pricing', desc: 'Written estimates before treatment starts — no hidden charges, no surprises at the counter, ever.' },
  { icon: Clock, title: 'On-time, every time', desc: 'Your slot is protected. Our smart scheduling system keeps the day running so waiting rooms never become your second home.' },
  { icon: Droplet, title: 'Hospital-grade hygiene', desc: 'Autoclaved instruments, single-use kits, and strict cross-infection protocols in every room, every day.' },
  { icon: Users, title: 'Family-friendly clinic', desc: 'Easy parking, a kids\' corner, and doctors who explain things to children before touching anything.' }
]

/* gallery = clinic photos only (rooms, reception, equipment) */
export const GALLERY_IMAGES = [
  { src: '/clinic-7.jpg', alt: 'Bright, modern dental treatment room at DentEra', caption: 'Modern treatment room' },
  { src: '/clinic-2.jpg', alt: 'Dental operatory with chair and equipment', caption: 'Fully equipped operatory' },
  { src: '/clinic-3.jpg', alt: 'DentEra reception and waiting area', caption: 'A calm, welcoming reception' },
  { src: '/clinic-4.jpg', alt: 'Dental clinic interior with natural light', caption: 'Designed for comfortable visits' },
  { src: '/clinic-5.jpg', alt: 'Clean, organised dental care unit', caption: 'Sterile and spotless, always' },
  { src: '/clinic-6.jpg', alt: 'Bright clinic corridor and consultation area', caption: 'Easy to find, easy to reach' }
]

export const TRUST_BADGES = [
  { icon: Users, text: 'Family friendly' },
  { icon: Heart, text: 'Painless treatments' },
  { icon: Clock, text: 'On-time appointments' },
  { icon: Medal, text: 'Certified specialists' }
]

export const TESTIMONIALS = [
  {
    quote: 'My wisdom tooth came out in fifteen minutes and I genuinely felt nothing. The team explained every step before touching anything.',
    author: 'Ravi Kumar',
    role: 'Patient · Root canal & extraction',
    date: '11 June 2026',
    photo: '/patient-1.jpg'
  },
  {
    quote: 'My daughter used to cry at the sight of a dentist. Now she asks when her next visit is. That says everything about this clinic.',
    author: 'Anita Deshmukh',
    role: 'Parent · Kids\' dentistry',
    date: '28 May 2026',
    photo: '/patient-2.jpg'
  },
  {
    quote: 'Booked online at midnight, got a reminder the next morning, and walked out with a clear plan and price on paper. Refreshingly honest.',
    author: 'Sana Sheikh',
    role: 'Patient · Braces consult',
    date: '9 April 2026',
    photo: '/patient-3.jpg'
  },
  {
    quote: 'Two implants, zero drama. Dr. Vikram showed me the scan, the plan, and the price on day one — exactly what happened, no surprises.',
    author: 'Manoj Verma',
    role: 'Patient · Dental implants',
    date: '22 March 2026',
    photo: '/patient-4.jpg'
  },
  {
    quote: 'My teeth have never felt this clean. Gentle hands, honest advice, and they never push treatments you don\'t need.',
    author: 'Kavya Iyer',
    role: 'Patient · Cleaning & whitening',
    date: '14 February 2026',
    photo: '/patient-5.jpg'
  }
]

export const BLOG_POSTS = [
  {
    title: '5 Daily Habits That Keep Cavities Away',
    excerpt: 'Small changes to brushing, flossing and snacking that protect your teeth between visits.',
    body: 'Brush twice a day with a soft-bristled brush, floss before bedtime, rinse after meals, keep sugary snacks to mealtimes, and drink water instead of aerated drinks. Pair these with a six-monthly check-up and most cavities simply never get a chance to start.',
    tag: 'Daily Care', date: 'Oct 2026'
  },
  {
    title: 'Braces or Clear Aligners — Which One Is for You?',
    excerpt: 'A simple, honest comparison of comfort, cost, and results to help you decide.',
    body: 'Metal braces win on complex corrections and cost, ceramic braces hide better, and clear aligners shine for comfort and appearance on mild-to-moderate crowding. The right pick depends on your bite, your budget, and how disciplined you are with wear time — our orthodontist maps all three out for you in one visit.',
    tag: 'Orthodontics', date: 'Sep 2026'
  },
  {
    title: 'Your Child\'s First Dental Visit: A Parent\'s Guide',
    excerpt: 'When to go, what to expect, and how to make the first visit a happy memory.',
    body: 'Plan the first visit by age one, or when the first tooth shows up. Keep it short and playful — a ride on the chair, a count of the teeth, a small mirror to look at. Avoid using words like \'pain\' or \'injection\', and never use a dental visit as a threat. Kids who start early grow into adults who never fear the dentist.',
    tag: 'Kids', date: 'Aug 2026'
  }
]
