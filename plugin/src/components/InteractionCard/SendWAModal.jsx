import { Card, Heading, Paragraph, Spinner, Grid, Column } from '@twilio-paste/core';
import { Alert } from '@twilio-paste/core/alert';
import { Box } from '@twilio-paste/core/box';
import { Button } from '@twilio-paste/core/button';
import { Input } from '@twilio-paste/core/input';
import { Label } from '@twilio-paste/core/label';
import { Modal, ModalBody, ModalFooter, ModalFooterActions, ModalHeader, ModalHeading } from '@twilio-paste/core/modal';
import { Text } from '@twilio-paste/core/text';
import { TextArea } from '@twilio-paste/core/textarea';
import * as Flex from "@twilio/flex-ui";
import { useCallback, useEffect, useState } from "react";
import useApi from '../../hooks/useApi';

const MODAL_ID = "smsOutboundModal";

const SendWAModal = ({ selectedContact, handleClose, manager }) => {

  const { sendOutboundMessage, getTemplate } = useApi({ token: manager.store.getState().flex.session.ssoTokenPayload.token });
  const [templateList, setTemplateList] = useState([]);
  const [message, setMessage] = useState();
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [error, setError] = useState();
  const [templateError, setTemplateError] = useState();

  useEffect(() => {
    if (selectedContact) {
      setIsLoadingTemplate(true);
      setTemplateList(undefined);
      setTemplateError(undefined);
      getTemplate({ hubspot_id: selectedContact.hs_object_id })
        .then((data) => { setTemplateList(data) })
        .catch(() => setTemplateError("Error while loading tempaltes"))
        .finally(() => setIsLoadingTemplate(false));
    }
  }, [selectedContact]);

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
        To: `whatsapp:${selectedContact.phone}`,
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
          <ModalHeading as="h3" id={MODAL_ID}>Send WhatsApp Message to {selectedContact.firstname} {selectedContact.lastname}</ModalHeading>
        </ModalHeader>
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
      </Modal>
    )
  }

  if (message) {
    return (
      <Modal size="wide" ariaLabelledby={MODAL_ID} isOpen onDismiss={closeModal}>
        <ModalHeader>
          <ModalHeading as="h3" id={MODAL_ID}>Send Whatsapp Message to {selectedContact.firstname} {selectedContact.lastname}</ModalHeading>
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
            <TextArea value={message} disabled={true} id="message" name="message" required />
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

  if (templateList) {
    return (
      <Modal size="wide" ariaLabelledby={MODAL_ID} isOpen onDismiss={closeModal}>
        <ModalHeader>
          <ModalHeading as="h3" id={MODAL_ID}>Send Whatsapp Message to {selectedContact.firstname} {selectedContact.lastname}</ModalHeading>
        </ModalHeader>
        <ModalBody>
          <Heading as="h4" variant="heading40">Select the template</Heading>
          <Grid gutter="space30" equalColumnHeights>
            {
              templateList.map((item, index) => {
                return (
                  <Column span={4} key={index}>
                    <Box backgroundColor="colorBackgroundPrimaryWeakest" display="flex" flexDirection="column" width="100%" justifyContent="space-between" padding="space50">
                      <Paragraph style={{width: '100%'}}>{item}</Paragraph>
                      <Button variant="primary" type='button' onClick={() => { setMessage(item) }}>Select</Button>
                    </Box>
                  </Column>
                )
              })
            }
          </Grid>
        </ModalBody>
        <ModalFooter>
          <ModalFooterActions>
            <Button variant="secondary" type='button' onClick={closeModal}>Cancel</Button>
          </ModalFooterActions>
        </ModalFooter>
      </Modal>
    )
  } else {
    if (isLoadingTemplate) {
      return (
        <Modal size="wide" ariaLabelledby={MODAL_ID} isOpen onDismiss={closeModal}>
          <ModalHeader>
            <ModalHeading as="h3" id={MODAL_ID}>Send Whatsapp Message to {selectedContact.firstname} {selectedContact.lastname}</ModalHeading>
          </ModalHeader>
          <ModalBody>
            <Paragraph>Loading templates..</Paragraph>
            <Box display="flex" alignItems="center" justifyContent="center" >
              <Spinner size="sizeIcon100" decorative={false} title="Loading" />
            </Box>
          </ModalBody>
          <ModalFooter>
            <ModalFooterActions>
              <Button variant="secondary" type='button' onClick={closeModal}>Cancel</Button>
            </ModalFooterActions>
          </ModalFooter>
        </Modal>
      )
    }

    if (templateError) {
      return (
        <Modal size="wide" ariaLabelledby={MODAL_ID} isOpen onDismiss={closeModal}>
          <ModalHeader>
            <ModalHeading as="h3" id={MODAL_ID}>Send Whatsapp Message to {selectedContact.firstname} {selectedContact.lastname}</ModalHeading>
          </ModalHeader>
          <ModalBody>
            <Box marginBottom="space60">
              <Alert variant='error'>
                <Text as="p">{templateError}</Text>
              </Alert>
            </Box>
          </ModalBody>
          <ModalFooter>
            <ModalFooterActions>
              <Button variant="secondary" type='button' onClick={closeModal}>Cancel</Button>
            </ModalFooterActions>
          </ModalFooter>
        </Modal>
      )
    }
  }

  return null;


}

export default SendWAModal;