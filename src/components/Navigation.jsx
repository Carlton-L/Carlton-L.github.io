import { Link, useLocation } from 'react-router-dom';
import { PlusIcons } from './PlusIcons';
import TweenText from './TweenText';

function Navigation() {
  const location = useLocation();
  const isHome = location.pathname === '/';

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
              {isHome ? (
                <a href="#pinned-work" className="tween-text">
                  <TweenText text="Work" />
                </a>
              ) : (
                <Link to="/#pinned-work">
                  <TweenText text="Work" />
                </Link>
              )}
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
