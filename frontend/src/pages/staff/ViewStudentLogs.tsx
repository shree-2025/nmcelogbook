import React from 'react';
import { Eye, CheckCircle, XCircle } from 'lucide-react';
import Button from '../../components/ui/button/Button';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Modal } from '../../components/ui/modal';
import Tooltip from '../../components/ui/tooltip/Tooltip';

type StudentLog = {
  id: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  studentAvatarUrl?: string;
  activityType: string;
  title: string;
  activityDate: string;
  status: string;
  facultyRemark?: string | null;
};

type Attachment = { url: string; contentType?: string | null; size?: number | null; createdAt?: string };
type StudentLogDetail = StudentLog & {
  detailedDescription?: string;
  department?: string;
  levelOfInvolvement?: string;
  patientId?: string;
  ageGender?: string;
  diagnosis?: string;
  createdAt?: string;
  updatedAt?: string;
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

const ViewStudentLogs: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [logs, setLogs] = React.useState<StudentLog[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [previewId, setPreviewId] = React.useState<number | null>(null);
  const [selectedLog, setSelectedLog] = React.useState<StudentLogDetail | null>(null);
  const search = new URLSearchParams(location.search);
  const initialDays = search.get('days') ? parseInt(search.get('days') as string, 10) : 0;
  const initialStudentId = search.get('studentId') || '';
  const [days, setDays] = React.useState<number>(Number.isFinite(initialDays) ? initialDays : 0);
  const [studentId] = React.useState<string>(initialStudentId);

  const load = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('elog_token') || '';
      const qs: string[] = [];
      if (days && days>0) qs.push(`days=${days}`);
      if (studentId) qs.push(`studentId=${encodeURIComponent(studentId)}`);
      const url = `${base}/staff/${user.id}/student-logs${qs.length ? `?${qs.join('&')}` : ''}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load logs');
      const data: Array<any> = await res.json();
      const mapped: StudentLog[] = data.map((d) => ({
        id: Number(d.id),
        studentId: Number(d.studentId),
        studentName: d.studentName,
        studentEmail: d.studentEmail,
        studentAvatarUrl: d.studentAvatarUrl,
        activityType: d.activityType,
        title: d.title,
        activityDate: d.activityDate,
        status: d.status,
        facultyRemark: d.facultyRemark || null,
      }));
      setLogs(mapped);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
    const p = new URLSearchParams(location.search);
    if (days && days>0) p.set('days', String(days)); else p.delete('days');
    if (studentId) p.set('studentId', studentId); else p.delete('studentId');
    const qs = p.toString();
    const next = qs ? `?${qs}` : '';
    if (location.search !== next) navigate({ pathname: location.pathname, search: next }, { replace: true });
  }, [days, studentId]);

  // Load a single log with attachments when preview opens
  React.useEffect(() => {
    const run = async () => {
      if (!user || previewId == null) { setSelectedLog(null); return; }
      try {
        const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
        const token = localStorage.getItem('elog_token') || '';
        const res = await fetch(`${base}/staff/${user.id}/student-logs/${previewId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load log details');
        const d = await res.json();
        setSelectedLog({
          id: Number(d.id),
          studentId: Number(d.studentId),
          studentName: d.studentName,
          studentEmail: d.studentEmail,
          activityType: d.activityType,
          title: d.title,
          activityDate: d.activityDate,
          status: d.status,
          facultyRemark: d.facultyRemark || null,
          detailedDescription: d.detailedDescription || '',
          department: d.department || '',
          levelOfInvolvement: d.levelOfInvolvement || '',
          patientId: d.patientId || '',
          ageGender: d.ageGender || '',
          diagnosis: d.diagnosis || '',
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
          attachments: Array.isArray(d.attachments) ? d.attachments : [],
        });
      } catch (e: any) {
        toast.error(e.message || 'Failed to load log details');
        setSelectedLog(null);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewId]);

  const review = async (logId: number, action: 'approve' | 'reject') => {
    if (!user) return;
    const remark = window.prompt(action === 'approve' ? 'Optional remark (required)' : 'Reason for rejection (required)');
    if (!remark) {
      toast.error('Remark is required');
      return;
    }
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('elog_token') || '';
      const res = await fetch(`${base}/staff/${user.id}/student-logs/${logId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, remark }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to update');
      }
      toast.success(action === 'approve' ? 'Approved' : 'Rejected');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Review Student Logs</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Approve, reject, or view details of student-submitted activities.</p>
          {studentId && (
            <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Filtered by Student ID: {studentId}</div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <select value={days} onChange={(e) => setDays(parseInt(e.target.value, 10))} className="h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-800 dark:text-gray-100">
            <option value={0}>All time</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-x-hidden overflow-y-visible">
        <div className="overflow-x-hidden">
          <table className="w-full table-auto text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3 w-2/12">Student Name</th>
                <th scope="col" className="px-6 py-3 w-3/12">Activity Title</th>
                <th scope="col" className="px-6 py-3 w-2/12">Type</th>
                <th scope="col" className="px-6 py-3 w-1/12">Date</th>
                <th scope="col" className="px-6 py-3 w-1/12">Status</th>
                <th scope="col" className="px-6 py-3 w-2/12">Remark</th>
                <th scope="col" className="px-6 py-3 w-1/12 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="px-6 py-4">Loading...</td></tr>
              )}
              {!loading && logs.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-4">No logs found.</td></tr>
              )}
              {!loading && logs.map((log) => (
                <tr key={log.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-normal break-words dark:text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-xs text-gray-600">
                        {log.studentAvatarUrl ? (
                          // eslint-disable-next-line jsx-a11y/img-redundant-alt
                          <img src={log.studentAvatarUrl} alt={`${log.studentName} avatar`} className="w-full h-full object-cover" />
                        ) : (
                          <span>{(log.studentName || 'U').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <span>{log.studentName}</span>
                    </div>
                  </th>
                  <td className="px-6 py-4 whitespace-normal break-words">{log.title}</td>
                  <td className="px-6 py-4 whitespace-normal break-words">{log.activityType}</td>
                  <td className="px-6 py-4 whitespace-normal break-words">{new Date(log.activityDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4">{getStatusBadge(log.status)}</td>
                  <td className="px-6 py-4 whitespace-normal break-words">{log.facultyRemark || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Tooltip text="Preview">
                        <Button onClick={() => setPreviewId(log.id)} variant="outline" size="icon" className="h-8 w-8">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Tooltip>
                      <Tooltip text={log.status.toLowerCase() !== 'pending' ? 'Only pending logs can be approved' : 'Approve'}>
                        <span>
                          <Button disabled={log.status.toLowerCase() !== 'pending'} onClick={() => review(log.id, 'approve')} variant="success" size="icon" className="h-8 w-8 disabled:opacity-50">
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        </span>
                      </Tooltip>
                      <Tooltip text={log.status.toLowerCase() !== 'pending' ? 'Only pending logs can be rejected' : 'Reject'}>
                        <span>
                          <Button disabled={log.status.toLowerCase() !== 'pending'} onClick={() => review(log.id, 'reject')} variant="destructive" size="icon" className="h-8 w-8 disabled:opacity-50">
                            <XCircle className="w-4 h-4" />
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

      {/* Preview Modal */}
      <Modal isOpen={previewId !== null} onClose={() => setPreviewId(null)} title="Log Preview">
        {!selectedLog ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Student</div>
                <div className="text-sm text-gray-900 dark:text-gray-100 break-words">{selectedLog.studentName} ({selectedLog.studentEmail})</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Date</div>
                <div className="text-sm text-gray-900 dark:text-gray-100 break-words">{new Date(selectedLog.activityDate).toLocaleDateString()}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Type</div>
                <div className="text-sm text-gray-900 dark:text-gray-100 break-words">{selectedLog.activityType}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Title</div>
                <div className="text-sm text-gray-900 dark:text-gray-100 break-words">{selectedLog.title}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Department / Subject</div>
                <div className="text-sm text-gray-900 dark:text-gray-100 break-words">{selectedLog.department || '-'}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Level of Involvement</div>
                <div className="text-sm text-gray-900 dark:text-gray-100 break-words">{selectedLog.levelOfInvolvement || '-'}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Patient / Case ID</div>
                <div className="text-sm text-gray-900 dark:text-gray-100 break-words">{selectedLog.patientId || '-'}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Age / Gender</div>
                <div className="text-sm text-gray-900 dark:text-gray-100 break-words">{selectedLog.ageGender || '-'}</div>
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Diagnosis / Topic</div>
                <div className="text-sm text-gray-900 dark:text-gray-100 break-words">{selectedLog.diagnosis || '-'}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Status</div>
                <div className="text-sm text-gray-900 dark:text-gray-100 break-words">{getStatusBadge(selectedLog.status)}</div>
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Faculty Remark</div>
                <div className="text-sm text-gray-900 dark:text-gray-100 break-words">{selectedLog.facultyRemark || '-'}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Detailed Description</div>
                <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{selectedLog.detailedDescription || '-'}</div>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Attachments</div>
              {selectedLog.attachments && selectedLog.attachments.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {selectedLog.attachments.map((a, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 border border-gray-200 dark:border-gray-700 rounded px-3 py-2">
                      <div className="min-w-0">
                        <a href={a.url} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 underline break-all">
                          {(() => { try { return decodeURIComponent(new URL(a.url).pathname.split('/').pop() || a.url); } catch { return a.url; } })()}
                        </a>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {(a.contentType || '').toString()} {a.size ? `• ${(a.size/1024).toFixed(1)} KB` : ''}
                        </div>
                      </div>
                      <a href={a.url} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm">Open</Button>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">No attachments for this log.</div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ViewStudentLogs;
