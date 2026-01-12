import PageLayout from '../components/PageLayout';
import ContactLink from '../components/ContactLink';
import { contactLinks } from '../data/content';

function ContactPage() {
  return (
    <PageLayout title="Contact" description="Get in touch with Carlton Lindsay">
      <div className="container--content">
        <div className="contact-page">
          <h1 className="contact-title">Get in Touch</h1>
          <p className="contact-intro">
            I'm always interested in discussing new projects, creative
            collaborations, or opportunities to push the boundaries of what's
            possible.
          </p>

          <div className="contact-links">
            {contactLinks.map((link) => (
              <ContactLink key={link.label} {...link} />
            ))}
          </div>

          <div className="contact-availability">
            <h2 className="contact-availability-title">Availability</h2>
            <div className="availability-status">
              <span className="availability-dot" />
              <span className="availability-label">Open to inquiries</span>
            </div>
            <p className="contact-availability-text">
              Currently at Futurity Systems, and always open to interesting
              conversations — whether that's consulting, collaboration, or just
              exchanging ideas.
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default ContactPage;
