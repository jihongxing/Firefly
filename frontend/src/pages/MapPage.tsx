import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function MapPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('app.title')}</h1>
            <p className="text-sm text-gray-600">{t('app.subtitle')}</p>
          </div>
          <Link
            to="/submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            {t('marker.submit')}
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-96 bg-gray-200 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">地图组件将在这里显示</p>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">附近的标记</h2>
          <p className="text-gray-600">标记列表将在这里显示</p>
        </div>
      </main>
    </div>
  );
}
