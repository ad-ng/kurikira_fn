import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Check, MessageCircle } from 'lucide-react';

const CONTACT_EMAIL = 'info@ngogadigitals.com';
const COMPANY_URL = 'https://www.ngogadigitals.com/';
const WHATSAPP_URL = 'https://wa.me/250782788401';

function ContactLink({ children }: { children?: React.ReactNode }) {
  return <a href={`mailto:${CONTACT_EMAIL}`}>{children || CONTACT_EMAIL}</a>;
}

function SiteHeader({ compact = false }: { compact?: boolean }) {
  return <header className="site-header"><div className="site-header-inner">
    <a className="site-logo" href="/" aria-label="Kurikira home"><img src="/kurikira-logo.png" alt="Kurikira" /></a>
    {!compact && <nav aria-label="Site navigation"><a href="#how">How it works</a><a href="#features">Features</a><a href="#pricing">Pricing</a><a href="#contact">Support</a></nav>}
    <a className="site-header-action" href="/app">Open workspace <ArrowRight size={17} /></a>
  </div></header>;
}

function SiteFooter() {
  return <footer className="site-footer">
    <div className="site-footer-main"><div><img src="/kurikira-logo.png" alt="Kurikira" /><p>From the first comment<br />to the next conversation.</p></div><a className="site-footer-top-link" href="#top">Back to top ↑</a></div>
    <div className="site-footer-bottom"><span>© {new Date().getFullYear()} NGOGA Digitals</span><nav aria-label="Footer navigation"><a href="/#contact">Support</a><a href={COMPANY_URL} target="_blank" rel="noopener noreferrer">NGOGA Digitals ↗</a><a href="/privacy">Privacy policy</a><a href="/terms">Terms & conditions</a></nav></div>
  </footer>;
}

function ContactSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('I need help with Kurikira');
  const [message, setMessage] = useState('');

  function openEmailDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const subject = encodeURIComponent(`Kurikira support: ${topic}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}`);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  }

  return <section className="site-contact" id="contact" aria-labelledby="contact-title">
    <div className="site-contact-layout">
      <div className="site-contact-copy">
        <h2 id="contact-title">We're here<br />to help.</h2>
        <p>Something not working with Kurikira? Tell us what happened and we’ll help you move forward.</p>
        <div className="site-contact-direct"><a className="site-contact-email" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL} ↗</a><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Message us on WhatsApp ↗</a><a href={COMPANY_URL} target="_blank" rel="noopener noreferrer">Visit NGOGA Digitals ↗</a></div>
      </div>
      <form className="site-contact-form" onSubmit={openEmailDraft}>
        <h3>Send us a note</h3>
        <p>We’ll prepare an email with your details. You can review it before sending.</p>
        <label htmlFor="support-name">Name</label><input id="support-name" value={name} onChange={e => setName(e.target.value)} required autoComplete="name" />
        <label htmlFor="support-email">Email</label><input id="support-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
        <label htmlFor="support-topic">What do you need help with?</label><select id="support-topic" value={topic} onChange={e => setTopic(e.target.value)}><option>I need help with Kurikira</option><option>My Instagram connection</option><option>A campaign or private reply</option><option>Privacy or account data</option><option>Something else</option></select>
        <label htmlFor="support-message">Message</label><textarea id="support-message" value={message} onChange={e => setMessage(e.target.value)} rows={5} required minLength={10} placeholder="Tell us what happened and which account or campaign is affected." />
        <button className="site-contact-submit" type="submit">Open email draft <ArrowRight size={18} /></button>
      </form>
    </div>
  </section>;
}

