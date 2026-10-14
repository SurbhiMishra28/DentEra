import React, { useState } from "react"
import "../landing.css"
import Reveal from "../components/Reveal.jsx"
import DentEraMark from "../components/DentEraMark.jsx"
import EraStage from "../components/EraStage.jsx"

const SERVICES = [
  { icon: "🦷", title: "Check-ups & Cleaning", desc: "Routine exams, scaling and polishing that catch small issues before they become painful ones." },
  { icon: "😁", title: "Braces & Aligners", desc: "Metal, ceramic and clear aligner options to straighten smiles at every age — with clear plans." },
  { icon: "🛡️", title: "Dental Implants", desc: "Permanent, natural-looking replacements for missing teeth, planned and placed end to end." },
  { icon: "✨", title: "Root Canal & Surgery", desc: "Gentle root canals, wisdom-tooth extractions and gum care handled by specialists." }
]

const DOCTORS = [
  { img: "/doctor-1.jpg", fallback: "/clinic-1.jpg", name: "Dr. Meera Sharma", role: "Chief Dentist · Root Canal Specialist", exp: "12+ years experience" },
  { img: "/doctor-2.jpg", fallback: "/dentist-1.jpg", name: "Dr. Arjun Patel", role: "Orthodontist · Braces & Aligners", exp: "10+ years experience" },
  { img: "/doctor-3.jpg", fallback: "/dentist-3.jpg", name: "Dr. Nisha Rao", role: "Pediatric Dentist · Kids' Specialist", exp: "8+ years experience" },
  { img: "/doctor-4.jpg", fallback: "/dentist-2.jpg", name: "Dr. Vikram Singh", role: "Implantologist · Oral Surgery", exp: "14+ years experience" }
]

const TESTIMONIALS = [
  {
    quote: "My wisdom tooth came out in fifteen minutes and I genuinely felt nothing. The team explained every step before touching anything.",
    author: "Ravi Kumar",
    role: "Patient · Root canal & extraction",
    date: "11 June 2026",
    photo: "/patient-1.jpg"
  },
  {
    quote: "My daughter used to cry at the sight of a dentist. Now she asks when her next visit is. That says everything about this clinic.",
    author: "Anita Deshmukh",
    role: "Parent · Kids' dentistry",
    date: "28 May 2026",
    photo: "/patient-2.jpg"
  },
  {
    quote: "Booked online at midnight, got a reminder the next morning, and walked out with a clear plan and price on paper. Refreshingly honest.",
    author: "Sana Sheikh",
    role: "Patient · Braces consult",
    date: "9 April 2026",
    photo: "/patient-3.jpg"
  },
  {
    quote: "Two implants, zero drama. Dr. Vikram showed me the scan, the plan, and the price on day one — exactly what happened, no surprises.",
    author: "Manoj Verma",
    role: "Patient · Dental implants",
    date: "22 March 2026",
    photo: "/patient-4.jpg"
  },
  {
    quote: "My teeth have never felt this clean. Gentle hands, honest advice, and they never push treatments you don't need.",
    author: "Kavya Iyer",
    role: "Patient · Cleaning & whitening",
    date: "14 February 2026",
    photo: "/patient-5.jpg"
  }
]

const WHY_CHOOSE = [
  { icon: "🏅", title: "Certified specialists", desc: "Every dentist at DentEra is a licensed specialist — from root canals to kids' dentistry — so you're always in expert hands." },
  { icon: "😌", title: "Painless, gentle care", desc: "Numbing before every procedure, slow hands, and honest explanations. Most patients say the visit was easier than expected." },
  { icon: "💰", title: "Transparent pricing", desc: "Written estimates before treatment starts — no hidden charges, no surprises at the counter, ever." },
  { icon: "⏱", title: "On-time, every time", desc: "Your slot is protected. Our smart scheduling system keeps the day running so waiting rooms never become your second home." },
  { icon: "🧼", title: "Hospital-grade hygiene", desc: "Autoclaved instruments, single-use kits, and strict cross-infection protocols in every room, every day." },
  { icon: "👨‍👩‍👧", title: "Family-friendly clinic", desc: "Easy parking, a kids' corner, and doctors who explain things to children before touching anything." }
]

