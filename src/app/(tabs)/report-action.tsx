// @ts-nocheck
import { View } from 'react-native';

export default function ReportActionScreen() {
  // This screen will never render because the tab press is intercepted in _layout.tsx
  // and redirects to the /report modal. But Expo Router needs this file to exist!
  return <View />;
}
