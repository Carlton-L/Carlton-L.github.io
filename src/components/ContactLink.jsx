import { PlusIcons } from './PlusIcons';

function ContactLink({ label, value, href }) {
  const isExternal = href.startsWith('http');

  return (
    <a
      href={href}
      className="contact-link"
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
    >
      <PlusIcons />
      <span className="contact-link__label">{label}</span>
      <span className="contact-link__value">{value}</span>
      <span className="contact-link__arrow">↗</span>
    </a>
  );
}

export default ContactLink;
