import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();
  
  useEffect(() => {
    // Adding a slight delay or just using replace in useEffect prevents the
    // "Can't perform a React state update on a component that hasn't mounted yet"
    // error that Expo Router's <Redirect> sometimes causes on Web/Fast Refresh.
    router.replace('/(tabs)');
  }, []);

  return null;
}
