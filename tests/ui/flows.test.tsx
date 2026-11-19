import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { AppProvider, useApp } from '../../src/state/AppContext';
import { defaultState } from '../../src/domain/types';
import { transition } from '../../src/domain/reducer';
import { trackingDay } from '../../src/domain/dates';
import { loadState, saveState } from '../../src/data/database';
import { requestNotifications } from '../../src/services/notifications';
import Onboarding from '../../app/onboarding';
import Home from '../../app/(tabs)/index';
import { PagedList, Copy } from '../../src/components/ui';

const load = jest.mocked(loadState), save = jest.mocked(saveState);
function Ready({ children }: React.PropsWithChildren) { const {loading} = useApp(); return loading ? null : children; }
async function show(element: React.ReactNode) { await render(<AppProvider><Ready>{element}</Ready></AppProvider>); }
function established() {
  let state=transition(defaultState(),{type:'addBox',box:{id:'box',name:'Aylık',brand:'',lensType:'spherical',durationDays:30,lensesTotal:6,lensesRemaining:6,eyes:['right','left'],prescription:{}}});
  state=transition(state,{type:'openPackage',id:'right-package',boxId:'box',eye:'right',date:trackingDay()},trackingDay());
  state=transition(state,{type:'openPackage',id:'left-package',boxId:'box',eye:'left',date:trackingDay()},trackingDay());
  return transition(state,{type:'completeOnboarding'});
}
beforeEach(() => { jest.clearAllMocks(); load.mockResolvedValue(defaultState()); save.mockResolvedValue(undefined); jest.spyOn(Alert,'alert').mockImplementation(()=>{}); });

test('box name is required and explained next to the field', async () => {
  await show(<Onboarding/>);
  await fireEvent.press(await screen.findByText('İlk paketi kaydet'));
  expect(await screen.findByText(/Kutu adı zorunlu/)).toBeTruthy();
  expect(save.mock.calls.some(([state])=>state.onboarded)).toBe(false);
});

test('first package saves locally and requests reminders after setup', async () => {
  await show(<Onboarding/>);
  await fireEvent.changeText(await screen.findByLabelText('Kutu adı, zorunlu'),'1.5 numara mavi kap');
  await fireEvent.press(await screen.findByText('İlk paketi kaydet'));
  await waitFor(()=>expect(save.mock.calls.some(([state])=>state.onboarded)).toBe(true));
  const saved=save.mock.calls.at(-1)![0];
  expect(saved.cycles).toHaveLength(0); expect(saved.packages).toHaveLength(2); expect(saved.boxes[0]!.lensesRemaining).toBe(4);
  expect(requestNotifications).toHaveBeenCalledTimes(1);
},15000);

test('daily question time can be chosen during setup and is saved to the same setting', async () => {
  await show(<Onboarding/>);
  await fireEvent.changeText(await screen.findByLabelText('Kutu adı, zorunlu'),'1.5 numara mavi kap');
  await fireEvent.changeText(screen.getByLabelText('Günlük soru saati'),'20.30');
  expect(await screen.findByText(/Her gün saat 20:30’de sorar/)).toBeTruthy();
  await fireEvent.press(screen.getByText('İlk paketi kaydet'));
  await waitFor(()=>expect(save.mock.calls.some(([state])=>state.onboarded)).toBe(true));
  const saved=save.mock.calls.at(-1)![0];
  expect(saved.settings.notificationTime).toBe('20:30'); expect(saved.settings.nightReminderTime).toBe('23:00');
},15000);

test('one tap marks both eyes and can be corrected', async () => {
  load.mockResolvedValue(established()); await show(<Home/>);
  expect(screen.getAllByLabelText('Sol ve sağ lens kutusu')).toHaveLength(1);
  expect(screen.getByText('SOL · L')).toBeTruthy(); expect(screen.getByText('SAĞ · R')).toBeTruthy();
  await fireEvent.press((await screen.findAllByLabelText('Taktım')).at(-1)!);
  await waitFor(()=>expect(save.mock.calls.at(-1)![0].checkIns).toHaveLength(2));
  expect(save.mock.calls.at(-1)![0].checkIns.every(c=>c.status==='worn')).toBe(true);
  // Answered: today's card and the calendar panel both collapse to "Bugün: Taktım" (same saved record).
  expect(await screen.findAllByText('Bugün: Taktım',{includeHiddenElements:true})).toHaveLength(2);
  expect(screen.queryAllByLabelText('Takmadım',{includeHiddenElements:true})).toHaveLength(0);
  await fireEvent.press(screen.getAllByLabelText('Bugün cevabını değiştir')[0]!);
  await fireEvent.press((await screen.findAllByLabelText('Takmadım')).at(-1)!);
  await waitFor(()=>expect(save.mock.calls.at(-1)![0].checkIns.every(c=>c.status==='notWorn')).toBe(true));
  expect(await screen.findAllByText('Bugün: Takmadım',{includeHiddenElements:true})).toHaveLength(2);
});

test('failed local save does not mark today as worn and explains the lock in Turkish', async () => {
  load.mockResolvedValue(established()); save.mockRejectedValueOnce(new Error('Call to function NativeStatement.finalizeAsync has been rejected. Caused by: Error code 5: database is locked')); await show(<Home/>);
  await fireEvent.press((await screen.findAllByLabelText('Taktım')).at(-1)!);
  await waitFor(()=>expect(Alert.alert).toHaveBeenCalledWith('Kaydedilemedi',expect.stringContaining('Önceki kayıtların korunuyor')));
  expect(JSON.stringify((Alert.alert as jest.Mock).mock.calls)).not.toMatch(/Error code|database is locked/);
  expect(screen.getAllByLabelText('Taktım').length).toBeGreaterThan(0);
});

test('long histories render twenty records per page and allow the last page', async () => {
  await show(<PagedList items={Array.from({length:41},(_,i)=>({id:String(i)}))} renderItem={item=><Copy>kayıt-{item.id}</Copy>}/>);
  await screen.findByText('kayıt-0');expect(screen.queryByText('kayıt-20')).toBeNull();
  await fireEvent.press(screen.getByText('Sonraki'));expect(screen.getByText('kayıt-20')).toBeTruthy();
  await fireEvent.press(screen.getByText('Sonraki'));expect(screen.getByText('kayıt-40')).toBeTruthy();
  expect(screen.queryByText('kayıt-20')).toBeNull();
});
