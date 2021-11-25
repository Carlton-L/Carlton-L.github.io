import React from 'react';
import styled from 'styled-components';
import { color } from 'styled-system';
import { motion } from 'framer-motion';
import MainLayout from '../layout/mainLayout';

const Page = styled(motion.div)`
  width: 100vw;
  height: 100vh;
  z-index: 1;
`;

const Heading = styled(motion.section)`
  ${color}
  padding-top: 80px;
  padding-bottom: 32px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 460px;
  
  @media (min-width: 834px) {
    padding-top: 100px;
    padding-bottom: 0px;
    flex-direction: row;
  }
`;

const ProjectsPage = () => (
  <MainLayout>
    <Page key="projectspage" initial={{ y: '-70vh' }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 50 }} exit={{ y: '-70vh' }}>
      <Heading backgroundColor="paper">
        Content
      </Heading>
    </Page>
  </MainLayout>
);

export default ProjectsPage;
