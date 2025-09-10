import React from 'react';
import { Eye, Edit, Plus, Search, LayoutGrid, List } from 'lucide-react';
import Button from '../../components/ui/button/Button';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Tooltip from '../../components/ui/tooltip/Tooltip';


type Attachment = { url: string; contentType?: string | null; size?: number | null; createdAt?: string };
type Activity = {
  id: number;
  title: string;
  activityType: string;
  activityDate: string;
  status: string;
  facultyRemark?: string | null;
  detailedDescription?: string;
  department?: string;
  levelOfInvolvement?: string;
  patientId?: string;
  ageGender?: string;
  diagnosis?: string;
  createdAt?: string;
  attachments?: Attachment[];
};

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved':
      return <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full dark:bg-green-900 dark:text-green-200">Approved</span>;
    case 'pending':
      return <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full dark:bg-yellow-900 dark:text-yellow-200">Pending</span>;
    case 'rejected':
      return <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full dark:bg-red-900 dark:text-red-200">Rejected</span>;
    default:
      return <span className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 rounded-full dark:bg-gray-700 dark:text-gray-200">{status}</span>;
  }
};

const ManageActivities: React.FC = () => {
  const [items, setItems] = React.useState<Activity[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const navigate = useNavigate();
  const location = useLocation();
  const search = new URLSearchParams(location.search);
  const initialDays = search.get('days') ? parseInt(search.get('days') as string, 10) : 0;
  const [days, setDays] = React.useState<number>(Number.isFinite(initialDays) ? initialDays : 0);
  const [q, setQ] = React.useState<string>(search.get('q') || '');
  const [status, setStatus] = React.useState<string>(search.get('status') || '');
  const [type, setType] = React.useState<string>(search.get('type') || '');
  const [view, setView] = React.useState<'list'|'grid'>((search.get('view') as 'list'|'grid') || 'list');
  const [page, setPage] = React.useState<number>(parseInt(search.get('page') || '1', 10) || 1);
  const [pageSize, setPageSize] = React.useState<number>(parseInt(search.get('pageSize') || '10', 10) || 10);
  const [total, setTotal] = React.useState<number>(0);

  const load = async () => {
    try {
      setLoading(true);
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('elog_token') || '';
      const params = new URLSearchParams();
      if (days && days>0) params.set('days', String(days));
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      if (type) params.set('type', type);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      const url = `${base}/student/logs${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load activities');
      const payload: { items: Array<any>; total: number; page: number; pageSize: number } = await res.json();
      const mapped: Activity[] = payload.items.map((d) => ({
        id: Number(d.id),
        title: d.title,
        activityType: d.activityType,
        activityDate: d.activityDate,
        status: d.status,
        facultyRemark: d.facultyRemark || null,
        detailedDescription: d.detailedDescription || '',
        department: d.department || '',
        levelOfInvolvement: d.levelOfInvolvement || '',
        patientId: d.patientId || '',
        ageGender: d.ageGender || '',
        diagnosis: d.diagnosis || '',
        createdAt: d.createdAt || undefined,
        attachments: Array.isArray(d.attachments) ? d.attachments : [],
      }));
      setItems(mapped);
      setTotal(payload.total || 0);
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
    if (q) p.set('q', q); else p.delete('q');
    if (status) p.set('status', status); else p.delete('status');
    if (type) p.set('type', type); else p.delete('type');
    if (view) p.set('view', view);
    p.set('page', String(page));
    p.set('pageSize', String(pageSize));
    const qs = p.toString();
    const next = qs ? `?${qs}` : '';
    if (location.search !== next) navigate({ pathname: location.pathname, search: next }, { replace: true });
  }, [days, q, status, type, view, page, pageSize]);

  // Persist view in localStorage
  React.useEffect(() => {
    try { localStorage.setItem('student_manage_view', view); } catch {}
  }, [view]);
  React.useEffect(() => {
    const saved = (typeof window !== 'undefined') ? localStorage.getItem('student_manage_view') : null;
    if (saved === 'list' || saved === 'grid') setView(saved);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Removed preview modal flow; we navigate to submit page for preview/edit.

  // Delete action removed per requirement

  return (
    <div className="p-6 overflow-x-hidden">
      <div className="flex justify-between items-center mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manage Activities</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">View or edit your submitted activities.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={days} onChange={(e) => setDays(parseInt(e.target.value, 10))} className="h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-800 dark:text-gray-100">
            <option value={0}>All time</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Link to="/student/submit-activity">
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white border-transparent">
              <Plus className="w-4 h-4 mr-2" />
              Submit New Activity
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters Row */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:flex-wrap gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <div className="relative flex-1 md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => { setPage(1); setQ(e.target.value); }}
              placeholder="Search title, description, or type..."
              className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100"
            />
          </div>
          <Button variant="indigoOutline" size="sm" onClick={() => { setPage(1); load(); }}>Search</Button>
        </div>
        <div className="flex items-center gap-2">
          <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-800 dark:text-gray-100 w-full md:w-auto">
            <option value="">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
          <select value={type} onChange={(e) => { setPage(1); setType(e.target.value); }} className="h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-800 dark:text-gray-100 w-full md:w-auto">
            <option value="">All Types</option>
            <option value="Conference">Conference</option>
            <option value="Seminar">Seminar</option>
            <option value="Workshop">Workshop</option>
            <option value="Paper Publication">Paper Publication</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="flex items-center gap-2 md:ml-auto flex-wrap">
          <Button variant={view==='list' ? 'primary' : 'indigoOutline'} size="sm" onClick={() => setView('list')}><List className="w-4 h-4 mr-2" />List</Button>
          <Button variant={view==='grid' ? 'primary' : 'indigoOutline'} size="sm" onClick={() => setView('grid')}><LayoutGrid className="w-4 h-4 mr-2" />Grid</Button>
        </div>
      </div>

      {view === 'list' ? (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-x-auto">
        <div>
          <table className="min-w-full table-auto text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">Activity Title</th>
                <th scope="col" className="px-6 py-3">Type</th>
                <th scope="col" className="px-6 py-3">Date</th>
                <th scope="col" className="px-6 py-3">Status</th>
                <th scope="col" className="px-6 py-3">Files</th>
                <th scope="col" className="px-6 py-3">Faculty Remark</th>
                <th scope="col" className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-4">Loading...</td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4">No activities found.</td>
                </tr>
              )}
              {!loading && items.map((activity) => (
                <tr key={activity.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-normal break-words dark:text-white">
                    {activity.title}
                  </th>
                  <td className="px-6 py-4 whitespace-normal break-words">{activity.activityType}</td>
                  <td className="px-6 py-4 whitespace-normal break-words">{new Date(activity.activityDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4">{getStatusBadge(activity.status)}</td>
                  <td className="px-6 py-4 whitespace-normal break-words">
                    {activity.attachments && activity.attachments.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                          {activity.attachments.length} file{activity.attachments.length>1?'s':''}
                        </span>
                        {activity.attachments.slice(0, 2).map((a, i) => (
                          <a key={i} href={a.url} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 text-xs underline truncate max-w-[160px]">
                            {new URL(a.url).pathname.split('/').pop()}
                          </a>
                        ))}
                        {activity.attachments.length > 2 && (
                          <span className="text-xs text-gray-500">+{activity.attachments.length - 2} more</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-normal break-words">{activity.facultyRemark || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Tooltip text="Preview">
                        <Button onClick={() => navigate(`/student/submit-activity?editId=${activity.id}`)} variant="indigoOutline" size="icon" className="h-8 w-8">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Tooltip>
                      <Tooltip text={activity.status.toLowerCase() === 'approved' ? 'Cannot edit approved' : 'Edit'}>
                        <span>
                          <Button onClick={() => navigate(`/student/submit-activity?editId=${activity.id}`)} disabled={!(activity.status.toLowerCase() === 'pending' || activity.status.toLowerCase() === 'rejected')} variant="indigoOutline" size="icon" className="h-8 w-8 disabled:opacity-50">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </span>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>}
        {!loading && items.length === 0 && <div className="text-sm text-gray-500 dark:text-gray-400">No activities found.</div>}
        {!loading && items.map((activity) => (
          <div key={activity.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{activity.activityType} • {new Date(activity.activityDate).toLocaleDateString()}</div>
                <div className="text-base font-semibold text-gray-900 dark:text-white mt-1">{activity.title}</div>
              </div>
              <div>{getStatusBadge(activity.status)}</div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-3">{activity.detailedDescription || '-'}</div>
            {activity.attachments && activity.attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {activity.attachments.slice(0,3).map((a, i) => (
                  <a key={i} href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600">
                    {(() => {
                      try { return decodeURIComponent(new URL(a.url).pathname.split('/').pop() || 'file'); } catch { return 'file'; }
                    })()}
                  </a>
                ))}
                {activity.attachments.length > 3 && (
                  <span className="text-xs text-gray-500">+{activity.attachments.length - 3} more</span>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2 mt-3">
              <Button onClick={() => navigate(`/student/submit-activity?editId=${activity.id}`)} variant="indigoOutline" size="sm"><Eye className="w-4 h-4 mr-2" />Preview</Button>
              <Button onClick={() => navigate(`/student/submit-activity?editId=${activity.id}`)} disabled={!(activity.status.toLowerCase() === 'pending' || activity.status.toLowerCase() === 'rejected')} variant="indigoOutline" size="sm"><Edit className="w-4 h-4 mr-2" />Edit</Button>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-600 dark:text-gray-400">Page {page} of {Math.max(1, Math.ceil(total / pageSize))} • {total} results</div>
        <div className="flex items-center gap-2">
          <select value={pageSize} onChange={(e) => { setPage(1); setPageSize(parseInt(e.target.value, 10)); }} className="h-9 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 text-sm text-gray-800 dark:text-gray-100">
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={30}>30 / page</option>
          </select>
          <Button variant="indigoOutline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
          <Button variant="indigoOutline" size="sm" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
      
    </div>
  );
};

export default ManageActivities;
