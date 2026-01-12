import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import Navigation from './Navigation';
import Footer from './Footer';
import { siteConfig } from '../data/content';

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: 'easeIn',
    },
  },
};

function PageLayout({ children, title, description }) {
  const pageTitle = title 
    ? `${title} — ${siteConfig.name}` 
    : siteConfig.title;
  
  const pageDescription = description || siteConfig.description;

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
      </Helmet>
      <Navigation />
      <main>{children}</main>
      <Footer />
    </motion.div>
  );
}

export default PageLayout;
