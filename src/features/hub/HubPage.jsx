import { CalendarDays, Clock, ExternalLink, Gift, MessageCircle, WalletCards } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetHubQuery } from '../../app/api';
import { selectRole, selectUser } from '../auth/authSelectors';
import PageHeader from '../../shared/ui/PageHeader';
import Skeleton from '../../shared/ui/Skeleton';
import ErrorState from '../../shared/ui/ErrorState';
import EmptyState from '../../shared/ui/EmptyState';
import { resolveTile } from './hubTile';

const LOOK = {
  finance: { icon: WalletCards, border: 'border-s-navy' },
  attendance: { icon: Clock, border: 'border-s-edge' },
  bookings: { icon: CalendarDays, border: 'border-s-emerald-600' },
  loyalty: { icon: Gift, border: 'border-s-amber-500' },
  bot: { icon: MessageCircle, border: 'border-s-emerald-600' },
};
const FALLBACK_LOOK = { icon: WalletCards, border: 'border-s-navy' };

const TILE_BASE =
  'flex min-h-[132px] min-w-0 flex-col rounded-2xl border border-navy/10 border-s-[6px] bg-white p-4 shadow-card';
const TILE_LINK = `${TILE_BASE} outline-none transition hover:bg-navy/[0.02] focus-visible:ring-2 focus-visible:ring-edge`;

function TileHead({ id, Icon, soon }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-ball text-ball">
          <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
        </div>
        {soon && (
          <span className="rounded-full bg-navy/5 px-2.5 py-1 font-cairo text-[11px] font-bold text-navy/60">
            {t('hub.comingSoon')}
          </span>
        )}
      </div>
      <p className="mt-3 break-words font-cairo text-lg font-black leading-tight text-navy">
        {t(`hub.services.${id}.name`)}
      </p>
      <p className="mt-1 font-tajawal text-xs leading-5 text-navy/55">
        {t(`hub.services.${id}.description`)}
      </p>
    </>
  );
}

function Tile({ tile }) {
  const { t } = useTranslation();
  const look = LOOK[tile.id] ?? FALLBACK_LOOK;
  const { icon: Icon, border } = look;

  if (tile.mode === 'soon') {
    return (
      <div className={`${TILE_BASE} ${border} opacity-60`} aria-disabled="true">
        <TileHead id={tile.id} Icon={Icon} soon />
      </div>
    );
  }
  if (tile.mode === 'internal') {
    return (
      <Link to={tile.path} className={`${TILE_LINK} ${border}`}>
        <TileHead id={tile.id} Icon={Icon} />
      </Link>
    );
  }
  if (tile.links.length === 1) {
    const link = tile.links[0];
    return (
      <a href={link.href} target={link.target} rel={link.rel} className={`${TILE_LINK} ${border}`}>
        <TileHead id={tile.id} Icon={Icon} />
        <span className="mt-auto flex items-center gap-1 pt-2 font-cairo text-xs font-bold text-edge">
          <ExternalLink className="size-3.5" aria-hidden="true" />
          {t('hub.opensNewTab')}
        </span>
      </a>
    );
  }
  return (
    <div className={`${TILE_BASE} ${border} col-span-2 sm:col-span-1`}>
      <TileHead id={tile.id} Icon={Icon} />
      <div className="mt-3 space-y-2">
        {tile.links.map((link) => (
          <a
            key={link.id}
            href={link.href}
            target={link.target}
            rel={link.rel}
            className="flex min-h-11 items-center justify-between gap-2 rounded-xl bg-navy/5 px-3 font-cairo text-sm font-bold text-navy outline-none transition hover:bg-navy/10 focus-visible:ring-2 focus-visible:ring-edge"
          >
            <span className="min-w-0 break-words">{t(`hub.links.${link.id}`)}</span>
            <ExternalLink className="size-4 shrink-0 text-edge" aria-hidden="true" />
          </a>
        ))}
      </div>
    </div>
  );
}

export default function HubPage() {
  const { t } = useTranslation();
  const user = useSelector(selectUser);
  const role = useSelector(selectRole);
  const hub = useGetHubQuery(user?.id, { refetchOnMountOrArgChange: true });
  const tiles = (hub.data?.services ?? []).map(resolveTile).filter(Boolean);

  // R13: STAFF lands on their single tile
  if (!hub.isLoading && !hub.isError) {
    if (role === 'STAFF' && tiles.length === 1 && tiles[0].mode === 'internal') {
      return <Navigate to={tiles[0].path} replace />;
    }
    if (role === 'STAFF' && tiles.length === 0) {
      return <Navigate to="/app/staff" replace />;
    }
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        eyebrow={t('hub.eyebrow')}
        title={t('hub.title')}
        description={t('hub.subtitle')}
      />

      {hub.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[132px]" />
          ))}
        </div>
      ) : hub.isError ? (
        <ErrorState title={t('hub.loadError')} onRetry={() => hub.refetch()} />
      ) : tiles.length === 0 ? (
        <EmptyState title={t('hub.emptyTitle')} description={t('hub.emptyDescription')} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tiles.map((tile) => (
            <Tile key={tile.id} tile={tile} />
          ))}
        </div>
      )}
    </div>
  );
}
