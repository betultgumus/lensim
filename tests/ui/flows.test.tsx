import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { AppProvider, useApp } from '../../src/state/AppContext';
import { defaultState } from '../../src/domain/types';
import { transition } from '../../src/domain/reducer';
import { dateOnly } from '../../src/domain/dates';
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
  state=transition(state,{type:'openPackage',id:'right-package',boxId:'box',eye:'right',date:dateOnly()});
  state=transition(state,{type:'openPackage',id:'left-package',boxId:'box',eye:'left',date:dateOnly()});
  return transition(state,{type:'completeOnboarding'});
}
beforeEach(() => { jest.clearAllMocks(); load.mockResolvedValue(defaultState()); save.mockResolvedValue(undefined); jest.spyOn(Alert,'alert').mockImplementation(()=>{}); });

test('first package saves locally and requests reminders after setup', async () => {
  await show(<Onboarding/>);
  await fireEvent.press(await screen.findByText('İlk paketi kaydet'));
  await waitFor(()=>expect(save.mock.calls.some(([state])=>state.onboarded)).toBe(true));
  const saved=save.mock.calls.at(-1)![0];
  expect(saved.cycles).toHaveLength(0); expect(saved.packages).toHaveLength(2); expect(saved.boxes[0]!.lensesRemaining).toBe(4);
  expect(requestNotifications).toHaveBeenCalledTimes(1);
},15000);

test('one tap marks both eyes and can be corrected', async () => {
  load.mockResolvedValue(established()); await show(<Home/>);
  expect(screen.getAllByLabelText('Sol ve sağ lens kutusu')).toHaveLength(1);
  expect(screen.getByText('SOL · L')).toBeTruthy(); expect(screen.getByText('SAĞ · R')).toBeTruthy();
  await fireEvent.press((await screen.findAllByLabelText('Taktım')).at(-1)!);
  await waitFor(()=>expect(save.mock.calls.at(-1)![0].checkIns).toHaveLength(2));
  expect(save.mock.calls.at(-1)![0].checkIns.every(c=>c.status==='worn')).toBe(true);
  await fireEvent.press((await screen.findAllByLabelText('Takmadım')).at(-1)!);
  await waitFor(()=>expect(save.mock.calls.at(-1)![0].checkIns.every(c=>c.status==='notWorn')).toBe(true));
});

test('failed local save does not mark today as worn', async () => {
  load.mockResolvedValue(established()); save.mockRejectedValueOnce(new Error('Disk dolu')); await show(<Home/>);
  await fireEvent.press((await screen.findAllByLabelText('Taktım')).at(-1)!);
  await waitFor(()=>expect(Alert.alert).toHaveBeenCalledWith('İşlem tamamlanamadı','Disk dolu'));
  expect(screen.getAllByLabelText('Taktım').length).toBeGreaterThan(0);
});

test('long histories render twenty records per page and allow the last page', async () => {
  await show(<PagedList items={Array.from({length:41},(_,i)=>({id:String(i)}))} renderItem={item=><Copy>kayıt-{item.id}</Copy>}/>);
  await screen.findByText('kayıt-0');expect(screen.queryByText('kayıt-20')).toBeNull();
  await fireEvent.press(screen.getByText('Sonraki'));expect(screen.getByText('kayıt-20')).toBeTruthy();
  await fireEvent.press(screen.getByText('Sonraki'));expect(screen.getByText('kayıt-40')).toBeTruthy();
  expect(screen.queryByText('kayıt-20')).toBeNull();
});
