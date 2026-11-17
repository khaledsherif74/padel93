import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Save, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useCreateOwnerNotaOwnerMutation,
  useGetOwnerNotaOwnersQuery,
  useGetOwnerNotasQuery,
  useLazyGetOwnerNotasQuery,
  useUpdateOwnerNotaMutation,
  useUpdateOwnerNotaOwnerMutation,
} from '../../app/api';
import { errorMessage } from '../../shared/lib/apiError';
import { formatDateTime } from '../../shared/lib/date';
import { formatEgpWithCurrency } from '../../shared/lib/money';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import Card from '../../shared/ui/Card';
import EmptyState from '../../shared/ui/EmptyState';
import ErrorState from '../../shared/ui/ErrorState';
import Input from '../../shared/ui/Input';
import Modal from '../../shared/ui/Modal';
import PageHeader from '../../shared/ui/PageHeader';
import Skeleton from '../../shared/ui/Skeleton';

export default function OwnerNotaManagementPage({ readOnly = false } = {}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const owners = useGetOwnerNotaOwnersQuery(undefined, { skip: readOnly });
  const notas = useGetOwnerNotasQuery({ limit: 100 }, { pollingInterval: 60_000 });
  const [loadNotas, moreNotas] = useLazyGetOwnerNotasQuery();
  const [records, setRecords] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [createOwner, createOwnerState] = useCreateOwnerNotaOwnerMutation();
  const [updateOwner, updateOwnerState] = useUpdateOwnerNotaOwnerMutation();
  const [updateNota, updateNotaState] = useUpdateOwnerNotaMutation();
  const [newOwnerName, setNewOwnerName] = useState('');
  const [editingOwner, setEditingOwner] = useState(null);
  const [editingNota, setEditingNota] = useState(null);
  const [notice, setNotice] = useState('');
  const ownerItems = owners.data?.items ?? [];
  const activeOwners = useMemo(() => ownerItems.filter((owner) => owner.isActive), [ownerItems]);
  useEffect(() => {
    if (!notas.data) return;
    setRecords(notas.data.items ?? []);
    setNextCursor(notas.data.nextCursor ?? null);
  }, [notas.data]);

  async function loadMore() {
    if (!nextCursor || moreNotas.isFetching) return;
    try {
      const page = await loadNotas({ limit: 100, cursor: nextCursor }).unwrap();
      setRecords((current) => {
        const known = new Set(current.map((item) => item.id));
        return [...current, ...(page.items ?? []).filter((item) => !known.has(item.id))];
      });
      setNextCursor(page.nextCursor ?? null);
    } catch (error) {
      setNotice(errorMessage(error, t));
    }
  }

  async function addOwner(event) {
    event.preventDefault();
    if (newOwnerName.trim().length < 2) return;
    try {
      await createOwner({ name: newOwnerName.trim() }).unwrap();
      setNewOwnerName('');
      setNotice(t('owner.notaOwnerAdded'));
    } catch (error) {
      setNotice(errorMessage(error, t));
    }
  }

  async function saveOwner(event) {
    event.preventDefault();
    if (!editingOwner) return;
    try {
      await updateOwner({ id: editingOwner.id, body: { name: editingOwner.name.trim() } }).unwrap();
      setEditingOwner(null);
      setNotice(t('owner.notaOwnerSaved'));
    } catch (error) {
      setNotice(errorMessage(error, t));
    }
  }

  async function toggleOwner(owner) {
    try {
      await updateOwner({ id: owner.id, body: { isActive: !owner.isActive } }).unwrap();
      setNotice(owner.isActive ? t('owner.notaOwnerDisabled') : t('owner.notaOwnerEnabled'));
    } catch (error) {
      setNotice(errorMessage(error, t));
    }
  }

  function openNotaEdit(record) {
    setEditingNota({
      id: record.id,
      ownerId: record.ownerId,
      amount: (record.amount / 100).toFixed(2),
      note: record.note ?? '',
    });
    setNotice('');
  }

  async function saveNota(event) {
    event.preventDefault();
    if (!editingNota) return;
    const amount = Math.round(Number(editingNota.amount) * 100);
    if (!Number.isSafeInteger(amount) || amount <= 0) return;
    try {
      await updateNota({
        id: editingNota.id,
        body: {
          ownerId: editingNota.ownerId,
          amount,
          note: editingNota.note.trim() || null,
        },
      }).unwrap();
      setEditingNota(null);
      setNotice(t('owner.notaRecordSaved'));
    } catch (error) {
      setNotice(errorMessage(error, t));
    }
  }

  const loadError = owners.error || notas.error;

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-5 font-inter text-[#0E1B2B]">
      <PageHeader
        eyebrow={readOnly ? t('accountant.moneySection') : t('owner.notaManagementEyebrow')}
        title={readOnly ? t('owner.notaRecordsTitle') : t('owner.notaManagementTitle')}
        description={readOnly ? t('owner.notaRecordsHint') : t('owner.notaManagementHint')}
      />

      {notice && (
        <p
          role="status"
          className="rounded-xl border border-[#D5DDE7] bg-white px-4 py-3 text-sm text-[#33435A]"
        >
          {notice}
        </p>
      )}
      {loadError && (
        <ErrorState
          title={t('errors.generic')}
          description={errorMessage(loadError, t)}
          onRetry={() => {
            if (!readOnly) owners.refetch();
            notas.refetch();
          }}
        />
      )}

      {!readOnly && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-inter text-lg font-extrabold text-[#002346]">
                {t('owner.notaOwnersTitle')}
              </h2>
              <p className="mt-1 text-xs text-[#64748B]">{t('owner.notaOwnersHint')}</p>
            </div>
            <Badge tone="info">
              {activeOwners.length} {t('owner.notaActive')}
            </Badge>
          </div>

          <Card className="space-y-3 p-4 sm:p-5">
            <form className="flex flex-col gap-2 sm:flex-row" onSubmit={addOwner}>
              <div className="min-w-0 flex-1">
                <Input
                  label={t('owner.notaNewOwner')}
                  value={newOwnerName}
                  onChange={(event) => setNewOwnerName(event.target.value)}
                  maxLength={80}
                />
              </div>
              <div className="sm:self-end">
                <Button
                  type="submit"
                  disabled={createOwnerState.isLoading || newOwnerName.trim().length < 2}
                  loading={createOwnerState.isLoading}
                >
                  <Plus className="size-4" aria-hidden="true" />
                  {t('common.add')}
                </Button>
              </div>
            </form>

            {owners.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : ownerItems.length === 0 ? (
              <EmptyState title={t('owner.notaNoOwners')} description={t('owner.notaOwnersHint')} />
            ) : (
              <ul className="divide-y divide-[#E2E8F0]">
                {ownerItems.map((owner) => (
                  <li
                    key={owner.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#E6EEF8] text-[#0B3B6E]">
                        <UserRound className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-[#002346]">{owner.name}</p>
                        <Badge tone={owner.isActive ? 'success' : 'neutral'}>
                          {owner.isActive ? t('owner.active') : t('owner.inactive')}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="ghost"
                        className="min-h-9 px-3"
                        onClick={() => setEditingOwner({ id: owner.id, name: owner.name })}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                        {t('common.edit')}
                      </Button>
                      <Button
                        variant="ghost"
                        className="min-h-9 px-3"
                        loading={updateOwnerState.isLoading}
                        onClick={() => toggleOwner(owner)}
                      >
                        {owner.isActive ? t('owner.notaDeactivate') : t('owner.notaActivate')}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-inter text-lg font-extrabold text-[#002346]">
              {t('owner.notaRecordsTitle')}
            </h2>
            <p className="mt-1 text-xs text-[#64748B]">{t('owner.notaRecordsHint')}</p>
          </div>
          <Badge>{records.length}</Badge>
        </div>

        {notas.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : records.length === 0 ? (
          <EmptyState title={t('owner.notaNoRecords')} description={t('owner.notaRecordsHint')} />
        ) : (
          <div className="space-y-2">
            {records.map((record) => (
              <Card
                key={record.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-inter font-bold text-[#002346]">
                      {record.owner?.name ?? record.ownerName}
                    </h3>
                    <Badge tone="info">{formatDateTime(record.createdAt, locale)}</Badge>
                  </div>
                  {record.note && (
                    <p className="mt-1 break-words text-sm text-[#4A5A70]">{record.note}</p>
                  )}
                  <p className="mt-1 text-xs text-[#8593A6]">
                    {t('owner.notaRecordedBy', { name: record.recordedBy?.name ?? '—' })}
                    {record.updatedBy?.name
                      ? ` · ${t('owner.notaLastEditedBy', { name: record.updatedBy.name })}`
                      : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                  <p className="font-inter text-lg font-extrabold tabular-nums text-[#002346]">
                    {formatEgpWithCurrency(record.amount, locale)}
                  </p>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      className="min-h-10 px-3"
                      onClick={() => openNotaEdit(record)}
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                      {t('common.edit')}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
            {nextCursor && (
              <div className="pt-2 text-center">
                <Button variant="secondary" onClick={loadMore} loading={moreNotas.isFetching}>
                  {t('common.loadMore')}
                </Button>
              </div>
            )}
          </div>
        )}
      </section>

      {!readOnly && (
        <Modal
          open={Boolean(editingOwner)}
          onClose={() => setEditingOwner(null)}
          title={t('owner.notaEditOwnerTitle')}
        >
          {editingOwner && (
            <form className="space-y-4" onSubmit={saveOwner}>
              <Input
                label={t('owner.notaOwnerName')}
                value={editingOwner.name}
                onChange={(event) =>
                  setEditingOwner((current) => ({ ...current, name: event.target.value }))
                }
                maxLength={80}
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  loading={updateOwnerState.isLoading}
                  disabled={editingOwner.name.trim().length < 2}
                >
                  <Save className="size-4" aria-hidden="true" />
                  {t('common.save')}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setEditingOwner(null)}>
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {!readOnly && (
        <Modal
          open={Boolean(editingNota)}
          onClose={() => setEditingNota(null)}
          title={t('owner.notaEditRecordTitle')}
        >
          {editingNota && (
            <form className="space-y-4" onSubmit={saveNota}>
              <label className="block space-y-1 text-sm font-semibold text-[#4A5A70]">
                <span>{t('staff.notaOwner')}</span>
                <select
                  value={editingNota.ownerId}
                  onChange={(event) =>
                    setEditingNota((current) => ({ ...current, ownerId: event.target.value }))
                  }
                  className="min-h-12 w-full rounded-xl border border-[#D5DDE7] bg-white px-3 text-[#0E1B2B]"
                >
                  {ownerItems.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name}
                      {owner.isActive ? '' : ` · ${t('owner.inactive')}`}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label={t('staff.notaAmount')}
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={editingNota.amount}
                onChange={(event) =>
                  setEditingNota((current) => ({ ...current, amount: event.target.value }))
                }
              />
              <label className="block space-y-1 text-sm font-semibold text-[#4A5A70]">
                <span>{t('staff.notaNote')}</span>
                <textarea
                  value={editingNota.note}
                  onChange={(event) =>
                    setEditingNota((current) => ({ ...current, note: event.target.value }))
                  }
                  maxLength={500}
                  rows={3}
                  className="w-full rounded-xl border border-[#D5DDE7] px-3 py-2 text-[#0E1B2B]"
                />
              </label>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  loading={updateNotaState.isLoading}
                  disabled={
                    !editingNota.ownerId ||
                    !Number.isFinite(Number(editingNota.amount)) ||
                    Number(editingNota.amount) <= 0
                  }
                >
                  <Save className="size-4" aria-hidden="true" />
                  {t('common.save')}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setEditingNota(null)}>
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
