import React, { useState } from 'react';
import styled from 'styled-components';
import { color } from 'styled-system';
import { AnimatePresence, motion } from 'framer-motion';

import Button from './button';
import { email } from '../utils/config';

const Wrapper = styled(motion.div)`

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
  min-width: 300px;
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
`;

const Success = styled(motion.div)`
  ${color}
  border-radius: 10px;
  margin: 16px 18px;
  padding: 9px 15px;
  font-weight: bold;
  cursor: default;
`;

const ContactForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const handleSubmit = () => {
    setIsSubmitted(true);
  };
  return (
    <Wrapper initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.25 }}>
      <AnimatePresence exitBeforeEnter>
        {!isOpen && (
        <Button key="contact" color="textPrimary" borderColor="tertiary" onClick={setIsOpen} initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} exit={{ opacity: 0, y: 100 }}>Contact</Button>
        )}
        {isOpen && !isSubmitted && (
        <Form target="frame" key="form" action={`https://formsubmit.co/${email}`} method="POST" initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} exit={{ opacity: 0, y: 100 }}>
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