const GALLERY_IMAGES = [
  { src: "/dentist-1.jpg", alt: "Dentist explaining an X-ray to a patient", caption: "Clear diagnosis, together" },
  { src: "/clinic-1.jpg", alt: "Dentist working at a bright treatment station", caption: "Focused, gentle treatment" },
  { src: "/dentist-2.jpg", alt: "A bright, modern dental treatment room", caption: "Calm, modern operatory" },
  { src: "/dentist-3.jpg", alt: "A clean and modern clinic interior", caption: "Designed for comfort" }
]

const TRUST_BADGES = [
  { icon: "🦷", text: "Family friendly" },
  { icon: "😌", text: "Painless treatments" },
  { icon: "⏰", text: "On-time appointments" },
  { icon: "🏅", text: "Certified specialists" }
]

const BLOG_POSTS = [
  { title: "5 Daily Habits That Keep Cavities Away", excerpt: "Small changes to brushing, flossing and snacking that protect your teeth between visits.", tag: "Daily Care", date: "Oct 2026" },
  { title: "Braces or Clear Aligners — Which One Is for You?", excerpt: "A simple, honest comparison of comfort, cost, and results to help you decide.", tag: "Orthodontics", date: "Sep 2026" },
  { title: "Your Child's First Dental Visit: A Parent's Guide", excerpt: "When to go, what to expect, and how to make the first visit a happy memory.", tag: "Kids", date: "Aug 2026" }
]

