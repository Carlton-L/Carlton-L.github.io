import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PlusIcons } from './PlusIcons';
import TweenText from './TweenText';

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  const handleWorkClick = (e) => {
    e.preventDefault();

    if (isHome) {
      // Already on home, just scroll
      const element = document.getElementById('pinned-work');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Navigate to home with state to trigger scroll
      navigate('/', { state: { scrollTo: 'pinned-work' } });
    }
  };

  return (
    <div className="container--full">
      <nav>
        <Link to="/" className="nav-box logo">
          <PlusIcons />
          <TweenText text="Carlton Lindsay" />
        </Link>
        <div className="nav-box">
          <PlusIcons />
          <ul className="nav-links">
            <li>
              <a href="#pinned-work" onClick={handleWorkClick}>
                <TweenText text="Work" />
              </a>
            </li>
            <li>
              <Link to="/about">
                <TweenText text="About" />
              </Link>
            </li>
            <li>
              <Link to="/contact">
                <TweenText text="Contact" />
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </div>
  );
}

export default Navigation;
