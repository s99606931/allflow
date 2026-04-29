/**
 * ClientForm — quick "새 고객사" capture dialog (CRM 2.2.*).
 */
'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/primitives';
import { Dialog, DialogField, DialogFooter, Select, TextInput } from '@/components/ui/dialog';
import { useClientMutations } from '@/lib/hooks/use-data';
import { useTranslation } from '@/lib/i18n';

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}

const INDUSTRIES = ['SaaS', 'Media', 'Fintech', 'Commerce', 'Healthcare', 'Other'];

export function ClientForm({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const { create } = useClientMutations();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [industry, setIndustry] = useState(INDUSTRIES[0]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    await create.mutateAsync({
      name: name.trim(),
      contact: contact.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      industry,
    });
    setName('');
    setContact('');
    setEmail('');
    setPhone('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('crm.create.title')}>
      <form onSubmit={onSubmit} className="space-y-3">
        <DialogField label={t('crm.create.name')} required>
          <TextInput value={name} onChange={e => setName(e.target.value)} required autoFocus />
        </DialogField>
        <div className="grid grid-cols-2 gap-3">
          <DialogField label={t('crm.create.contact')}>
            <TextInput value={contact} onChange={e => setContact(e.target.value)} />
          </DialogField>
          <DialogField label={t('crm.create.industry')}>
            <Select value={industry} onChange={e => setIndustry(e.target.value)}>
              {INDUSTRIES.map(i => (
                <option key={i} value={i}>{i}</option>
              ))}
            </Select>
          </DialogField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DialogField label={t('crm.create.email')}>
            <TextInput type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </DialogField>
          <DialogField label={t('crm.create.phone')}>
            <TextInput value={phone} onChange={e => setPhone(e.target.value)} />
          </DialogField>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={create.isPending}>
            {create.isPending ? t('common.loading') : t('common.create')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
