import PageLayout from '../components/PageLayout';
import { aboutContent } from '../data/content';

function AboutPage() {
  return (
    <PageLayout title="About" description="About Carlton Lindsay — Creative Technologist">
      <div className="container--content">
        <div className="about-page">
          <h1 className="about-title">About</h1>

          <p className="about-intro">{aboutContent.intro}</p>

          <div className="about-content">
            {aboutContent.bio.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          <div className="about-section">
            <h2 className="about-section-title">Experience</h2>
            {aboutContent.experience.map((item, index) => (
              <div key={index} className="experience-item">
                <div className="experience-role">{item.role}</div>
                <div className="experience-company">{item.company}</div>
                <div className="experience-dates">{item.dates}</div>
              </div>
            ))}
          </div>

          <div className="about-section">
            <h2 className="about-section-title">Skills & Expertise</h2>
            <div className="skills-list">
              {aboutContent.skills.map((skill, index) => (
                <span key={index} className="skill-tag">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default AboutPage;
