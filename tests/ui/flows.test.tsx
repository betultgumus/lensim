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
import Journal from '../../app/features/journal';
import { PagedList, Copy } from '../../src/components/ui';

const load = jest.mocked(loadState), save = jest.mocked(saveState);
function Ready({ children }: React.PropsWithChildren) { const {loading} = useApp(); return loading ? null : children; }
async function show(element: React.ReactNode) { await render(<AppProvider><Ready>{element}</Ready></AppProvider>); }
function established() { return transition(defaultState(), {type:'setup',plan:{kind:'monthly',unit:'months',interval:1},start:dateOnly(),id:'first'}); }
beforeEach(() => { jest.clearAllMocks(); load.mockResolvedValue(defaultState()); save.mockResolvedValue(undefined); jest.spyOn(Alert,'alert').mockImplementation(()=>{}); });

test('first launch completes without requesting notification permission', async () => {
  await show(<Onboarding/>);
  await fireEvent.press(await screen.findByText('Hadi başlayalım'));
  await fireEvent.press(screen.getByText('Devam et'));
  await fireEvent.press(screen.getByText('Şimdilik geç'));
  await waitFor(()=>expect(save.mock.calls.some(([state])=>state.onboarded)).toBe(true));
  const saved=save.mock.calls.at(-1)![0];
  expect(saved.cycles).toHaveLength(1);expect(saved.settings.notifications).toBe(false);
  expect(requestNotifications).not.toHaveBeenCalled();
});
test('replacement and undo operate through the real screen and state queue', async () => {
  const initial=established();load.mockResolvedValue(initial);
  await show(<Home/>);
  await fireEvent.press(await screen.findByText('Lenslerimi değiştirdim'));
  await fireEvent.press(screen.getByText('Evet, kaydet'));
  await screen.findByText('Harika! Yeni döngü başladı.');
  expect(save.mock.calls.at(-1)![0].cycles.filter(c=>c.completed)).toHaveLength(1);
  await fireEvent.press(screen.getByText('Yanlışlıkla yaptım · geri al'));
  await waitFor(()=>expect(save.mock.calls.at(-1)![0].cycles).toEqual(initial.cycles));
});
test('failed persistence never shows a successful replacement', async () => {
  load.mockResolvedValue(established());save.mockRejectedValueOnce(new Error('Disk dolu'));
  await show(<Home/>);
  await fireEvent.press(await screen.findByText('Lenslerimi değiştirdim'));
  await fireEvent.press(screen.getByText('Evet, kaydet'));
  await waitFor(()=>expect(Alert.alert).toHaveBeenCalledWith('İşlem tamamlanamadı','Disk dolu'));
  expect(screen.queryByText('Harika! Yeni döngü başladı.')).toBeNull();
});
test('journal records the entered note and selected feeling', async () => {
  const initial=established();initial.modules.journal=true;load.mockResolvedValue(initial);
  await show(<Journal/>);
  const input=await screen.findByLabelText('Kendine bir not (isteğe bağlı)');
  await fireEvent.changeText(input,'Akşam biraz kuruluk');
  await fireEvent.press(screen.getByText('Kuruluk'));
  await fireEvent.press(screen.getByText('Günlüğüme kaydet'));
  await waitFor(()=>expect(save.mock.calls.at(-1)![0].journal[0]).toMatchObject({note:'Akşam biraz kuruluk',symptoms:['Kuruluk']}));
  expect(await screen.findByText('Akşam biraz kuruluk')).toBeTruthy();
});
test('long histories render twenty records per page and allow the last page', async () => {
  await show(<PagedList items={Array.from({length:41},(_,i)=>({id:String(i)}))} renderItem={item=><Copy>kayıt-{item.id}</Copy>}/>);
  await screen.findByText('kayıt-0');expect(screen.queryByText('kayıt-20')).toBeNull();
  await fireEvent.press(screen.getByText('Sonraki'));expect(screen.getByText('kayıt-20')).toBeTruthy();
  await fireEvent.press(screen.getByText('Sonraki'));expect(screen.getByText('kayıt-40')).toBeTruthy();
  expect(screen.queryByText('kayıt-20')).toBeNull();
});
