import { Redirect, useLocalSearchParams } from 'expo-router';
import { useApp } from '../src/state/AppContext';
/** App start and the widget's deep link (`lenstakip:///?page=today`) both land here; the page choice is passed on to the home tab. */
export default function Index() {
  const { page } = useLocalSearchParams<{ page?: string }>();
  if (!useApp().state.onboarded) return <Redirect href="/onboarding"/>;
  return <Redirect href={page === 'today' || page === 'calendar' ? { pathname: '/(tabs)', params: { page } } : '/(tabs)'}/>;
}
