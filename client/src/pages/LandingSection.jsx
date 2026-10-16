import React, { useState } from 'react'
import '../landing.css'
import Reveal from '../components/Reveal.jsx'
import DentEraMark from '../components/DentEraMark.jsx'
import EraStage from '../components/EraStage.jsx'
import { Tooth, Sparkles, Medal, Clock, Users, Heart, ChevronDown } from '../components/Icons.jsx'
import { SERVICES, DOCTORS, WHY_CHOOSE, GALLERY_IMAGES, BLOG_POSTS } from '../data/landingData.js'

// LandingSection — dedicated page per navbar feature: /about /services
// /why-choose /gallery /blog. Reuses the landing design system (the page
// root carries .landing) and the same data module as the home page.
const NAV = [
  { href: '#/', label: 'Home' },
  { href: '#/about', label: 'About' },
  { href: '#/services', label: 'Services' },
  { href: '#/why-choose', label: 'Why Choose' },
  { href: '#/gallery', label: 'Gallery' },
  { href: '#/blog', label: 'Blog' },
]

const META = {
  about: {
    kicker: 'About Us',
    titleA: 'Gentle dental care, built around',
    titleB: 'you',
    sub: 'A neighbourhood clinic with honest advice, gentle treatment and one team that looks after you end to end.',
  },
  services: {
    kicker: 'Core Services',
    titleA: 'Trusted dental services for the whole',
    titleB: 'family',
    sub: 'Honest diagnosis, gentle treatment, and clear pricing — for every age.',
  },
  'why-choose': {
    kicker: 'Why Choose Us',
    titleA: 'Why families choose',
    titleB: 'DentEra',
    sub: 'Six promises we keep at every single visit — and the reviews to prove it.',
  },
  gallery: {
    kicker: 'Gallery',
    titleA: 'A look inside our',
    titleB: 'clinic',
    sub: 'Clean rooms, modern equipment, and a team that loves what it does.',
  },
  blog: {
    kicker: 'From The Blog',
    titleA: 'Useful tips, written by our',
    titleB: 'doctors',
    sub: 'Simple, practical guidance for healthier smiles at home.',
  },
}

