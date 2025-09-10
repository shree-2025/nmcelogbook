import React from 'react';
import { ChevronDown, ChevronRight, Users, FileText } from 'lucide-react';
import Button from '../../components/ui/button/Button';
import toast from 'react-hot-toast';

interface StaffSummary {
  staffId: number;
  staffName: string;
  totalLogs: number;
  studentsCount: number;
}

interface StudentCount {
  studentId: number;
  studentName: string;
  staffId: number;
  uploads: number;
}

const StaffUploads: React.FC = () => {
  const [loading, setLoading] = React.useState(false);
  const [staff, setStaff] = React.useState<StaffSummary[]>([]);
  const [students, setStudents] = React.useState<StudentCount[]>([]);
  const [expanded, setExpanded] = React.useState<Record<number, boolean>>({});

  const load = async () => {
    try {
      setLoading(true);
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('elog_token') || '';
      const res = await fetch(`${base}/departments/me/staff-uploads`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setStaff(data.staff || []);
      setStudents(data.students || []);
    } catch (e:any) {
      toast.error(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, []);

  const toggle = (staffId: number) => setExpanded(prev => ({ ...prev, [staffId]: !prev[staffId] }));

  const studentsOf = (sid: number) => students.filter(s => s.staffId === sid);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Staff & Students Uploads</h1>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh'}</Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-3 border-b dark:border-gray-700 flex items-center text-sm font-semibold text-gray-600 dark:text-gray-300">
          <div className="w-6" />
          <div className="w-5/12 flex items-center gap-2"><Users className="w-4 h-4" /> Staff</div>
          <div className="w-3/12">Students</div>
          <div className="w-3/12 flex items-center gap-2"><FileText className="w-4 h-4" /> Total Logs</div>
          <div className="w-1/12 text-right">Actions</div>
        </div>
        {loading && <div className="px-6 py-4 text-sm">Loading...</div>}
        {!loading && staff.length === 0 && <div className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">No staff found.</div>}
        {!loading && staff.map((st) => (
          <div key={st.staffId} className="border-b dark:border-gray-700">
            <div className="px-6 py-3 flex items-center text-sm">
              <button className="w-6 mr-2" onClick={() => toggle(st.staffId)} aria-label="toggle">
                {expanded[st.staffId] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              <div className="w-5/12 font-medium text-gray-800 dark:text-gray-100">{st.staffName}</div>
              <div className="w-3/12">{st.studentsCount}</div>
              <div className="w-3/12">{Number(st.totalLogs)}</div>
              <div className="w-1/12 text-right">
                {/* Placeholder for future actions */}
              </div>
            </div>
            {expanded[st.staffId] && (
              <div className="px-6 pb-4">
                <div className="ml-8">
                  <div className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-2">Students</div>
                  <div className="space-y-2">
                    {studentsOf(st.staffId).map(s => (
                      <div key={s.studentId} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-md px-3 py-2">
                        <div className="text-sm text-gray-800 dark:text-gray-100">{s.studentName}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">Uploads: {s.uploads}</div>
                      </div>
                    ))}
                    {studentsOf(st.staffId).length === 0 && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">No students.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StaffUploads;
