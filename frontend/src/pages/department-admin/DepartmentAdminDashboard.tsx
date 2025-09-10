import React from 'react';
import { Users, FileText, Megaphone } from 'lucide-react';
import ActivityChart from '../../components/charts/ActivityChart';
import StaffDistributionChart from '../../components/charts/StaffDistributionChart';
import toast from 'react-hot-toast';

const DepartmentAdminDashboard: React.FC = () => {
  const [stats, setStats] = React.useState<{ staffCount: number; studentCount: number; pendingLogs: number; approvedLogs: number; rejectedLogs: number; totalLogs: number; announcements: number }>({ staffCount: 0, studentCount: 0, pendingLogs: 0, approvedLogs: 0, rejectedLogs: 0, totalLogs: 0, announcements: 0 });
  const [days, setDays] = React.useState<number>(0);

  React.useEffect(() => {
    const load = async () => {
      try {
        const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
        const token = localStorage.getItem('elog_token') || '';
        const url = days && days>0 ? `${base}/departments/me/dashboard?days=${days}` : `${base}/departments/me/dashboard`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load dashboard');
        const d = await res.json();
        setStats(d);
      } catch (e:any) {
        toast.error(e.message || 'Failed to load');
      }
    };
    load();
  }, [days]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Department Dashboard</h1>
        <div>
          <select value={days} onChange={(e) => setDays(parseInt(e.target.value, 10))} className="h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-800 dark:text-gray-100">
            <option value={0}>All time</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Statistic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Department Staff</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.staffCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <Users className="w-6 h-6 text-green-600 dark:text-green-300" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Students</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.studentCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
              <FileText className="w-6 h-6 text-yellow-600 dark:text-yellow-300" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Student Logs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalLogs}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-full">
              <Megaphone className="w-6 h-6 text-indigo-600 dark:text-indigo-300" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Announcements</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.announcements}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityChart />
        <StaffDistributionChart />
      </div>

      {/* Add charts or tables here if needed */}
    </div>
  );
};

export default DepartmentAdminDashboard;
