jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@expo/vector-icons', () => {
  const React = require('react'); const { Text } = require('react-native');
  return { Ionicons: ({ name }) => React.createElement(Text, { accessible: false }, name) };
});
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('expo-notifications', () => ({
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false },
  Redirect: () => null,
  useIsFocused: () => true,
}));
jest.mock('../../src/services/widgets', () => ({ syncWidgets: jest.fn(async () => {}) }));
jest.mock('../../src/services/notifications', () => ({ syncNotifications: jest.fn(async () => {}), requestNotifications: jest.fn(async () => false) }));
jest.mock('../../src/data/database', () => ({ loadState: jest.fn(), saveState: jest.fn(async () => {}) }));
