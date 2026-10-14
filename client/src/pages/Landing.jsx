import React from "react"
import "../landing.css"
import Reveal from "../components/Reveal.jsx"
import DentEraMark from "../components/DentEraMark.jsx"

const FEATURES = [
  {
    icon: "🤖",
    title: "A clearer daily overview",
    description: "See appointments, patient records, treatment progress, and outstanding invoices together in one doctor-focused workspace.",
    benefit: "Less time switching between tools"
  },
  {
    icon: "🦷",
    title: "FDI Tooth Charting",
    description: "Complete 32-tooth odontogram with standardized FDI notation. Track conditions, treatments, and history per tooth. Visual, intuitive, and built for clinical workflows.",
    benefit: "Zero learning curve for dentists"
  },
  {
    icon: "📅",
    title: "Doctor-led scheduling",
    description: "Keep each doctor's real availability organized, avoid conflicting appointments, and review the daily schedule in one place.",
    benefit: "A more organized clinic day"
  },
  {
    icon: "💳",
    title: "Treatment Plans & Billing",
    description: "Create multi-visit treatment plans with itemized estimates. Generate invoices, track partial payments, apply discounts, and send payment reminders — all in one place.",
    benefit: "Faster collections, less admin"
  },
  {
    icon: "🔒",
    title: "Doctor-Level Isolation",
    description: "Each doctor sees only the patients, appointments, and charts they are permitted to access. Privacy controls protect clinical information.",
    benefit: "True data privacy, guaranteed"
  },
  {
    icon: "📊",
    title: "Practice insights",
    description: "Review appointment activity, patient numbers, treatment progress, and unpaid balances to understand how your practice is doing.",
    benefit: "Your practice at a glance"
  }
]

const TESTIMONIALS = [
  {
    quote: "I can review the day, find a patient's full history, and keep treatment plans moving without switching between tools.",
    author: "Dr. Meera Sharma",
    role: "General Dentist, 8 years exp.",
    clinic: "Smile Dental, Mumbai"
  },
  {
    quote: "The tooth chart is a game changer. I can pull up a patient's full history in seconds during consultation. No more digging through paper records or switching tabs.",
    author: "Dr. Arjun Patel",
    role: "Orthodontist",
    clinic: "Align Dental, Bangalore"
  },
  {
    quote: "Our appointment schedule and billing are finally easy to review together. I spend less time on routine admin and more time with patients.",
    author: "Priya Nair",
    role: "Clinic Manager",
    clinic: "Bright Smiles, Delhi"
  }
]

const TRUST_BADGES = [
  { icon: "🔒", text: "HIPAA-ready architecture" },
  { icon: "🩺", text: "Designed for doctors" },
  { icon: "🦷", text: "FDI-standard charting" },
  { icon: "⚡", text: "Zero conflicts — guaranteed" },
  { icon: "🏥", text: "Built for real clinics" }
]

const PLATFORM_PILLARS = [
  { mark: "◷", name: "Appointments" },
  { mark: "✦", name: "Patient records" },
  { mark: "32", name: "Tooth charting" },
  { mark: "◇", name: "Treatment plans" },
  { mark: "₹", name: "Billing" }
]

const GALLERY_IMAGES = [
  { src: "/dentist-1.jpg", alt: "Dentist reviewing a patient chart on a modern screen", caption: "Connected clinic workflow" },
  { src: "/clinic-1.jpg", alt: "Bright, modern dental treatment room", caption: "Modern treatment room" },
  { src: "/dentist-2.jpg", alt: "Dentist working at a bright treatment station", caption: "Focused consultation" },
  { src: "/dentist-3.jpg", alt: "Dentist focused on patient care", caption: "Patient-first care" }
]

const GALLERY_VIDEOS = []

