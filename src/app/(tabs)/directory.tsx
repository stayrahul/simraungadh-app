// @ts-nocheck
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

export default function DirectoryRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(tabs)/services');
  }, [router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="small" />
    </View>
  );
}
