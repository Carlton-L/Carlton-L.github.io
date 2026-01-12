import { siteConfig } from '../data/content';

function Footer() {
  const year = new Date().getFullYear();

  return (
    <div className="container--full">
      <footer>
        <span className="footer-text">© {year}</span>
        <div className="footer-links">
          <a href={siteConfig.social.linkedin} target="_blank" rel="noopener noreferrer">
            LinkedIn
          </a>
          <a href={siteConfig.social.github} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a href={`mailto:${siteConfig.social.email}`}>
            Email
          </a>
        </div>
      </footer>
    </div>
  );
}

export default Footer;