export default function Landing() {
  const [eraOpen, setEraOpen] = useState(false)
  const testimonialTrack = React.useRef(null)

  function scrollTrack(direction) {
    const track = testimonialTrack.current
    if (!track) return
    const card = track.querySelector('.testimonial-card')
    const step = card ? card.getBoundingClientRect().width + 24 : 360
    track.scrollBy({ left: direction * step, behavior: 'smooth' })
  }

  function onDoctorImgError(e, fallback) {
    e.currentTarget.onerror = null
    e.currentTarget.src = fallback
  }

  return (
    <div className="landing" id="top">
      {/* Navigation */}
      <header className="topbar landing-bar">
        <a className="brand landing-brand" href="#/" aria-label="DentEra home"><span className="brand-mark"><DentEraMark /></span> DentEra</a>
        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#top">Home</a>
          <a href="#About">About</a>
          <a href="#Services">Services</a>
          <a href="#why-choose">Why Choose</a>
          <a href="#gallery">Gallery</a>
          <a href="#blog">Blog</a>
        </nav>
        <a className="landing-cta" href="#/login">
          Get Started
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </a>
      </header>

      {/* Hero Section */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-panel">
          <div className="hero-card">
            <p className="hero-kicker">
              <span className="kicker-line" aria-hidden="true"></span>
              The DentEra experience
            </p>

            <h1 id="hero-title">
              Your Smile's Trusted <em className="hero-serif">Care</em>
            </h1>

            <div className="hero-actions">
              <a className="btn btn--dark btn--lg" href="#/book">Book Online</a>
              <button type="button" className="btn btn--line btn--lg" onClick={() => setEraOpen(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="9" y="2" width="6" height="12" rx="3"/>
                  <path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8"/>
                </svg>
                Talk to Era
              </button>
            </div>

            <div className="hero-clients">
              <div className="hero-avatars" aria-hidden="true">
                <span className="hero-avatar hero-avatar--1">RK</span>
                <span className="hero-avatar hero-avatar--2">AD</span>
                <span className="hero-avatar hero-avatar--3">SS</span>
                <span className="hero-avatar hero-avatar--more">+</span>
              </div>
              <p className="hero-clients-meta"><strong>25k+ Happy Patients</strong> trust DentEra with their smiles</p>
            </div>
          </div>

          <div className="hero-visual">
            <figure className="hero-photo">
              <img
                src="/image.jpg"
                alt="Dentist consulting with a smiling patient at DentEra dental clinic"
                fetchpriority="high"
              />
            </figure>

            <div className="hero-float hero-float--rating">
              <span className="hero-float-icon" aria-hidden="true">🏆</span>
              <span className="hero-float-text"><strong>No. 1</strong><small>Rated dental clinic</small></span>
            </div>

            <div className="hero-float hero-float--brand">
              <span className="hero-float-icon hero-float-icon--tooth" aria-hidden="true">🦷</span>
              <span className="hero-float-text"><strong>DentEra</strong><small>Dental care clinic</small></span>
            </div>

            <svg className="hero-doodle" width="120" height="90" viewBox="0 0 120 90" fill="none" aria-hidden="true">
              <path d="M8 80 C 20 34, 58 14, 98 32" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              <path d="M85 22 L 100 33 L 83 43" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <div className="hero-foot">
          <p className="hero-note">
            From your first check-up to a full treatment plan, everything at DentEra is designed around one thing — a calm, comfortable visit for your whole family.
          </p>
          <div className="trust-badges">
            {TRUST_BADGES.map((badge) => (
              <span key={badge.text} className="trust-badge">
                {badge.icon} {badge.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section" id="About" aria-labelledby="about-title">
        <div className="container about-grid">
          <div className="about-copy">
            <Reveal as="span" className="section-kicker">About Us</Reveal>
            <Reveal as="h2" id="about-title" delay={80}>Gentle dental care, built around <em className="serif-accent">you</em></Reveal>
            <Reveal as="p" className="section-sub" delay={160}>DentEra is a neighbourhood dental clinic built on a simple promise — honest advice, gentle treatment, and no surprises. From your first check-up to a full smile makeover, one team looks after you end to end.</Reveal>
            <Reveal as="p" delay={240}>Behind the chair, our doctors run on a smart practice system — appointments, charts and treatment plans in one place — so your visit starts on time and your history is always at their fingertips.</Reveal>
            <Reveal as="a" className="btn btn--line about-more" href="#doctors" delay={300}>
              More About Us
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <path d="M7 17L17 7M9 7h8v8"/>
              </svg>
            </Reveal>
            <div className="about-stats">
              <div><strong>25k+</strong><span>Happy patients</span></div>
              <div><strong>15+</strong><span>Expert doctors</span></div>
              <div><strong>12+</strong><span>Years of care</span></div>
            </div>
          </div>
          <div className="about-visual">
            <figure className="about-image-card">
              <img src="/dentist-1.jpg" alt="Dentist explaining an X-ray to a patient at DentEra" loading="lazy" />
              <figcaption>A calmer, clearer kind of dental visit</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="services" id="Services" aria-labelledby="services-title">
        <div className="container">
          <header className="section-header section-header--center">
            <Reveal as="span" className="section-kicker">Core Services</Reveal>
            <Reveal as="h2" id="services-title" delay={80}>Trusted dental services for the whole <em className="serif-accent">family</em></Reveal>
            <Reveal as="p" className="section-sub" delay={160}>Honest diagnosis, gentle treatment, and clear pricing — for every age.</Reveal>
          </header>
          <div className="services-grid">
            {SERVICES.map((service, i) => (
              <Reveal as="article" key={service.title} className="service-card" delay={i * 90}>
                <div className="service-icon">{service.icon}</div>
                <h3 className="service-title">{service.title}</h3>
                <p className="service-desc">{service.desc}</p>
                <span className="service-arrow" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M7 17L17 7M9 7h8v8"/>
                  </svg>
                </span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Doctors Section */}
      <section className="doctors" id="doctors" aria-labelledby="doctors-title">
        <div className="container">
          <header className="section-header section-header--center">
            <Reveal as="span" className="section-kicker">Doctors</Reveal>
            <Reveal as="h2" id="doctors-title" delay={80}>Qualified <em className="serif-accent">doctors</em></Reveal>
            <Reveal as="p" className="section-sub" delay={160}>Specialists who treat you like family — the same faces at every visit.</Reveal>
          </header>
          <div className="doctors-grid">
            {DOCTORS.map((doc, i) => (
              <Reveal as="article" key={doc.name} className="doctor-card" delay={i * 80}>
                <figure className="doctor-photo">
                  <img
                    src={doc.img}
                    alt={`${doc.name} — ${doc.role} at DentEra`}
                    loading="lazy"
                    onError={(e) => onDoctorImgError(e, doc.fallback)}
                  />
                </figure>
                <h3 className="doctor-name">{doc.name}</h3>
                <p className="doctor-role">{doc.role}</p>
                <span className="doctor-exp">{doc.exp}</span>
              </Reveal>
            ))}
          </div>
          <div className="view-all-row">
            <a className="btn btn--line" href="#/book">
              View All
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <path d="M7 17L17 7M9 7h8v8"/>
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="why-choose" id="why-choose" aria-labelledby="why-title">
        <div className="container">
          <header className="section-header section-header--center">
            <Reveal as="span" className="section-kicker">Why Choose Us</Reveal>
            <Reveal as="h2" id="why-title" delay={80}>Why families choose <em className="serif-accent">DentEra</em></Reveal>
            <Reveal as="p" className="section-sub" delay={160}>Six promises we keep at every single visit.</Reveal>
          </header>
          <div className="benefits-grid">
            {WHY_CHOOSE.map((item, i) => (
              <Reveal as="article" key={item.title} className="benefit-card" delay={i * 70}>
                <div className="benefit-icon">{item.icon}</div>
                <h3 className="benefit-title">{item.title}</h3>
                <p className="benefit-desc">{item.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials" id="testimonials" aria-labelledby="testimonials-title">
        <div className="container">
          <header className="section-header section-header--center">
            <Reveal as="span" className="section-kicker">Testimonials</Reveal>
            <Reveal as="h2" id="testimonials-title" delay={80}>What People Say About <em className="serif-accent">Us</em></Reveal>
          </header>

          <div className="testimonials-grid" ref={testimonialTrack}>
            {TESTIMONIALS.map((testimonial, i) => (
              <Reveal as="article" key={testimonial.author} className="testimonial-card" delay={i * 90}>
                <div className="testimonial-mark" aria-hidden="true">“</div>
                <div className="testimonial-quote">{testimonial.quote}</div>
                <div className="testimonial-author">
                  <div className="author-avatar">
                    {testimonial.photo
                      ? <img src={testimonial.photo} alt="" loading="lazy" />
                      : testimonial.author[0]}
                  </div>
                  <div className="author-info">
                    <div className="author-name">{testimonial.author}</div>
                    <div className="author-role">{testimonial.role}</div>
                  </div>
                </div>
                <div className="testimonial-date">{testimonial.date}</div>
              </Reveal>
            ))}
          </div>

          <div className="slider-nav">
            <button type="button" className="slider-btn slider-btn--fill" aria-label="Previous testimonials" onClick={() => scrollTrack(-1)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button type="button" className="slider-btn" aria-label="Next testimonials" onClick={() => scrollTrack(1)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="gallery-section" id="gallery" aria-labelledby="gallery-title">
        <div className="container">
          <header className="section-header section-header--center">
            <Reveal as="span" className="section-kicker">Gallery</Reveal>
            <Reveal as="h2" id="gallery-title" delay={80}>A look inside our <em className="serif-accent">clinic</em></Reveal>
            <Reveal as="p" className="section-sub" delay={160}>Clean rooms, modern equipment, and a team that loves what it does.</Reveal>
          </header>

          <nav className="gallery-subnav" aria-label="Gallery navigation">
            <a href="#gallery-images" className="gallery-tab">Images</a>
            <a href="#gallery-videos" className="gallery-tab">Videos</a>
          </nav>

          <div id="gallery-images" className="gallery-images">
            {GALLERY_IMAGES.map((image, i) => (
              <Reveal as="figure" key={image.src} className="gallery-photo" delay={i * 80}>
                <img src={image.src} alt={image.alt} loading="lazy" />
                <figcaption>{image.caption}</figcaption>
              </Reveal>
            ))}
          </div>

          <div id="gallery-videos" className="gallery-videos">
            <p className="gallery-empty">No clinic videos yet — check back soon!</p>
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section className="blog" id="blog" aria-labelledby="blog-title">
        <div className="container">
          <header className="section-header section-header--center">
            <Reveal as="span" className="section-kicker">From The Blog</Reveal>
            <Reveal as="h2" id="blog-title" delay={80}>Useful tips, written by our <em className="serif-accent">doctors</em></Reveal>
            <Reveal as="p" className="section-sub" delay={160}>Simple, practical guidance for healthier smiles at home.</Reveal>
          </header>
          <div className="blog-grid">
            {BLOG_POSTS.map((post, i) => (
              <Reveal as="article" key={post.title} className="blog-card" delay={i * 100}>
                <div className="blog-meta"><span className="blog-tag">{post.tag}</span><span className="blog-date">{post.date}</span></div>
                <h3 className="blog-title">{post.title}</h3>
                <p className="blog-excerpt">{post.excerpt}</p>
                <a className="blog-link" href="#/book">Read more →</a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-section" id="Contact" aria-labelledby="contact-title">
        <div className="container">
          <header className="section-header section-header--center">
            <Reveal as="span" className="section-kicker">Get in touch</Reveal>
            <Reveal as="h2" id="contact-title" delay={80}>Contact <em className="serif-accent">Us</em></Reveal>
            <Reveal as="p" className="section-sub" delay={160}>Questions, emergencies, or a second opinion — we're easy to reach.</Reveal>
          </header>

          <div className="contact-grid">
            <div className="contact-info">
              <Reveal as="div" delay={80}>
                <div className="contact-info-block">
                  <span className="contact-info-icon" aria-hidden="true">📍</span>
                  <div>
                    <h3 className="contact-info-title">Visit us</h3>
                    <p className="contact-info-item">DentEra Dental Clinic<br />2nd Floor, Smile Plaza, MG Road<br />Bengaluru 560001</p>
                  </div>
                </div>
              </Reveal>
              <Reveal as="div" delay={160}>
                <div className="contact-info-block">
                  <span className="contact-info-icon" aria-hidden="true">📞</span>
                  <div>
                    <h3 className="contact-info-title">Call us</h3>
                    <p className="contact-info-item"><a href="tel:+919876543210">+91 98765 43210</a></p>
                  </div>
                </div>
              </Reveal>
              <Reveal as="div" delay={240}>
                <div className="contact-info-block">
                  <span className="contact-info-icon" aria-hidden="true">✉️</span>
                  <div>
                    <h3 className="contact-info-title">Email us</h3>
                    <p className="contact-info-item"><a href="mailto:hello@dentera.clinic">hello@dentera.clinic</a></p>
                  </div>
                </div>
              </Reveal>
            </div>

            <Reveal as="form" className="contact-form" delay={320} onSubmit={(e) => e.preventDefault()}>
              <div className="contact-field">
                <label className="contact-label" htmlFor="contact-name">Your name</label>
                <input id="contact-name" className="contact-input" type="text" placeholder="Your name" required />
              </div>
              <div className="contact-field">
                <label className="contact-label" htmlFor="contact-email">Email address</label>
                <input id="contact-email" className="contact-input" type="email" placeholder="Email address" required />
              </div>
              <div className="contact-field">
                <label className="contact-label" htmlFor="contact-message">How can we help?</label>
                <textarea id="contact-message" className="contact-textarea" placeholder="How can we help?" rows="4" required></textarea>
              </div>
              <button type="submit" className="btn btn--dark contact-submit">Send message</button>
              <p className="contact-note">We typically reply within one business day.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer" role="contentinfo">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <a className="brand landing-brand" href="#/" aria-label="DentEra home"><span className="brand-mark"><DentEraMark /></span> DentEra</a>
              <p>A neighbourhood dental clinic with honest advice, gentle treatment, and Era — our always-on clinic assistant.</p>
            </div>
            <nav className="footer-nav">
              <h4>For patients</h4>
              <a href="#/book">Book an appointment</a>
              <a href="#Services">Our services</a>
              <a href="#doctors">Our doctors</a>
              <a href="#blog">Blog</a>
            </nav>
            <nav className="footer-nav">
              <h4>For doctors</h4>
              <a href="#/login">Doctor sign in</a>
              <a href="#/login">Open your dashboard</a>
              <a href="#Contact">Contact the clinic</a>
            </nav>
          </div>
          <div className="footer-bottom">
            <p>© 2026 DentEra Dental Clinic. All rights reserved.</p>
            <p>🦷 DentEra — gentle care for every smile</p>
          </div>
        </div>
      </footer>

      {/* Era — the face & voice of the clinic */}
      <button type="button" className="era-launcher" onClick={() => setEraOpen(true)} aria-label="Ask Era, the DentEra clinic assistant">
        <img src="/era3d.png" alt="" aria-hidden="true" />
        <span>Ask Era</span>
      </button>
      {eraOpen && <EraStage onClose={() => setEraOpen(false)} greetOnOpen />}
    </div>
  )
}
