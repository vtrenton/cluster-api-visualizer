import React from 'react';
import { Alert, Snackbar } from '@mui/material';

interface AlertMessageProps {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  open: boolean;
  onClose: () => void;
}

const AlertMessage: React.FC<AlertMessageProps> = ({ type, message, open, onClose }) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={onClose} severity={type} variant="filled">
        {message}
      </Alert>
    </Snackbar>
  );
};

export default AlertMessage; 