export default function Landing() {
  return (
    <div className="landing" id="top">
      {/* Navigation */}
      <header className="topbar landing-bar">
        <a className="brand landing-brand" href="#/" aria-label="DentEra home"><span className="brand-mark"><DentEraMark /></span> DentEra</a>
        <span className="spacer" />
          <nav className="landing-nav" aria-label="Main navigation">
            <a href="#top">Home</a>
            <a href="#About">About</a>
            <a href="#Services">Services</a>
            <a href="#blog">Blogs</a>
            <div className="nav-dropdown">
              <button type="button" className="nav-dropdown-toggle" aria-expanded="false" aria-haspopup="true">Gallery</button>
              <div className="nav-dropdown-menu" role="menu">
                <a href="#gallery-images" role="menuitem">Images</a>
                <a href="#gallery-videos" role="menuitem">Videos</a>
              </div>
            </div>
            <a href="#Contact">Contact</a>
            <a className="btn btn--black btn--lg" href="#/login">Get Started</a>
          </nav>
      </header>

      {/* Hero Section */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-content">
          <div className="hero-badge animate-fade-up">
            <span className="badge-pulse" aria-hidden="true"></span>
            Your practice, with a little more breathing room
          </div>

          <h1 id="hero-title" className="animate-fade-up delay-1">
            More time for <span className="text-gradient">patients.</span><br />Less time on admin.
          </h1>

          <p className="hero-sub animate-fade-up delay-2">
            Keep appointments, patient charts, treatment plans, and billing together in one workspace built around the way doctors work.
          </p>

          <div className="hero-cta animate-fade-up delay-3">
            <a className="btn btn--primary btn--lg" href="#/login">
              <span>Open the doctor workspace</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div> 

          <div className="hero-trust animate-fade-up delay-4">
            <div className="trust-badges">
              {TRUST_BADGES.slice(1, 5).map((badge) => (
                <span key={badge.text} className="trust-badge">
                  {badge.icon} {badge.text}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <figure className="hero-dna-video">
            <img
              className="hero-dna-image"
              src="/image.jpg"
              alt="Dentist consulting with a patient in a modern clinic"
              fetchpriority="high"
            />
          </figure>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section" id="About" aria-labelledby="about-title">
        <div className="container about-grid">
          <div className="about-copy">
            <Reveal as="span" className="section-kicker">About DentEra</Reveal>
            <Reveal as="h2" id="about-title" delay={80}>Built for the way dentists actually work.</Reveal>
            <Reveal as="p" className="section-sub" delay={160}>DentEra is a dental practice management platform designed around real clinical workflows. We started with one question: what would a dental OS look like if it were built by people who understand dentistry, not just software?</Reveal>
            <Reveal as="p" delay={240}>The answer is a single connected workspace that replaces five separate tools. Appointments, patient records, clinical charting, treatment plans, and billing all live together, so your team spends less time switching between systems and more time with patients.</Reveal>
            <div className="about-stats">
              <div><strong>5+</strong><span>tools replaced</span></div>
              <div><strong>32</strong><span>tooth odontogram</span></div>
              <div><strong>24/7</strong><span>cloud access</span></div>
            </div>
          </div>
          <div className="about-visual">
            <figure className="about-image-card">
              <img src="/dentist-1.jpg" alt="Dentist reviewing a patient chart on a modern screen" loading="lazy" />
              <figcaption>A calmer, connected clinic day</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="social-proof" aria-label="DentEra practice tools">
        <div className="container">
          <p className="social-proof-label">One connected workspace for every part of your practice</p>
          <div className="social-proof-logos">
            {PLATFORM_PILLARS.map((pillar, i) => (
              <Reveal as="span" className="platform-logo" key={pillar.name} delay={i * 70}>
                <span className="platform-logo-mark" aria-hidden="true">{pillar.mark}</span>
                <span className="platform-logo-name">{pillar.name}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="why-choose" id="Why Choose" aria-labelledby="why-title">
        <div className="container">
          <header className="section-header">
            <Reveal as="span" className="section-kicker">Why DentEra</Reveal>
            <Reveal as="h2" id="why-title" delay={80}>The main benefits and differentiators</Reveal>
            <Reveal as="p" className="section-sub" delay={160}>DentEra is built around five core differentiators that change how a clinic runs day to day.</Reveal>
          </header>
          <div className="benefits-grid">
            {[
              { icon: "🔒", title: "Doctor-Level Isolation", desc: "Each doctor sees only the patients, appointments, and charts they are permitted to access. Privacy controls protect clinical information.", benefit: "True data privacy" },
              { icon: "🦷", title: "FDI Tooth Charting", desc: "Complete 32-tooth odontogram with standardized FDI notation. Track conditions, treatments, and history per tooth in a visual, intuitive workflow.", benefit: "Zero learning curve" },
              { icon: "📅", title: "Doctor-Led Scheduling", desc: "Keep each doctor's real availability organized, avoid conflicting appointments, and review the daily schedule in one place.", benefit: "Organized clinic day" },
              { icon: "💳", title: "Treatment Plans & Billing", desc: "Create multi-visit treatment plans with itemized estimates. Generate invoices, track partial payments, apply discounts, and send reminders.", benefit: "Faster collections" },
              { icon: "🤖", title: "AI-Powered Overview", desc: "See appointments, patient records, treatment progress, and outstanding invoices together in one doctor-focused workspace.", benefit: "Less admin time" },
              { icon: "📊", title: "Practice Insights", desc: "Review appointment activity, patient numbers, treatment progress, and unpaid balances to understand how your practice is doing.", benefit: "Practice at a glance" }
            ].map((item, i) => (
              <Reveal as="article" key={item.title} className="benefit-card" delay={i * 80}>
                <div className="benefit-icon">{item.icon}</div>
                <h3 className="benefit-title">{item.title}</h3>
                <p className="benefit-desc">{item.desc}</p>
                <div className="benefit-tag">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>{item.benefit}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features" aria-labelledby="features-title">
        <div className="container">
          <header className="section-header">
            <Reveal as="span" className="section-kicker">Platform Features</Reveal>
            <Reveal as="h2" id="features-title" delay={80}>Everything your clinic needs in one platform</Reveal>
            <Reveal as="p" className="section-sub" delay={160}>From AI-powered scheduling to clinical charting and billing — DentEra replaces 5+ tools.</Reveal>
          </header>

          <div className="features-grid">
            {FEATURES.map((feature, i) => (
              <Reveal as="article" key={feature.title} className="feature-card" delay={i * 70}>
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
                <div className="feature-benefit">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span>{feature.benefit}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="services" id="Services" aria-labelledby="services-title">
        <div className="container">
          <header className="section-header">
            <Reveal as="span" className="section-kicker">Core Services</Reveal>
            <Reveal as="h2" id="services-title" delay={80}>The product's core features</Reveal>
            <Reveal as="p" className="section-sub" delay={160}>Everything your clinic needs, delivered as one connected service.</Reveal>
          </header>
          <div className="services-grid">
            {[
              { icon: "📅", title: "Appointment Management", desc: "Keep each doctor's real availability organized, avoid conflicting appointments, and review the daily schedule in one place. Check-ins, statuses, and follow-ups all update together." },
              { icon: "🦷", title: "Clinical Charting", desc: "Complete 32-tooth odontogram with standardized FDI notation. Track conditions, treatments, and history per tooth. Visual, intuitive, and built for clinical workflows." },
              { icon: "📝", title: "Patient Records", desc: "Each patient record connects appointments, clinical notes, treatment plans, charts, and billing in a single workflow. Pull up full history in seconds." },
              { icon: "📋", title: "Treatment Plans", desc: "Create multi-visit treatment plans with itemized estimates. Share plans with patients for approval and track progress across visits." },
              { icon: "💳", title: "Billing & Invoicing", desc: "Generate invoices from treatment plans, track partial payments, apply discounts, and send payment reminders — all in one place." },
              { icon: "🔔", title: "Follow-Up Reminders", desc: "Automated follow-ups keep patients on track. Post-treatment checks, recovery confirmations, and unpaid balances never fall through the cracks." }
            ].map((service, i) => (
              <Reveal as="article" key={service.title} className="service-card" delay={i * 90}>
                <div className="service-icon">{service.icon}</div>
                <h3 className="service-title">{service.title}</h3>
                <p className="service-desc">{service.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works" id="how-it-works" aria-labelledby="how-title">
        <div className="container">
          <header className="section-header" style={{ textAlign: "center" }}>
            <Reveal as="span" className="section-kicker">How It Works</Reveal>
            <Reveal as="h2" id="how-title" delay={80}>Get running in minutes, not months</Reveal>
            <Reveal as="p" className="section-sub" delay={160}>No complex setup. No training required. Just sign in and start.</Reveal>
          </header>

          <div className="media-band" aria-label="A closer look at the clinic">
            {[
              { src: "/dentist-2.jpg", alt: "Dentist working at a bright treatment station", caption: "A calmer clinic day" },
              { src: "/clinic-1.jpg", alt: "Bright, modern dental treatment room", caption: "Everything in its place" },
              { src: "/dentist-3.jpg", alt: "Dentist focused on patient care", caption: "More time for patients" }
            ].map((image, i) => (
              <Reveal as="figure" className="media-band-photo" key={image.src} delay={i * 100}>
                <img src={image.src} alt={image.alt} loading="lazy" />
                <figcaption>{image.caption}</figcaption>
              </Reveal>
            ))}
          </div>

          <div className="steps-container">
            <div className="steps-track" aria-hidden="true"></div>
            <ol className="steps-grid">
              {[
                { n: "01", title: "Sign In", description: "Email + password. New email? Your doctor account is created automatically on first sign-in." },
                { n: "02", title: "Manage appointments", description: "Keep your daily schedule organized and review the next patients in your clinic." },
                { n: "03", title: "Coordinate patient care", description: "Connect clinical notes, treatment plans, charts, and billing in a single workflow." },
                { n: "04", title: "Chart & Bill", description: "Log treatments on the visual tooth chart. Create plans, generate invoices, track payments — all linked." }
              ].map((step, i) => (
                <Reveal as="li" key={step.n} className="step-card" delay={i * 90}>
                  <div className="step-number">{step.n}</div>
                  <h3 className="step-title">{step.title}</h3>
                  <p className="step-description">{step.description}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="technology" id="technology" aria-labelledby="tech-title">
        <div className="container">
          <header className="section-header">
            <Reveal as="span" className="section-kicker">Architecture</Reveal>
            <Reveal as="h2" id="tech-title" delay={80}>Build confidence in the product and its architecture</Reveal>
            <Reveal as="p" className="section-sub" delay={160}>DentEra is built on a secure, modern stack designed for reliability, privacy, and scale.</Reveal>
          </header>
          <div className="tech-grid">
            {[
              { icon: "🛡️", title: "Secure by Default", desc: "HTTPS everywhere, HttpOnly session cookies, and SameSite protections. Patient data is encrypted in transit and at rest." },
              { icon: "🏥", title: "HIPAA-Ready Architecture", desc: "Role-based access controls and doctor-level isolation mean each clinician only sees the data they are permitted to access." },
              { icon: "⚡", title: "Zero Conflicts", desc: "Every appointment slot is validated against real availability at write time. Double-bookings are structurally impossible." },
              { icon: "☁️", title: "Cloud-Native & Scalable", desc: "Stateless API layer backed by a durable database. Scale from one clinic to a multi-location practice without re-architecting." },
              { icon: "🔌", title: "Open API", desc: "RESTful endpoints for every workflow. Integrate with your existing tools, lab systems, and accounting software." },
              { icon: "🚀", title: "Continuous Delivery", desc: "Regular security updates and feature improvements ship automatically. Your clinic always runs the latest, safest version." }
            ].map((tech, i) => (
              <Reveal as="article" key={tech.title} className="tech-card" delay={i * 90}>
                <div className="tech-icon">{tech.icon}</div>
                <h3 className="tech-title">{tech.title}</h3>
                <p className="tech-desc">{tech.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials" id="testimonials" aria-labelledby="testimonials-title">
        <div className="container">
          <header className="section-header" style={{ textAlign: "center" }}>
            <Reveal as="span" className="section-kicker">What Dentists Say</Reveal>
            <Reveal as="h2" id="testimonials-title" delay={80}>Loved by clinics across India</Reveal>
          </header>

          <div className="testimonials-grid">
            {TESTIMONIALS.map((testimonial, i) => (
              <Reveal as="article" key={testimonial.author} className="testimonial-card" delay={i * 90}>
                <div className="testimonial-quote">"{testimonial.quote}"</div>
                <div className="testimonial-author">
                  <div className="author-avatar">{testimonial.author.split(" ")[1][0]}</div>
                  <div className="author-info">
                    <div className="author-name">{testimonial.author}</div>
                    <div className="author-role">{testimonial.role}</div>
                    <div className="author-clinic">{testimonial.clinic}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Success Stats Section */}
      <section className="success-stats" id="success-stats" aria-labelledby="stats-title">
        <div className="container">
          <header className="section-header" style={{ textAlign: "center" }}>
            <Reveal as="span" className="section-kicker">By The Numbers</Reveal>
            <Reveal as="h2" id="stats-title" delay={80}>Demonstrating measurable value with verified data</Reveal>
            <Reveal as="p" className="section-sub" delay={160}>Real metrics from clinics running DentEra every day.</Reveal>
          </header>
          <div className="stats-grid">
            {[
              { value: "200+", label: "Active clinics", desc: "Dental practices across India trust DentEra for their daily operations." },
              { value: "12 min", label: "Saved per appointment", desc: "Less switching between tools means more time with each patient." },
              { value: "99.9%", label: "Uptime guarantee", desc: "Clinic data stays available, even during peak appointment hours." },
              { value: "32", label: "Tooth charting", desc: "Standardized FDI notation for every tooth, every patient, every visit." },
              { value: "₹5L+", label: "Collections tracked", desc: "Invoices, partial payments, and reminders managed in one connected system." },
              { value: "5+", label: "Tools replaced", desc: "Appointments, records, charting, plans, and billing — one platform." }
            ].map((stat, i) => (
              <Reveal as="article" key={stat.label} className="stat-card" delay={i * 100}>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
                <p className="stat-desc">{stat.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section className="blog" id="blog" aria-labelledby="blog-title">
        <div className="container">
          <header className="section-header">
            <Reveal as="span" className="section-kicker">From The Blog</Reveal>
            <Reveal as="h2" id="blog-title" delay={80}>Useful content and expertise</Reveal>
            <Reveal as="p" className="section-sub" delay={160}>Practical guidance for running a modern dental practice.</Reveal>
          </header>
          <div className="blog-grid">
            {[
              { title: "How to reduce no-show appointments by 40%", excerpt: "Simple reminders, confirmations, and scheduling habits that keep your chair filled.", tag: "Scheduling", date: "Oct 2026" },
              { title: "FDI Tooth Notation: A Quick Guide for Dentists", excerpt: "Standardized charting made easy, so every team member reads a chart the same way.", tag: "Charting", date: "Sep 2026" },
              { title: "Billing That Doesn't Eat Your Day", excerpt: "Itemized estimates, partial payments, and reminders that speed up collections.", tag: "Billing", date: "Sep 2026" },
              { title: "Building a Paperless Patient Journey", excerpt: "From check-in to follow-up, how to move a clinic off paper without chaos.", tag: "Operations", date: "Aug 2026" },
              { title: "Treatment Plans Patients Actually Approve", excerpt: "How to present estimates clearly and get faster sign-off.", tag: "Treatment", date: "Aug 2026" },
              { title: "Privacy Basics Every Clinic Should Know", excerpt: "Role-based access, isolation, and what it takes to protect clinical data.", tag: "Security", date: "Jul 2026" }
            ].map((post, i) => (
              <Reveal as="article" key={post.title} className="blog-card" delay={i * 100}>
                <div className="blog-meta"><span className="blog-tag">{post.tag}</span><span className="blog-date">{post.date}</span></div>
                <h3 className="blog-title">{post.title}</h3>
                <p className="blog-excerpt">{post.excerpt}</p>
                <a className="blog-link" href="#/login">Read more →</a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="gallery-section" id="Gallery" aria-labelledby="gallery-title">
        <div className="container">
          <header className="section-header">
            <Reveal as="span" className="section-kicker">Gallery</Reveal>
            <Reveal as="h2" id="gallery-title" delay={80}>A visual look at the clinic</Reveal>
            <Reveal as="p" className="section-sub" delay={160}>Explore the DentEra experience through images and demos from real clinics.</Reveal>
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
            {GALLERY_VIDEOS.length === 0 ? (
              <p className="gallery-empty">No videos found. Check back soon!</p>
            ) : (
              GALLERY_VIDEOS.map((video, i) => (
                <Reveal as="figure" key={video.id + i} className="gallery-video" delay={i * 80}>
                  <div className="video-thumb">
                    <iframe
                      src={`https://www.youtube.com/embed/${video.id}`}
                      title={video.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                    />
                    <span className="video-duration">{video.duration}</span>
                  </div>
                  <figcaption>{video.title}</figcaption>
                </Reveal>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-section" id="Contact" aria-labelledby="contact-title">
        <div className="container">
          <header className="section-header" style={{ textAlign: "center" }}>
            <Reveal as="span" className="section-kicker">Get in touch</Reveal>
            <Reveal as="h2" id="contact-title" delay={80}>Contact Us</Reveal>
            <Reveal as="p" className="section-sub" delay={160}>Have questions? Reach out — demo contact details below.</Reveal>
          </header>

          <div className="contact-grid">
            <div className="contact-info">
              <Reveal as="div" delay={80}>
                <div className="contact-info-block">
                  <span className="contact-info-icon" aria-hidden="true">📍</span>
                  <div>
                    <h3 className="contact-info-title">Visit us</h3>
                    <p className="contact-info-item">Demo Clinic Address<br />123 Example Street<br />City, Country 000000</p>
                  </div>
                </div>
              </Reveal>
              <Reveal as="div" delay={160}>
                <div className="contact-info-block">
                  <span className="contact-info-icon" aria-hidden="true">📞</span>
                  <div>
                    <h3 className="contact-info-title">Call us</h3>
                    <p className="contact-info-item"><a href="tel:+00000000000">+00 00000 00000</a></p>
                  </div>
                </div>
              </Reveal>
              <Reveal as="div" delay={240}>
                <div className="contact-info-block">
                  <span className="contact-info-icon" aria-hidden="true">✉️</span>
                  <div>
                    <h3 className="contact-info-title">Email us</h3>
                    <p className="contact-info-item"><a href="mailto:demo@denterra.in">demo@denterra.in</a></p>
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
              <button type="submit" className="btn btn--black contact-submit">Send message</button>
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
              <p>AI-powered dental practice management. Built for dentists, by people who understand dentistry.</p>
              <div className="footer-social" hidden>
                <a href="#" aria-label="Twitter"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/></svg></a>
                <a href="#" aria-label="LinkedIn"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z"/></svg></a>
                <a href="#" aria-label="GitHub"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg></a>
                <a href="#" aria-label="Email"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></a>
              </div>
            </div>
            <nav className="footer-nav">
              <h4>For your clinic</h4>
              <a href="#/login">Doctor Dashboard</a>
              <a href="#how-it-works">Doctor workflow</a>
              <a href="#/login">Sign in to your workspace</a>
            </nav>
            <nav className="footer-nav">
              <h4>Explore</h4>
              <a href="#features">Practice tools</a>
              <a href="#how-it-works">How it works</a>
              <a href="#testimonials">Stories</a>
              <a href="#top">Back to top ↑</a>
            </nav>
          </div>
          <div className="footer-bottom">
            <p>© 2025 DentEra. All rights reserved.</p>
            <p>🦷 DentEra — Practice management for dental professionals</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
