import React from 'react';
import styled from 'styled-components';
import { color, layout, space } from 'styled-system';
import { motion } from 'framer-motion';

import MainLayout from '../layout/mainLayout';
import Button from '../components/button';

const Page = styled(motion.div)`
  width: 100vw;
  height: 100vh;
  z-index: 1;
`;

const Hero = styled(motion.section)`
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

const TitleContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: flex-start;
  padding: 30px 30px 0px 30px;
  
  @media (min-width: 834px) {
    padding: 30px 0px 0px 30px;
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
    font-size: 6rem;
    max-width: 25rem;
    margin-bottom: 0;
  }
  `;

const Subtitle = styled(motion.h2)`
  ${color}
  font-size: 1.125rem;
  `;

const IntroContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  padding: 30px 15px 30px 30px
  max-width: 20.25rem;
  
  @media (min-width: 834px) {
    max-width: 25rem;
  }
`;

const Intro = styled(motion.p)`
  ${color}
  max-width: 18rem;
  font-size: 0.875rem;
`;

const Emphasis = styled(motion.span)`
  ${color}
  font-weight: bold;
`;

const Links = styled(motion.div)`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  margin: 20px 0;
`;

const Social = styled(motion.div)`

`;

const IndexPage = () => (
  <MainLayout>
    <Page initial={{ y: -100 }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 100 }}>
      <Hero backgroundColor="paper" initial={{ }}>
        <TitleContainer>
          <Subtitle color="warning">Hello, my name is</Subtitle>
          <Title color="textPrimary">
            Carlton
            Lindsay.
          </Title>
        </TitleContainer>
        <IntroContainer>
          <Intro color="textSecondary">
            {'/*'}
            {' '}
            I'm a self-taught
            <Emphasis color="error"> web developer </Emphasis>
            with a background in hardware
            engineering and product design.
            {' '}
            {'*/'}
          </Intro>
          <Links>
            <Button color="warning" borderColor="primary">
              View Projects
            </Button>
            <Button color="warning" borderColor="secondary">
              View Résumé
            </Button>
          </Links>
        </IntroContainer>
      </Hero>
    </Page>
  </MainLayout>
);

export default IndexPage;
