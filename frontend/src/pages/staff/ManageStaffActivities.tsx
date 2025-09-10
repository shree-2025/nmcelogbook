import React from 'react';
import { Eye, Plus } from 'lucide-react';
import Button from '../../components/ui/button/Button';
import Tooltip from '../../components/ui/tooltip/Tooltip';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { useNavigate, useLocation, Link } from 'react-router-dom';

interface StaffLog {
  id: number;
  activityDate: string;
  activityType: string;
  title: string;
  description: string;
  contribution: string;
}

const ManageStaffActivities: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = React.useState<StaffLog[]>([]);
  const [loading, setLoading] = React.useState(false);
  const search = new URLSearchParams(location.search);
  const initialDays = search.get('days') ? parseInt(search.get('days') as string, 10) : 0;
  const [days, setDays] = React.useState<number>(Number.isFinite(initialDays) ? initialDays : 0);

  const load = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('elog_token') || '';
      const url = days && days>0 ? `${base}/staff/${user.id}/logs?days=${days}` : `${base}/staff/${user.id}/logs`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load activities');
      const data: any[] = await res.json();
      const mapped: StaffLog[] = data.map((d) => ({
        id: Number(d.id),
        activityDate: d.activityDate,
        activityType: d.activityType,
        title: d.title,
        description: d.description,
        contribution: d.contribution,
      }));
      setItems(mapped);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
    const p = new URLSearchParams(location.search);
    if (days && days>0) p.set('days', String(days)); else p.delete('days');
    const qs = p.toString();
    const next = qs ? `?${qs}` : '';
    if (location.search !== next) navigate({ pathname: location.pathname, search: next }, { replace: true });
  }, [days]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manage My Activities</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Preview your submissions or create a new activity.</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={days} onChange={(e) => setDays(parseInt(e.target.value, 10))} className="h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-800 dark:text-gray-100">
            <option value={0}>All time</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Link to="/staff/submit-activity">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Activity
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-x-hidden overflow-y-visible">
        <div className="overflow-x-hidden">
          <table className="w-full table-auto text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3 w-2/12">Date</th>
                <th className="px-6 py-3 w-2/12">Type</th>
                <th className="px-6 py-3 w-4/12">Title</th>
                <th className="px-6 py-3 w-2/12 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={4} className="px-6 py-4">Loading...</td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-4">No activities found.</td></tr>
              )}
              {!loading && items.map((it) => (
                <tr key={it.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  <td className="px-6 py-4 whitespace-normal break-words">{new Date(it.activityDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-normal break-words">{it.activityType}</td>
                  <td className="px-6 py-4 whitespace-normal break-words">{it.title}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Tooltip text="Preview / Edit">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(`/staff/submit-activity?editId=${it.id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageStaffActivities;
