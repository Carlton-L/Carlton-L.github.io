import { Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';

function NotFoundPage() {
  return (
    <PageLayout title="Page Not Found">
      <div className="container--content">
        <div className="not-found-page">
          <div className="not-found-code">404</div>
          <h1 className="not-found-title">Page Not Found</h1>
          <p className="not-found-text">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link to="/" className="not-found-link">
            ← Back to Home
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}

export default NotFoundPage;
