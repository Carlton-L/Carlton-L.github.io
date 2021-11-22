import React, { useState } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';

const variants = {
  open: { opacity: 1, x: 0 },
  closed: { opacity: 0, x: '-100%' },
};

const NavbarMobile = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.nav
      animate={isOpen ? 'open' : 'closed'}
      variants={variants}
    >
      Projects
    </motion.nav>
  );
};

export default NavbarMobile;
