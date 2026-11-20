import React from 'react';
import { Card, Copy, Screen } from '../../src/components/ui';
import { kvkkSections } from '../../src/domain/privacy';

/** Information notice only. It holds no consent box: reading it is not consent (consent is asked separately). */
export default function Kvkk() {
  return <Screen title="KVKK aydınlatma metni" subtitle="Bilgilendirme amaçlıdır; onay yerine geçmez." back>
    {kvkkSections.map(section => <Card key={section.title} style={{ gap: 6 }}><Copy bold>{section.title}</Copy><Copy size={15}>{section.body}</Copy></Card>)}
  </Screen>;
}
