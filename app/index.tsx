import { Redirect } from 'expo-router';
import { useApp } from '../src/state/AppContext';
export default function Index() { return <Redirect href={useApp().state.onboarded ? '/(tabs)' : '/onboarding'}/>; }
