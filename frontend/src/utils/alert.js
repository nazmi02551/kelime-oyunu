// frontend/src/utils/alert.js
/**
 * Cross-platform alert utility that works on both web and native
 */
import { Alert as RNAlert, Platform } from 'react-native';

const webAlert = (title, message, buttons = [{ text: 'OK' }]) => {
  if (buttons.length === 1 && buttons[0].text === 'OK') {
    // Simple alert
    window.alert(`${title}\n\n${message || ''}`);
    if (buttons[0].onPress) buttons[0].onPress();
  } else if (buttons.length === 2) {
    // Confirm dialog
    const result = window.confirm(`${title}\n\n${message || ''}`);
    const confirmButton = buttons.find(b => b.style !== 'cancel');
    const cancelButton = buttons.find(b => b.style === 'cancel');
    
    if (result) {
      if (confirmButton?.onPress) confirmButton.onPress();
    } else {
      if (cancelButton?.onPress) cancelButton.onPress();
    }
  } else {
    // Multiple buttons - use prompt-like approach
    const buttonLabels = buttons.map((b, i) => `${i + 1}: ${b.text}`).join('\n');
    const choice = window.prompt(`${title}\n\n${message || ''}\n\n${buttonLabels}\n\nBir seçenek numarası girin:`);
    
    if (choice) {
      const index = parseInt(choice) - 1;
      if (index >= 0 && index < buttons.length && buttons[index].onPress) {
        buttons[index].onPress();
      }
    }
  }
};

const Alert = {
  alert: (title, message, buttons, options) => {
    if (Platform.OS === 'web') {
      webAlert(title, message, buttons);
    } else {
      RNAlert.alert(title, message, buttons, options);
    }
  }
};

export default Alert;
