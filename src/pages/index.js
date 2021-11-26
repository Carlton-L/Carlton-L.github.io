import React from 'react';
import styled from 'styled-components';
import { color, layout, space } from 'styled-system';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'gatsby';

import MainLayout from '../layout/mainLayout';
import Button from '../components/button';
import { socialLinks } from '../utils/config';

const Page = styled(motion.div)`
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex-grow: 1;
`;

const Hero = styled(motion.section)`
  ${color}
  padding-top: 80px;
  padding-bottom: 32px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 60%;
  min-height: 460px;
  
  @media (min-width: 834px) {
    padding-top: 100px;
    padding-bottom: 0px;
    flex-direction: row;
  }
`;

const Content = styled(motion.section)`
  min-height: 400px;
  display: flex;
  justify-content: center;
  align-items: flex-end;
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
  ${color}
  display: flex;
  flex-direction: row;
  justify-content: flex-start;

  @media (min-width: 834px) {
    display: none;
  }
`;

const Icon = styled(motion.a)`
  color: inherit;
  padding: 10px;
  &:hover,
  &:focus {
    transform: translateY(-3px);
    color: ${(props) => props.theme.colors.textPrimary};
  }

  svg {
    color: inherit;
    width: 32px;
    height: 32px;

    path { fill: currentColor; }
  }
`;

const IndexPage = () => (
  <MainLayout>
    <Page key="indexpage" initial={{ y: '-70vh' }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 50 }} exit={{ y: '-70vh' }}>
      <Hero backgroundColor="paper">
        <TitleContainer initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <Subtitle color="warning">Hello, my name is</Subtitle>
          <Title color="textPrimary">
            Carlton
            Lindsay.
          </Title>
        </TitleContainer>
        <IntroContainer initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
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
            <Button as={Link} to="/projects" color="warning" borderColor="primary">
              View Projects
            </Button>
            <Button color="warning" borderColor="secondary">
              View Résumé
            </Button>
          </Links>
          <Social color="inactive">
            {
              socialLinks.map(({ name, url, icon }, i) => <Icon href={url} aria-label={name} target="_blank" rel="noreferrer" key={i} dangerouslySetInnerHTML={{ __html: icon }} />)
            }
          </Social>
        </IntroContainer>
      </Hero>
      <Content>
        contact
      </Content>
    </Page>
  </MainLayout>
);

export default IndexPage;
