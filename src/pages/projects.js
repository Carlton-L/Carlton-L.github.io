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
  min-height: 240px;
  
  @media (min-width: 834px) {
    padding-top: 100px;
    padding-bottom: 0px;
    flex-direction: row;
  }
`;

const TitleContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: flex-start;
  padding: 30px 30px 0px 30px;

  @media (min-width: 834px) {
    flex-direction: row;
    align-items: center;
  }
`;

const Title = styled(motion.h1)`
  ${color}
  font-family: Biennale-Black, sans-serif;
  font-size: 4rem;
  flex-grow: 0;
  max-width: 20.25rem;
  margin-bottom: 16px;

  @media (min-width: 834px) {
    margin-right: 16px;
    max-width: 25rem;
  }
`;

const Subtitle = styled(motion.h2)`
  ${color}
  font-size: 1.125rem;
  max-width: 18.75rem;
`;

const ProjectsPage = () => (
  <MainLayout>
    <Page key="projectspage" initial={{ y: '-70vh' }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 50 }} exit={{ y: '-70vh' }}>
      <Heading backgroundColor="paper">
        <TitleContainer initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <Title color="textPrimary">Projects.</Title>
          <Subtitle color="warning">What I&apos;ve been working on recently:</Subtitle>
        </TitleContainer>
      </Heading>
    </Page>
  </MainLayout>
);

export default ProjectsPage;
