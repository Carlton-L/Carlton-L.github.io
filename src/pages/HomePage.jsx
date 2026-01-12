import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import HeroCanvas from '../components/HeroCanvas';
import CategoryCard from '../components/CategoryCard';
import PinnedItem from '../components/PinnedItem';
import { categories, pinnedItems } from '../data/content';

function HomePage() {
  const location = useLocation();

  useEffect(() => {
    // Check if we need to scroll to a section
    if (location.state?.scrollTo) {
      // Wait for page transition to complete
      const timer = setTimeout(() => {
        const element = document.getElementById(location.state.scrollTo);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 450); // Match the page transition duration

      return () => clearTimeout(timer);
    }
  }, [location.state]);

  return (
    <PageLayout>
      <div className="hero-wrapper">
        <HeroCanvas />
        <div className="container--content">
          <section className="hero">
            <div className="hero-content">
              <div className="hero-intro">
                <p>
                  I design and build at the edges of{' '}
                  <span className="highlight-1">physical</span> and{' '}
                  <span className="highlight-2">digital</span>—devices, apps,
                  frameworks, and experiences that bridge screens, sensors, and
                  environments.
                </p>
                <p>
                  Background in robotics and VR hardware, with a growing focus
                  on AI and immersive tools.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="container--content">
        <div className="plus-grid">
          <div className="plus-grid__inner" style={{ '--columns': 3 }}>
            {categories.map((category) => (
              <CategoryCard key={category.slug} {...category} />
            ))}
          </div>
        </div>

        <section className="pinned-section" id="pinned-work">
          <div className="pinned-header">
            <span className="pinned-title">Pinned Work</span>
            <span className="pinned-count">{pinnedItems.length} projects</span>
          </div>
          <div className="pinned-items">
            {pinnedItems.map((item) => (
              <PinnedItem key={item.slug} {...item} />
            ))}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}

export default HomePage;
