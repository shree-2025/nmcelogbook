import React from 'react';
import { Building, Users, GraduationCap, BarChart2 } from 'lucide-react';
import DepartmentStaffChart from '../../components/charts/DepartmentStaffChart';
import DepartmentStudentChart from '../../components/charts/DepartmentStudentChart';
import toast from 'react-hot-toast';

const OrganizationAdminDashboard: React.FC = () => {
  const [, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState<Array<{ title: string; value: string; icon: React.ReactNode }>>([]);
  const [announcements, setAnnouncements] = React.useState<Array<{ id: number; title: string; createdAt: string; role: string }>>([]);
  const [departmentData, setDepartmentData] = React.useState<any[]>([]);
  const [departments, setDepartments] = React.useState<Array<{ id: string; name: string; email: string; staffCount: number; studentCount: number; logCount: number }>>([]);

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
        const token = localStorage.getItem('elog_token') || '';
        const res = await fetch(`${base}/org/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load dashboard');
        const d = await res.json();
        setStats([
          { title: 'Total Departments', value: String(d.departments || 0), icon: <Building className="h-8 w-8 text-blue-500" /> },
          { title: 'Total Staff', value: String(d.staff || 0), icon: <Users className="h-8 w-8 text-green-500" /> },
          { title: 'Total Students', value: String(d.students || 0), icon: <GraduationCap className="h-8 w-8 text-yellow-500" /> },
          { title: 'Logs (Total)', value: String(d.logs?.total || 0), icon: <BarChart2 className="h-8 w-8 text-purple-500" /> },
        ]);
        setAnnouncements(d.announcements || []);
        // For charts: you may load per-department data via a separate endpoint later. For now, render empty charts gracefully.
        // Load departments list for cards and charts
        const r2 = await fetch(`${base}/org/departments`, { headers: { Authorization: `Bearer ${token}` } });
        if (r2.ok) {
          const deps = await r2.json();
          const mapped = (deps || []).map((x: any) => ({ id: String(x.id), name: x.name, email: x.email, staffCount: Number(x.staffCount||0), studentCount: Number(x.studentCount||0), logCount: Number(x.logCount||0) }));
          setDepartments(mapped);
          setDepartmentData(mapped.map((m:any) => ({ id: m.id, name: m.name, staffCount: m.staffCount, studentCount: m.studentCount })));
        } else {
          setDepartments([]);
          setDepartmentData([]);
        }
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Organization Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Welcome back, Admin!</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex items-center space-x-4">
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-full">
              {stat.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Announcements */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Announcements</h2>
        </div>
        {announcements.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">No announcements yet.</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {announcements.map(a => (
              <li key={a.id} className="py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{a.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(a.createdAt).toLocaleString()} • {a.role}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <DepartmentStaffChart data={departmentData} />
        <DepartmentStudentChart data={departmentData} />
      </div>

      {/* Departments List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Departments</h2>
        </div>
        {departments.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">No departments yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((d) => (
              <div key={d.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="font-medium text-gray-900 dark:text-white mb-1" title={d.name}>{d.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{d.email}</div>
                <div className="flex items-center gap-4 text-sm text-gray-700 dark:text-gray-300 mb-3">
                  <span>Staff: <strong>{d.staffCount}</strong></span>
                  <span>Students: <strong>{d.studentCount}</strong></span>
                  <span>Logs: <strong>{d.logCount}</strong></span>
                </div>
                <a href={`/organization-admin/department/${d.id}`} className="inline-flex items-center px-3 py-1.5 text-sm rounded bg-indigo-600 hover:bg-indigo-500 text-white">View Department</a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationAdminDashboard;
