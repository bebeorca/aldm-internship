// src/routes/dashboard/index.tsx
import { useNavigate } from 'react-router';
import { Plus } from 'lucide-react';
import { useDashboardStats } from '../../hooks/useDashboardStats'
import StatCard from '../../components/dashboard/StatCard';
import RecentLettersTable from '../../components/dashboard/RecentLettersTable';
import TemplateCard from '../../components/dashboard/TemplateCard';
import SectionHeader from '../../components/ui/SectionHeader';
import PageLoader from '../../components/ui/PageLoader';
import ErrorAlert from '../../components/ui/ErrorAlert';
import ScreenHeader from '~/components/ui/ScreenHeader';

function formatToday(): string {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { stats, recentLetters, templates, loading, error } = useDashboardStats();

  if (loading) return <PageLoader />;

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <ScreenHeader title="Dashboard" description={formatToday()} />
        <button
          onClick={() => navigate('/dashboard/templates')}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700 transition-colors"
        >
          <Plus size={15} />
          Buat surat baru
        </button>
      </div>

      {/* Error */}
      {error && <div className="mb-6"><ErrorAlert message={error} /></div>}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        <StatCard
          label="Total surat"
          value={stats.total}
          sub="Semua periode"
        />
        <StatCard
          label="Menunggu approval"
          value={stats.pending}
          sub={stats.pending > 0 ? 'Perlu ditinjau' : 'Semua selesai'}
          subColor={stats.pending > 0 ? 'text-amber-500' : 'text-gray-400'}
        />
        <StatCard
          label="Disetujui"
          value={stats.approved}
          sub="Siap dieksport"
          subColor="text-emerald-500"
        />
        <StatCard
          label="Ditolak"
          value={stats.rejected}
          sub="Perlu revisi"
        />
      </div>

      {/* Recent Letters */}
      <div className="mb-8">
        <SectionHeader
          title="Surat terbaru"
          linkLabel="Lihat semua"
          linkTo="/letters"
        />
        <RecentLettersTable letters={recentLetters} />
      </div>

      {/* Templates */}
      <div>
        <SectionHeader
          title="Template tersedia"
          linkLabel="Kelola template"
          linkTo="/templates"
        />
        {templates.length === 0 ? (
          <p className="text-sm text-gray-400">Belum ada template. Hubungi admin.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {templates.map((tpl) => (
              <TemplateCard key={tpl.id} template={tpl} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}