export default function LandingSection({ section }) {
  const meta = META[section] || META.about
  const [eraOpen, setEraOpen] = useState(false)
  const [openPost, setOpenPost] = useState(null)
  const [showAllDoctors, setShowAllDoctors] = useState(true)

  return (
    <div className="landing landing-sub" id="top">
      {/* Navigation — current page highlighted */}
      <header className="topbar landing-bar">
        <a className="brand landing-brand" href="#/" aria-label="DentEra home"><span className="brand-mark"><DentEraMark /></span> DentEra</a>
        <nav className="landing-nav" aria-label="Main navigation">
          {NAV.map(item => (
            <a key={item.label} href={item.href} className={item.href === `#/${section}` ? 'is-current' : ''}>{item.label}</a>
          ))}
        </nav>
        <a className="landing-cta" href="#/book">
          Book Online
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      </header>

      {/* Page hero */}
      <section className="subhero">
        <div className="container">
          <Reveal as="span" className="section-kicker">{meta.kicker}</Reveal>
          <Reveal as="h1" className="subhero-title" delay={80}>
            {meta.titleA} <em className="serif-accent">{meta.titleB}</em>
          </Reveal>
          <Reveal as="p" className="section-sub" delay={160}>{meta.sub}</Reveal>
        </div>
      </section>

      {/* ---------- page content ---------- */}
      {section === 'about' && <>
        <section className="about-section" aria-labelledby="about-title">
          <div className="container about-grid">
            <div className="about-copy">
              <Reveal as="p" delay={80}>DentEra is a neighbourhood dental clinic built on a simple promise — honest advice, gentle treatment, and no surprises. From your first check-up to a full smile makeover, one team looks after you end to end.</Reveal>
              <Reveal as="p" delay={160}>Behind the chair, our doctors run on a smart practice system — appointments, charts and treatment plans in one place — so your visit starts on time and your history is always at their fingertips.</Reveal>
              <Reveal as="p" delay={240}>We treat every age — toddlers on their first visit, teens in braces, parents juggling busy calendars, and grandparents who want gentle care. Whatever brings you in, you leave with a clear plan and a smile.</Reveal>
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

        <section className="doctors" aria-labelledby="team-title">
          <div className="container">
            <header className="section-header section-header--center">
              <Reveal as="span" className="section-kicker">Our Team</Reveal>
              <Reveal as="h2" id="team-title" delay={80}>Qualified <em className="serif-accent">doctors</em></Reveal>
              <Reveal as="p" className="section-sub" delay={160}>Specialists who treat you like family — the same faces at every visit.</Reveal>
            </header>
            <div className="doctors-grid">
              {DOCTORS.map((doc, i) => (
                <Reveal as="article" key={doc.name} className="doctor-card" delay={(i % 4) * 80}>
                  <figure className="doctor-photo"><img src={doc.img} alt={`${doc.name} — ${doc.role} at DentEra`} loading="lazy" /></figure>
                  <h3 className="doctor-name">{doc.name}</h3>
                  <p className="doctor-role">{doc.role}</p>
                  <span className="doctor-exp">{doc.exp}</span>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </>}

      {section === 'services' && <>
        <section className="services" aria-label="Our services">
          <div className="container">
            <div className="services-grid">
              {SERVICES.map((service, i) => (
                <Reveal as="article" key={service.title} className="service-card" delay={i * 90}>
                  <div className="service-icon"><service.icon size={26} /></div>
                  <h3 className="service-title">{service.title}</h3>
                  <p className="service-desc">{service.desc}</p>
                  <span className="service-arrow" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M7 17L17 7M9 7h8v8" />
                    </svg>
                  </span>
                </Reveal>
              ))}
            </div>
            <Reveal as="p" className="services-more" delay={200}>
              Not sure what you need? <a href="#/book">Book a consultation</a> — our dentist will map it out for you.
            </Reveal>
          </div>
        </section>
      </>}

      {section === 'why-choose' && <>
        <section className="why-choose" aria-label="Why choose DentEra">
          <div className="container">
            <div className="benefits-grid">
              {WHY_CHOOSE.map((item, i) => (
                <Reveal as="article" key={item.title} className="benefit-card" delay={i * 70}>
                  <div className="benefit-icon"><item.icon size={24} /></div>
                  <h3 className="benefit-title">{item.title}</h3>
                  <p className="benefit-desc">{item.desc}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </>}

      {section === 'gallery' && <>
        <section className="gallery-section" aria-label="Clinic gallery">
          <div className="container">
            <div id="gallery-images" className="gallery-images">
              {GALLERY_IMAGES.map((image, i) => (
                <Reveal as="figure" key={image.src} className="gallery-photo" delay={i * 80}>
                  <img src={image.src} alt={image.alt} loading="lazy" />
                  <figcaption>{image.caption}</figcaption>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </>}

      {section === 'blog' && <>
        <section className="blog" aria-label="Dental care blog">
          <div className="container">
            <div className="blog-grid">
              {BLOG_POSTS.map((post, i) => (
                <Reveal as="article" key={post.title} className="blog-card" delay={i * 100}>
                  <div className="blog-meta"><span className="blog-tag">{post.tag}</span><span className="blog-date">{post.date}</span></div>
                  <h3 className="blog-title">{post.title}</h3>
                  <p className="blog-excerpt">{post.excerpt}</p>
                  {openPost === i && <p className="blog-body">{post.body}</p>}
                  <button type="button" className="blog-link" onClick={() => setOpenPost(openPost === i ? null : i)} aria-expanded={openPost === i}>
                    {openPost === i ? 'Show less' : 'Read more'}
                  </button>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </>}

      {/* CTA band */}
      <section className="section-cta" aria-label="Book your visit">
        <div className="container section-cta-inner">
          <div>
            <h2>Ready when you are</h2>
            <p>Pick a time online in under a minute — no account needed.</p>
          </div>
          <div className="section-cta-actions">
            <a className="btn btn--dark btn--lg" href="#/book">Book Online</a>
            <a className="btn btn--line btn--lg" href="#/">Back to home</a>
          </div>
        </div>
      </section>

      {/* Compact footer */}
      <footer className="page-footer" role="contentinfo">
        <div className="container page-footer-inner">
          <a className="brand landing-brand" href="#/" aria-label="DentEra home"><span className="brand-mark"><DentEraMark /></span> DentEra</a>
          <nav className="page-footer-nav" aria-label="Footer navigation">
            {NAV.map(item => <a key={item.label} href={item.href}>{item.label}</a>)}
          </nav>
        </div>
        <p className="container page-footer-copy">© 2026 DentEra Dental Clinic. All rights reserved.</p>
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
