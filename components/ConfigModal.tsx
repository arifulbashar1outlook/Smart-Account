import React from 'react';

// This component is deprecated as configuration is now hardcoded.
// Kept as a placeholder to prevent import errors in other files.

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return null;
};

export default ConfigModal;