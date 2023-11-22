import { Alert } from '@twilio-paste/core/alert';
import { Box } from '@twilio-paste/core/box';
import { Button } from '@twilio-paste/core/button';
import { Input } from '@twilio-paste/core/input';
import { Label } from '@twilio-paste/core/label';
import { Modal, ModalBody, ModalFooter, ModalFooterActions, ModalHeader, ModalHeading } from '@twilio-paste/core/modal';
import { Text } from '@twilio-paste/core/text';
import { TextArea } from '@twilio-paste/core/textarea';
import * as Flex from "@twilio/flex-ui";
import { useCallback, useState } from "react";
import useApi from '../../hooks/useApi';


const MODAL_ID = "smsOutboundModal";

const SendSmsModal = ({ selectedContact, handleClose, manager }) => {

  const { sendOutboundMessage } = useApi({ token: manager.store.getState().flex.session.ssoTokenPayload.token });
  const [message, setMessage] = useState();
  const [isProcessing, setIsProcessing] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [error, setError] = useState();

  const messageChangeHandler = useCallback((event) => {
    setMessage(event.target.value);
  }, []);

  const closeModal = useCallback(() => {
    setMessage(undefined);
    setError(undefined);
    setIsProcessing(false);
    setMessageSent(false);
    handleClose();
  }, [handleClose]);

  const onSubmitHandler = useCallback((event) => {
    event.preventDefault();

    setIsProcessing(true);

    if (selectedContact) {
      sendOutboundMessage({
        To: selectedContact.phone,
        customerName: `${selectedContact.firstname || ''} ${selectedContact.lastname || ''}`.trim(),
        Body: message,
        WorkerFriendlyName: manager.workerClient ? manager.workerClient.name : '',
        KnownAgentRoutingFlag: false,
        OpenChatFlag: true,
        hubspot_contact_id: selectedContact.hs_object_id
      })
        .then(() => setMessageSent(true))
        .catch(() => setError("Error while sending the SMS"))
        .finally(() => setIsProcessing(false));

    }


  }, [selectedContact, manager, message, sendOutboundMessage]);

  if (!selectedContact) {
    return null;
  }

  if (messageSent) {
    return (
      <Modal size="wide" ariaLabelledby={MODAL_ID} isOpen onDismiss={closeModal}>
        <ModalHeader>
          <ModalHeading as="h3" id={MODAL_ID}>Send SMS to {selectedContact.firstname} {selectedContact.lastname}</ModalHeading>
        </ModalHeader>
        <Box as="form" onSubmit={onSubmitHandler}>
          <ModalBody>
            <Alert variant='neutral'>
              <Text as="p">Message successfully sent to {selectedContact.firstname} {selectedContact.lastname}.</Text>
            </Alert>
          </ModalBody>
          <ModalFooter>
            <ModalFooterActions>
              <Button variant="secondary" type='button' onClick={closeModal}>Close</Button>
            </ModalFooterActions>
          </ModalFooter>
        </Box>
      </Modal>
    )
  }

  return (
    <Modal size="wide" ariaLabelledby={MODAL_ID} isOpen onDismiss={closeModal}>
      <ModalHeader>
        <ModalHeading as="h3" id={MODAL_ID}>Send SMS to {selectedContact.firstname} {selectedContact.lastname}</ModalHeading>
      </ModalHeader>
      <Box as="form" onSubmit={onSubmitHandler}>
        <ModalBody>
          {
            error ? (
              <Box marginBottom="space60">
                <Alert variant='error'>
                  <Text as="p">{error}</Text>
                </Alert>
              </Box>
            ) : null
          }
          <Label htmlFor="message" required>Message</Label>
          <TextArea value={message || ''} disabled={isProcessing} placeholder="Write your message here..." onChange={messageChangeHandler} id="message" name="message" required />
        </ModalBody>
        <ModalFooter>
          <ModalFooterActions>
            <Button variant="secondary" type='button' onClick={closeModal}>Cancel</Button>
            <Button variant="primary" type='submit' disabled={isProcessing}>{isProcessing ? 'Sending...' : 'Send'}</Button>
          </ModalFooterActions>
        </ModalFooter>
      </Box>
    </Modal>
  )
}

export default SendSmsModal;