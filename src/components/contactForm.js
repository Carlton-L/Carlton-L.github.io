import React, { useState } from 'react';
import styled from 'styled-components';
import { color } from 'styled-system';
import { AnimatePresence, motion } from 'framer-motion';
import smoothscroll from 'smoothscroll-polyfill';

import Button from './button';

// Polyfill adds suport for smooth scrolling on Safari, Edge, and Opera
if (typeof window !== 'undefined') {
  smoothscroll.polyfill();
}
const Wrapper = styled(motion.div)`
  padding: 8px;
  min-height: 300px;
  min-width: 250px;
`;

const Form = styled(motion.form)`
  max-width: 834px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: flex-start;
  padding: 20px;
`;

const EmailInput = styled(motion.input)`
  ${color}
  min-width: 250px;
  border-radius: 10px;
  font-size: 0.75rem;
  height: 2rem;
  padding: 16px 18px;
  border: none;
  margin: 8px;
  
  &::placeholder {
    color: ${(props) => props.theme.colors.inactive};
  }
  `;

const MessageInput = styled(motion.textarea)`
  ${color}
  min-width: 250px;
  width: 100%;
  border-radius: 10px;
  font-size: 0.75rem;
  height: 7.25rem;
  padding: 16px 18px;
  border: none;
  margin: 8px;
  
  &::placeholder {
    color: ${(props) => props.theme.colors.inactive};
  }

  @media (min-width: 843px) {
    min-width: 350px;
  }
`;

const Success = styled(motion.div)`
  ${color}
  border-radius: 10px;
  margin: 16px 18px;
  padding: 9px 15px;
  font-weight: bold;
  cursor: default;
`;

const Text = styled(motion.div)`
  ${color}
  margin: 8px 20px;
`;

const ButtonWrapper = styled(motion.div)`
  display: flex;
  justify-content: center;
  align-self: flex-start;
  align-items: flex-start;
  height: 100%;
  min-height: 300px;
  
  @media (min-height: 800px) {
    align-items: flex-end;
    align-self: flex-end;
  }
`;

const ContactForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const handleOpen = () => {
    setIsOpen(true);

    // Scroll to bottom of page
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: document.body.scrollHeight, left: 0, behavior: 'smooth' });
    }
  };
  const handleSubmit = () => {
    setIsSubmitted(true);
  };
  return (
    <Wrapper id="contactform" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} exit={{ opacity: 0 }}>
      <AnimatePresence exitBeforeEnter>
        {!isOpen && (
          <ButtonWrapper initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} exit={{ opacity: 0, y: 100 }}>
            <Button key="contact" color="textPrimary" borderColor="tertiary" onClick={handleOpen}>Contact</Button>
          </ButtonWrapper>
        )}
        {isOpen && !isSubmitted && (
          <Form target="frame" key="form" action="https://formsubmit.co/86bcd5317871bc4dd8a1f66b79a3fbe1" method="POST" initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} exit={{ opacity: 0, y: 100 }}>
            <Text color="textPrimary">Get in touch</Text>
            <EmailInput color="textPrimary" backgroundColor="paper" type="text" placeholder="Email Address" name="email" required />
            <MessageInput color="textPrimary" backgroundColor="paper" type="text" placeholder="Your message" name="textarea" required />
            <Button color="tertiary" variant="small" type="submit" onClick={handleSubmit}>Submit</Button>
          </Form>
        )}
        {isOpen && isSubmitted && (
          <Success color="info" backgroundColor="paper" initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} exit={{ opacity: 0, y: 100 }}>Sent!</Success>
        )}
      </AnimatePresence>
      <iframe style={{ display: 'none' }} title="frame" name="frame" />
    </Wrapper>
  );
};

export default ContactForm;
