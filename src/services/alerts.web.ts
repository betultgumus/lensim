import { Alert } from 'react-native';
// React Native Web's Alert is a no-op. Keep confirmations and save errors visible.
Alert.alert = (title, message, buttons) => {
  const text = [title, message].filter(Boolean).join('\n\n');
  const action = buttons?.find(button => button.style !== 'cancel');
  const cancel = buttons?.find(button => button.style === 'cancel');
  if (cancel) { if (window.confirm(text)) action?.onPress?.(); else cancel.onPress?.(); }
  else { window.alert(text); action?.onPress?.(); }
};
