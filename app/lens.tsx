import React, { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Copy, Screen } from '../src/components/ui';
import { PlanForm, type PlanDraft } from '../src/components/PlanForm';
import { useApp } from '../src/state/AppContext';
import { dateOnly, getNextReplacementDate } from '../src/domain/dates';
import { scopeLabel, type Scope } from '../src/domain/types';
export default function EditLens() {
  const { scope='both' } = useLocalSearchParams<{ scope:Scope }>(); const { state, dispatch } = useApp();
  const profile = state.profiles.find(p=>p.id===scope); const cycle = state.cycles.find(c=>c.profileId===scope && !c.completed);
  const [draft,setDraft] = useState<PlanDraft>({ plan:profile?.plan ?? { kind:'monthly',unit:'months',interval:1 },start:cycle?.start ?? dateOnly(), due:cycle?.due ?? dateOnly(),manual:cycle ? cycle.due !== getNextReplacementDate(cycle.start,cycle.plan) : false,brand:profile?.brand ?? '',power:profile?.power ?? '' });
  if (!profile) return <Screen title="Lens profili bulunamadı" back><Copy>Önce lens takibini kur.</Copy></Screen>;
  return <Screen title="Lens planın" subtitle={scopeLabel(scope)} back><PlanForm value={draft} onChange={setDraft} details/><Button title="Değişiklikleri kaydet" onPress={async()=>{ await dispatch({ type:'edit',scope,plan:draft.plan,start:draft.start,due:draft.manual ? draft.due : undefined,brand:draft.brand,power:draft.power }); router.back(); }}/></Screen>;
}