export function Landing() {
  useEffect(() => {
    const target = window.location.hash.slice(1);
    if (target) requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView());
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('site-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12 });
    document.querySelectorAll('.site main h2, .site main h3, .site main section > p, .setup-step, .site-price, .site-contact-form').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return <div id="top" className="site landing-site conversation-pattern">
    <a className="site-skip" href="#main">Skip to content</a>
    <SiteHeader />
    <main id="main">
      <section className="site-hero conversation-pattern" aria-labelledby="site-title">
        <div className="site-hero-copy">
          <h1 id="site-title"><span>They comment.</span><span>You connect.</span></h1>
          <p>Automatically send a private Instagram reply with your link when someone comments your keyword on a Reel.</p>
          <a className="site-button" href="/app">Get started free <ArrowRight size={20} /></a>
          <p className="site-hero-note">No payment details. For Instagram professional accounts.</p>
          <a className="site-text-link" href="#how">See how it works <span aria-hidden="true">↓</span></a>
        </div>
        <div className="hero-orbits" aria-hidden="true">
          <span className="orbit orbit-one" />
          <span className="orbit orbit-two" />
          <span className="orbit-center"><MessageCircle size={38} strokeWidth={1.6} /></span>
        </div>
      </section>
      <section className="site-how site-section" id="how" aria-labelledby="how-title">
        <div className="section-heading"><h2 id="how-title">Your Reel.<br />Your reply.</h2><p>Set up the handoff once. Give each matching comment a clear next step.</p></div>
        <div className="setup-layout">
          <figure className="creator-photo"><img src="/creator-studio.jpg" alt="A creator checking her phone in a sunlit studio" width="1200" height="1000" loading="lazy" /><figcaption>Keep creating. Let your campaign handle the link.</figcaption></figure>
          <ol className="setup-steps">
            <li className="setup-step"><h3>Connect Instagram</h3><p>Authorize your professional account through Meta, then choose a Reel from your account.</p></li>
            <li className="setup-step"><h3>Make it yours</h3><p>Pick a keyword, write your private reply, and add the link you want to share.</p></li>
            <li className="setup-step"><h3>Follow each reply</h3><p>Kurikira requests a private reply for matching comments. Check delivery activity in your workspace.</p></li>
          </ol>
        </div>
      </section>
      <section className="site-features site-section" id="features" aria-labelledby="features-title">
        <div className="site-features-copy"><h2 id="features-title">Less copying.<br />More control.</h2><p>Send the resource or product link they asked for, in the words you choose.</p></div>
        <ul><li><Check size={20} /> Choose exactly which Reel and keyword to use.</li><li><Check size={20} /> Edit your message or pause your campaign.</li><li><Check size={20} /> Review delivered, rejected, and uncertain sends.</li></ul>
      </section>
      <section className="site-pricing site-section conversation-pattern" id="pricing" aria-labelledby="price-title"><div><h2 id="price-title">Start with one Reel.</h2><p>All currently available features are free. Connect your account, create a campaign, and see where the conversation goes.</p></div><div className="site-price"><strong>Free.</strong><p>No payment details required.</p><ul><li>Keyword-based campaigns</li><li>Private replies with your link</li><li>Campaign controls and delivery activity</li></ul><a className="site-button" href="/app">Get started free <ArrowRight size={20} /></a></div></section>
      <section className="site-faq site-section" id="faq"><h2>Before you begin.</h2><div className="site-faq-list"><details open><summary>Which Instagram account do I need?</summary><p>An Instagram professional account that can be connected through Meta. You authorize the connection in Meta’s own flow.</p></details><details><summary>Does every comment get a reply?</summary><p>No. Only comments containing your keyword as a whole word on your selected Reel match. Delivery also depends on Meta’s platform rules and availability.</p></details><details><summary>Can I edit or pause a campaign?</summary><p>Yes. Change the Reel, keyword, message, or link in your workspace, or pause the campaign whenever you need to.</p></details><details><summary>What happens if a reply is not delivered?</summary><p>Review your workspace’s delivery activity for rejected or uncertain sends. Contact support if you need help understanding a result.</p></details></div></section>
      <ContactSection />
    </main>
    <SiteFooter />
  </div>;
}

const privacySections = [
  { title: 'Who we are', body: <p>Kurikira is provided by NGOGA Digitals. This policy explains how we handle information when you use the Kurikira website and Instagram comment-to-private-reply service. For privacy requests, contact us at <ContactLink />.</p> },
  { title: 'Information we handle', body: <p>We process your account email and sign-in credentials; the Instagram account information and access authorization you connect through Meta; Reels and campaign settings you choose; and comment text, comment and media identifiers, delivery status, timestamps, and platform error details needed to run and display the service. We also process technical information needed to operate and secure your session. Please do not put sensitive personal information in campaign messages or links.</p> },
  { title: 'How we use it', body: <p>We use this information to create your workspace, connect your Instagram professional account, identify keyword matches on selected Reels, send the private reply you configure, display delivery activity, troubleshoot failures, protect the service, and respond to support or privacy requests. We do not sell your Instagram data.</p> },
  { title: 'Meta and other service providers', body: <p>Connecting Instagram redirects you through Meta’s authorization process. Kurikira uses Meta’s APIs to access the connected account’s permitted Reels and comment events and to request private replies. Meta’s own terms and privacy practices also apply to your use of Instagram. Hosting, database, and infrastructure providers may process data on our behalf to operate the service.</p> },
  { title: 'Storage, security, and retention', body: <p>We keep information for as long as needed to operate your workspace, maintain delivery records, meet legal obligations, and resolve disputes. Account and Meta authorization data are stored on the server; the browser does not receive the Meta app secret or Instagram access token. We use access controls and other reasonable safeguards, but no online service can guarantee absolute security. If you stop using Kurikira, you may request deletion of your account data, subject to applicable legal and operational requirements.</p> },
  { title: 'Your choices and rights', body: <p>You can pause campaigns and disconnect Kurikira’s access through your Meta settings. You may request access to, correction of, or deletion of personal data, and ask about other rights available under applicable law, by contacting us at <ContactLink />. We may need to verify your identity before acting on a request. People who commented on a connected account may also contact the account owner or us about data processed through Kurikira.</p> },
  { title: 'International processing and changes', body: <p>Service providers or Meta may process information in other countries. Where required, we take steps to protect information transferred across borders. We may update this policy as the service changes; the date below shows the latest version. Material changes will be communicated through the service or another appropriate channel.</p> }
];

const termsSections = [
  { title: 'Using Kurikira', body: <p>Kurikira is a service from NGOGA Digitals for managing keyword-based private replies to comments on selected Instagram Reels. You must be able to enter a binding agreement and have the authority to connect the Instagram professional account you use. You are responsible for your account, password, campaign settings, messages, and links.</p> },
  { title: 'Meta connection and platform rules', body: <p>You authorize Kurikira to use the Instagram permissions you grant through Meta to operate your campaigns. You must comply with Meta’s applicable terms, policies, and messaging rules, and with laws that apply to your campaigns. Do not use the service for spam, misleading messages, unlawful content, or to collect information you are not entitled to collect. Meta may change or limit its APIs, permissions, and delivery behavior.</p> },
  { title: 'Campaigns and delivery', body: <p>A campaign matches a chosen keyword on a selected Reel and requests a private reply containing the message and link you provide. Delivery depends on Meta and other technical factors; we do not promise that every eligible comment will receive a reply. Review your activity log for rejected or uncertain sends. You are responsible for the accuracy and legality of your message and destination link.</p> },
  { title: 'Price', body: <p>Kurikira’s currently available features are free. No payment information is required to create a workspace or use those features.</p> },
  { title: 'Availability and changes', body: <p>We may improve, change, pause, or discontinue parts of the service when needed for security, maintenance, platform changes, or other operational reasons. We aim to provide a reliable service, but it is offered as available, without a guarantee of uninterrupted operation or particular results.</p> },
  { title: 'Your content and our service', body: <p>You keep rights in the campaign content and links you provide. You give us permission to process them only as needed to provide the service. Kurikira’s software, design, and branding remain the property of NGOGA Digitals or its licensors.</p> },
  { title: 'Ending use and responsibility', body: <p>You may stop using the service at any time and revoke access in Meta’s settings. We may suspend access for misuse, security concerns, or legal or platform requirements. To the extent permitted by applicable law, NGOGA Digitals is not responsible for indirect losses or outcomes caused by Meta’s availability, your campaign content, or third-party links. Nothing here limits rights that cannot legally be excluded.</p> },
  { title: 'Questions and updates', body: <p>For questions about these terms, contact <ContactLink />. We may update these terms and will post the revised version here with a new date. Continued use after an update takes effect means you accept the updated terms, where permitted by law.</p> }
];

export function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const privacy = kind === 'privacy';
  const title = privacy ? 'Privacy policy' : 'Terms & conditions';
  const sections = privacy ? privacySections : termsSections;
  return <div id="top" className="site legal-page"><SiteHeader compact /><main><header className="legal-hero"><a href="/">← Back to Kurikira</a><h1>{title}</h1><p>Last updated 10 November 2026</p></header><div className="legal-content"><p className="legal-intro">{privacy ? 'How information moves through Kurikira, and the choices you have.' : 'The conditions for using Kurikira and connecting an Instagram account.'}</p>{sections.map(section => <section key={section.title}><h2>{section.title}</h2>{section.body}</section>)}</div></main><SiteFooter /></div>;
}
