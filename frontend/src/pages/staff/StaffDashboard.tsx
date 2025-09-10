import React from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { Users, FileText, Eye, Megaphone, Calendar, Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import Button from '../../components/ui/button/Button';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const StaffDashboard: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [cards, setCards] = React.useState({ totalStudents: 0, activitiesSubmitted: 0, pendingLogs: 0, approvedLogs: 0, rejectedLogs: 0 });
  const [trend, setTrend] = React.useState<Array<{ ym: string; c: number }>>([]);
  const [monthlyStatusTrend, setMonthlyStatusTrend] = React.useState<Array<{ ym: string; approved: number; pending: number; rejected: number }>>([]);
  const [recentStudentLogs, setRecentStudentLogs] = React.useState<Array<{id:number; title:string; activityType:string; activityDate:string; status:string; studentName?:string;}>>([]);
  const [recentMyActivities, setRecentMyActivities] = React.useState<Array<{id:number; title:string; activityType:string; activityDate:string;}>>([]);
  const [announcements, setAnnouncements] = React.useState<Array<{id:number; title:string; content:string; createdAt:string; postedBy?: string}>>([]);
  const [annFilter, setAnnFilter] = React.useState<'ALL'|'DEPARTMENT'|'STAFF'|'STUDENT'>('ALL');
  const [typeDistribution, setTypeDistribution] = React.useState<Array<{ type: string; c: number }>>([]);
  const [topTypeTrend, setTopTypeTrend] = React.useState<{ types: string[]; points: Array<any> }>({ types: [], points: [] });
  const [pendingQueue, setPendingQueue] = React.useState<Array<{ id:number; title:string; activityType:string; activityDate:string; studentName:string }>>([]);
  const [topStudents, setTopStudents] = React.useState<Array<{ studentId:number; studentName:string; submissions:number }>>([]);

  const search = new URLSearchParams(location.search);
  const initialDays = search.get('days') ? parseInt(search.get('days') as string, 10) : 0;
  const [days, setDays] = React.useState<number>(Number.isFinite(initialDays) ? initialDays : 0);

  React.useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
        const token = localStorage.getItem('elog_token') || '';
        const dashUrl = days && days>0 ? `${base}/staff/${user.id}/dashboard?days=${days}` : `${base}/staff/${user.id}/dashboard`;
        const res = await fetch(dashUrl, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load dashboard');
        const d = await res.json();
        setCards({ totalStudents: d.totalStudents, activitiesSubmitted: d.activitiesSubmitted, pendingLogs: d.pendingLogs || 0, approvedLogs: d.approvedLogs || 0, rejectedLogs: d.rejectedLogs || 0 });
        setTrend(d.monthlyTrend || []);
        setMonthlyStatusTrend(d.monthlyStatusTrend || []);
        setTypeDistribution(d.typeDistribution || []);
        setTopTypeTrend(d.topTypeTrend || { types: [], points: [] });
        setPendingQueue(d.pendingQueue || []);
        setTopStudents(d.topStudents || []);

        // Also fetch recent items
        const recentStudentUrl = days && days>0 ? `${base}/staff/${user.id}/student-logs?days=${days}` : `${base}/staff/${user.id}/student-logs`;
        const recentMyUrl = days && days>0 ? `${base}/staff/${user.id}/logs?days=${days}` : `${base}/staff/${user.id}/logs`;
        const [studentLogsRes, myLogsRes] = await Promise.all([
          fetch(recentStudentUrl, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(recentMyUrl, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (studentLogsRes.ok) {
          const s = await studentLogsRes.json();
          const mapped = (s || []).slice(0, 5).map((it:any) => ({ id: Number(it.id), title: it.title, activityType: it.activityType, activityDate: it.activityDate, status: it.status, studentName: it.studentName }));
          setRecentStudentLogs(mapped);
        }
        if (myLogsRes.ok) {
          const m = await myLogsRes.json();
          const mapped = (m || []).slice(0, 5).map((it:any) => ({ id: Number(it.id), title: it.title, activityType: it.activityType, activityDate: it.activityDate }));
          setRecentMyActivities(mapped);
        }

        // Announcements: combine staff-visible (role=STAFF or ALL) and staff-managed student-targeted
        const [aresStaff, aresManaged] = await Promise.all([
          fetch(`${base}/staff/${user.id}/announcements`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${base}/staff/${user.id}/announcements/managed`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        let ann: any[] = [];
        if (aresStaff.ok) ann = ann.concat(await aresStaff.json());
        if (aresManaged.ok) ann = ann.concat(await aresManaged.json());
        // de-duplicate by id and sort by createdAt desc
        const seen = new Set<number>();
        const merged = ann.filter(a => {
          const id = Number(a.id);
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAnnouncements(merged);
      } catch (e:any) {
        toast.error(e.message || 'Failed to load');
      }
    };
    load();

    // reflect selection in URL
    const p = new URLSearchParams(location.search);
    if (days && days>0) p.set('days', String(days)); else p.delete('days');
    const qs = p.toString();
    const next = qs ? `?${qs}` : '';
    if (location.search !== next) navigate({ pathname: location.pathname, search: next }, { replace: true });
  }, [user, days]);

  // Chart for Student Log Submissions
  const logSubmissionsOptions: ApexOptions = {
    chart: {
      type: 'bar',
      height: 350,
      toolbar: { show: false },
      background: 'transparent',
    },
    theme: {
      mode: isDark ? 'dark' : 'light',
    },
    colors: ['#6366F1'],
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: false,
      },
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      categories: (trend.length ? trend.map(t => t.ym) : ['N/A']),
      labels: {
        style: {
          colors: isDark ? '#9CA3AF' : '#6B7280',
        },
      },
    },
    yaxis: {
      title: {
        text: 'Log Submissions',
        style: {
          color: isDark ? '#9CA3AF' : '#6B7280',
        },
      },
    },
    grid: {
      borderColor: isDark ? '#374151' : '#E5E7EB',
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
    },
  };

  const logSubmissionsSeries = [{ name: 'Logs Submitted', data: (trend.length ? trend.map(t => Number(t.c)) : [0]) }];

  // Stacked chart for status breakdown per month
  const monthsStatus = monthlyStatusTrend.map(t => t.ym);
  const statusStackedOptions: ApexOptions = {
    chart: { type: 'bar', stacked: true, height: 350, background: 'transparent', toolbar: { show: false } },
    theme: { mode: isDark ? 'dark' : 'light' },
    colors: ['#10B981', '#F59E0B', '#EF4444'],
    plotOptions: { bar: { horizontal: false, borderRadius: 4 } },
    dataLabels: { enabled: false },
    xaxis: { categories: monthsStatus.length ? monthsStatus : ['N/A'], labels: { style: { colors: isDark ? '#9CA3AF' : '#6B7280' } } },
    yaxis: { labels: { style: { colors: isDark ? '#9CA3AF' : '#6B7280' } } },
    legend: { position: 'bottom', labels: { colors: isDark ? '#9CA3AF' : '#6B7280' } },
    grid: { borderColor: isDark ? '#374151' : '#E5E7EB' },
    tooltip: { theme: isDark ? 'dark' : 'light' }
  };
  const statusStackedSeries = [
    { name: 'Approved', data: monthlyStatusTrend.map(t => Number(t.approved || 0)) },
    { name: 'Pending', data: monthlyStatusTrend.map(t => Number(t.pending || 0)) },
    { name: 'Rejected', data: monthlyStatusTrend.map(t => Number(t.rejected || 0)) },
  ];

  // Pie chart for activity type distribution
  const typePieOptions: ApexOptions = {
    chart: { type: 'pie', background: 'transparent' },
    theme: { mode: isDark ? 'dark' : 'light' },
    labels: typeDistribution.map(t => t.type || 'Unknown'),
    legend: { position: 'bottom', labels: { colors: isDark ? '#9CA3AF' : '#6B7280' } },
    tooltip: { theme: isDark ? 'dark' : 'light' },
  };
  const typePieSeries = typeDistribution.map(t => Number(t.c || 0));

  // Stacked area for top activity types
  const topTypes = topTypeTrend.types || [];
  const topMonths = (topTypeTrend.points || []).map((p: any) => p.ym);
  const topAreaOptions: ApexOptions = {
    chart: { type: 'area', stacked: true, background: 'transparent', toolbar: { show: false } },
    theme: { mode: isDark ? 'dark' : 'light' },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth' },
    xaxis: { categories: topMonths.length ? topMonths : ['N/A'], labels: { style: { colors: isDark ? '#9CA3AF' : '#6B7280' } } },
    yaxis: { labels: { style: { colors: isDark ? '#9CA3AF' : '#6B7280' } } },
    legend: { position: 'bottom', labels: { colors: isDark ? '#9CA3AF' : '#6B7280' } },
    grid: { borderColor: isDark ? '#374151' : '#E5E7EB' },
    tooltip: { theme: isDark ? 'dark' : 'light' }
  };
  const topAreaSeries = topTypes.map((t) => ({ name: t, data: (topTypeTrend.points || []).map((p: any) => Number(p[t] || 0)) }));

  // Removed status distribution chart and chips per requirement

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Staff Dashboard</h1>
        <div className="flex items-center gap-3">
          <select value={days} onChange={(e) => setDays(parseInt(e.target.value, 10))} className="h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-800 dark:text-gray-100">
            <option value={0}>All time</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Link to="/staff/submit-activity">
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white border-transparent">
              <Plus className="w-4 h-4 mr-2" />
              Submit Activity
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards (Gradient) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-lg shadow-md p-6 bg-gradient-to-r from-indigo-500 to-blue-500 text-white transition-transform duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Total Students</p>
              <p className="text-3xl font-bold">{cards.totalStudents}</p>
            </div>
            <Users className="w-12 h-12 opacity-90" />
          </div>
        </div>
        <div className="rounded-lg shadow-md p-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white transition-transform duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Pending Student Logs</p>
              <p className="text-3xl font-bold">{cards.pendingLogs}</p>
            </div>
            <Clock className="w-12 h-12 opacity-90" />
          </div>
        </div>
        <div className="rounded-lg shadow-md p-6 bg-gradient-to-r from-emerald-500 to-green-500 text-white transition-transform duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Approved Student Logs</p>
              <p className="text-3xl font-bold">{cards.approvedLogs}</p>
            </div>
            <CheckCircle className="w-12 h-12 opacity-90" />
          </div>
        </div>
        <div className="rounded-lg shadow-md p-6 bg-gradient-to-r from-rose-500 to-red-500 text-white transition-transform duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Rejected Student Logs</p>
              <p className="text-3xl font-bold">{cards.rejectedLogs}</p>
            </div>
            <AlertCircle className="w-12 h-12 opacity-90" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="rounded-lg shadow.md p-6 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white transition-transform duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Activities Submitted</p>
              <p className="text-3xl font-bold">{cards.activitiesSubmitted}</p>
            </div>
            <FileText className="w-12 h-12 opacity-90" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Student Log Submissions</h3>
          <Chart options={logSubmissionsOptions} series={logSubmissionsSeries} type="bar" height={350} />
          <div className="mt-3 flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
            <span className="inline-flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full bg-indigo-500"></span> Logs Submitted</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Student Activity Status Trend</h3>
          <Chart options={statusStackedOptions} series={statusStackedSeries} type="bar" height={350} />
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
            <span className="inline-flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full bg-emerald-500"></span> Approved</span>
            <span className="inline-flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full bg-amber-500"></span> Pending</span>
            <span className="inline-flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full bg-rose-500"></span> Rejected</span>
          </div>
        </div>
      </div>

      {/* Type Distribution and Top Types Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Activity Type Distribution</h3>
          <Chart options={typePieOptions} series={typePieSeries} type="pie" height={350} />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Activity Types Trend</h3>
          <Chart options={topAreaOptions} series={topAreaSeries} type="area" height={350} />
        </div>
      </div>

      {/* Pending Queue and Top Students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pending Queue</h3>
          <div className="space-y-3">
            {pendingQueue.map((q) => (
              <div key={q.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{q.title}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">{q.activityType} • {new Date(q.activityDate).toLocaleDateString()} • {q.studentName}</div>
                </div>
              </div>
            ))}
            {pendingQueue.length === 0 && <div className="text-sm text-gray-500 dark:text-gray-400">No pending logs.</div>}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Students</h3>
          <div className="space-y-3">
            {topStudents.map((s, idx) => (
              <div key={s.studentId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold mr-2">#{idx+1}</span>{s.studentName}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{s.submissions} submissions</div>
              </div>
            ))}
            {topStudents.length === 0 && <div className="text-sm text-gray-500 dark:text-gray-400">No data.</div>}
          </div>
        </div>
      </div>

      {/* Recent Student Logs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Student Logs</h3>
          <Link to={`/staff/student-logs${days && days>0 ? `?days=${days}` : ''}`}>
            <Button variant="indigoOutline" size="sm"><Eye className="w-4 h-4 mr-2" />View All</Button>
          </Link>
        </div>
        <div className="space-y-4">
          {recentStudentLogs.map((log) => (
            <div key={log.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <div className="font-medium text-gray-900 dark:text-white">{log.title}</div>
                  <div className="text-xs">{log.activityType} • {new Date(log.activityDate).toLocaleDateString()} • {log.studentName}</div>
                </div>
              </div>
              {/* Status removed from UI */}
            </div>
          ))}
          {recentStudentLogs.length === 0 && <div className="text-sm text-gray-500 dark:text-gray-400">No recent logs.</div>}
        </div>
      </div>

      {/* Recent My Activities */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">My Recent Activities</h3>
          <Link to={`/staff/manage-activities${days && days>0 ? `?days=${days}` : ''}`}>
            <Button variant="indigoOutline" size="sm"><Eye className="w-4 h-4 mr-2" />View All</Button>
          </Link>
        </div>
        <div className="space-y-4">
          {recentMyActivities.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <div className="font-medium text-gray-900 dark:text-white">{a.title}</div>
                <div className="text-xs">{a.activityType} • {new Date(a.activityDate).toLocaleDateString()}</div>
              </div>
              {/* Status removed from UI */}
            </div>
          ))}
          {recentMyActivities.length === 0 && <div className="text-sm text-gray-500 dark:text-gray-400">No recent activities.</div>}
        </div>
      </div>

      {/* Announcements */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Megaphone className="w-6 h-6 text-blue-500 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Announcements</h3>
          </div>
          <select value={annFilter} onChange={(e) => setAnnFilter(e.target.value as any)} className="h-9 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 text-sm text-gray-800 dark:text-gray-100">
            <option value="ALL">All</option>
            <option value="DEPARTMENT">Department</option>
            <option value="STAFF">Staff</option>
            <option value="STUDENT">Student</option>
          </select>
        </div>
        <div className="space-y-3">
          {announcements
            .filter(a => {
              if (annFilter === 'ALL') return true;
              if (annFilter === 'DEPARTMENT') return (a.postedBy || '').toLowerCase() === 'department';
              if (annFilter === 'STAFF') return (a.postedBy || '').toLowerCase() === 'staff';
              if (annFilter === 'STUDENT') return (a as any).role === 'STUDENT';
              return true;
            })
            .map(a => (
            <div key={a.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white">{a.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{a.content}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Posted by: {a.postedBy || 'Staff'} • {new Date(a.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
          {announcements.length === 0 && <div className="text-sm text-gray-500 dark:text-gray-400">No announcements.</div>}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Submit New Activity</h3>
              <p className="text-blue-100 text-sm mt-1">Record your academic/professional activity</p>
            </div>
            <Plus className="w-8 h-8" />
          </div>
          <Link to="/staff/submit-activity" className="block mt-4">
            <Button variant="outline" className="bg-white text-blue-600 hover:bg-blue-50 border-white">Get Started</Button>
          </Link>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-md p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Review Student Logs</h3>
              <p className="text-green-100 text-sm mt-1">Approve or reject submissions</p>
            </div>
            <Eye className="w-8 h-8" />
          </div>
          <Link to="/staff/student-logs" className="block mt-4">
            <Button variant="outline" className="bg-white text-green-600 hover:bg-green-50 border-white">Open</Button>
          </Link>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-md p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Manage My Activities</h3>
              <p className="text-purple-100 text-sm mt-1">Browse and edit your activities</p>
            </div>
            <Calendar className="w-8 h-8" />
          </div>
          <Link to="/staff/manage-activities" className="block mt-4">
            <Button variant="outline" className="bg-white text-purple-600 hover:bg-purple-50 border-white">View</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
