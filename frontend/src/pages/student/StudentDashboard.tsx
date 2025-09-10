import React from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Calendar,
  TrendingUp,
  Eye,
  Megaphone
} from 'lucide-react';
import Button from '../../components/ui/button/Button';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

type Recent = { id: number; title: string; activityType: string; activityDate: string; status: 'approved'|'pending'|'rejected' };
type Trend = { ym: string; c: number };

const StudentDashboard: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const location = useLocation();
  const navigate = useNavigate();

  const [stats, setStats] = React.useState({ totalActivities: 0, pendingReview: 0, approved: 0, rejected: 0 });
  const [recentActivities, setRecent] = React.useState<Recent[]>([]);
  const [trend, setTrend] = React.useState<Trend[]>([]);
  const [announcements, setAnnouncements] = React.useState<Array<{id:number; title:string; content:string; createdAt:string; postedBy?: string}>>([]);
  const search = new URLSearchParams(location.search);
  const initialDays = search.get('days') ? parseInt(search.get('days') as string, 10) : 0;
  const [days, setDays] = React.useState<number>(Number.isFinite(initialDays) ? initialDays : 0);
  const [recentSort, setRecentSort] = React.useState<string>('date_desc');

  React.useEffect(() => {
    const load = async () => {
      try {
        const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
        const token = localStorage.getItem('elog_token') || '';
        const dashUrl = days && days > 0 ? `${base}/student/dashboard?days=${days}` : `${base}/student/dashboard`;
        const res = await fetch(dashUrl, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load dashboard');
        const d = await res.json();
        setStats({ totalActivities: d.totalActivities, pendingReview: d.pendingReview, approved: d.approved, rejected: d.rejected });
        setRecent(d.recentActivities || []);
        setTrend(d.monthlyTrend || []);

        // Announcements
        const ares = await fetch(`${base}/student/announcements`, { headers: { Authorization: `Bearer ${token}` } });
        if (ares.ok) setAnnouncements(await ares.json());
      } catch (e: any) {
        toast.error(e.message || 'Failed to load dashboard');
      }
    };
    load();
    // update URL to reflect selected days
    const p = new URLSearchParams(location.search);
    if (days && days > 0) p.set('days', String(days)); else p.delete('days');
    const qs = p.toString();
    const next = qs ? `?${qs}` : '';
    if (location.search !== next) navigate({ pathname: location.pathname, search: next }, { replace: true });
  }, [days]);


  const months = trend.map(t => t.ym);
  const seriesData = trend.map(t => Number(t.c));

  // Chart for submission trends with theme support
  const submissionTrendOptions: ApexOptions = {
    chart: {
      type: 'line',
      height: 250,
      toolbar: { show: false },
      fontFamily: 'Inter, sans-serif',
      background: 'transparent'
    },
    theme: {
      mode: isDark ? 'dark' : 'light'
    },
    colors: ['#6366F1'],
    stroke: {
      curve: 'smooth',
      width: 3
    },
    xaxis: {
      categories: months.length ? months : ['N/A'],
      labels: {
        style: {
          colors: isDark ? '#9CA3AF' : '#6B7280'
        }
      },
      axisBorder: {
        color: isDark ? '#374151' : '#E5E7EB'
      },
      axisTicks: {
        color: isDark ? '#374151' : '#E5E7EB'
      }
    },
    yaxis: {
      title: { 
        text: 'Activities Submitted',
        style: {
          color: isDark ? '#9CA3AF' : '#6B7280'
        }
      },
      labels: {
        style: {
          colors: isDark ? '#9CA3AF' : '#6B7280'
        }
      }
    },
    grid: {
      borderColor: isDark ? '#374151' : '#E5E7EB'
    },
    markers: {
      size: 6
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light'
    }
  };

  const submissionTrendSeries = [{ name: 'Activities Submitted', data: seriesData.length ? seriesData : [0] }];

  // Status distribution chart with theme support
  const statusDistributionOptions: ApexOptions = {
    chart: {
      type: 'donut',
      height: 250,
      background: 'transparent'
    },
    theme: {
      mode: isDark ? 'dark' : 'light'
    },
    colors: ['#10B981', '#F59E0B', '#EF4444'],
    labels: ['Approved', 'Pending', 'Rejected'],
    legend: {
      position: 'bottom',
      labels: {
        colors: isDark ? '#9CA3AF' : '#6B7280'
      }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            name: {
              color: isDark ? '#F3F4F6' : '#1F2937'
            },
            value: {
              color: isDark ? '#F3F4F6' : '#1F2937'
            }
          }
        }
      }
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light'
    }
  };

  const statusDistributionSeries = [stats.approved, stats.pendingReview, stats.rejected];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'rejected': return <AlertCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // Derived, sorted recent list
  const sortedRecent = React.useMemo(() => {
    const arr = [...recentActivities];
    const [key, dir] = recentSort.split('_') as ['date'|'title'|'status'|'type', 'asc'|'desc'];
    arr.sort((a, b) => {
      let va: any; let vb: any;
      switch (key) {
        case 'title': va = a.title?.toLowerCase() || ''; vb = b.title?.toLowerCase() || ''; break;
        case 'status': va = a.status?.toLowerCase() || ''; vb = b.status?.toLowerCase() || ''; break;
        case 'type': va = a.activityType?.toLowerCase() || ''; vb = b.activityType?.toLowerCase() || ''; break;
        default: va = new Date(a.activityDate).getTime(); vb = new Date(b.activityDate).getTime();
      }
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [recentActivities, recentSort]);

  const statusChip = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Student Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track your activity submissions and progress</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={days} onChange={(e) => setDays(parseInt(e.target.value, 10))} className="h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-800 dark:text-gray-100">
            <option value={0}>All time</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <select value={recentSort} onChange={(e) => setRecentSort(e.target.value)} className="h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-800 dark:text-gray-100">
            <option value="date_desc">Recent: Date ↓</option>
            <option value="date_asc">Recent: Date ↑</option>
            <option value="title_asc">Recent: Title A→Z</option>
            <option value="title_desc">Recent: Title Z→A</option>
            <option value="status_asc">Recent: Status A→Z</option>
            <option value="status_desc">Recent: Status Z→A</option>
            <option value="type_asc">Recent: Type A→Z</option>
            <option value="type_desc">Recent: Type Z→A</option>
          </select>
          <Link to="/student/submit-activity">
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white border-transparent">
              <Plus className="w-4 h-4 mr-2" />
              Submit New Activity
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-lg shadow-md p-6 bg-gradient-to-r from-indigo-500 to-blue-500 text-white transition-transform duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Total Activities</p>
              <p className="text-3xl font-bold">{stats.totalActivities}</p>
            </div>
            <FileText className="w-12 h-12 opacity-90" />
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span className="text-sm opacity-90">{seriesData.length ? seriesData[seriesData.length-1] : 0} this month</span>
          </div>
        </div>

        <div className="rounded-lg shadow-md p-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white transition-transform duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Pending Review</p>
              <p className="text-3xl font-bold">{stats.pendingReview}</p>
            </div>
            <Clock className="w-12 h-12 opacity-90" />
          </div>
          <div className="mt-4 flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            <span className="text-sm opacity-90">Avg. review: 2-3 days</span>
          </div>
        </div>

        <div className="rounded-lg shadow-md p-6 bg-gradient-to-r from-emerald-500 to-green-500 text-white transition-transform duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Approved</p>
              <p className="text-3xl font-bold">{stats.approved}</p>
            </div>
            <CheckCircle className="w-12 h-12 opacity-90" />
          </div>
          <div className="mt-4 flex items-center">
            <CheckCircle className="w-4 h-4 mr-1" />
            <span className="text-sm opacity-90">{stats.totalActivities ? ((stats.approved / stats.totalActivities) * 100).toFixed(0) : 0}% approval rate</span>
          </div>
        </div>

        <div className="rounded-lg shadow-md p-6 bg-gradient-to-r from-rose-500 to-red-500 text-white transition-transform duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Rejected</p>
              <p className="text-3xl font-bold">{stats.rejected}</p>
            </div>
            <AlertCircle className="w-12 h-12 opacity-90" />
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span className="text-sm opacity-90">Review feedback</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submission Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Submission Trend</h3>
          <Chart
            options={submissionTrendOptions}
            series={submissionTrendSeries}
            type="line"
            height={250}
          />
          <div className="mt-3 flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
            <span className="inline-flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full bg-indigo-500"></span> Activities Submitted</span>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Activity Status Distribution</h3>
          <Chart
            options={statusDistributionOptions}
            series={statusDistributionSeries}
            type="donut"
            height={250}
          />
        </div>
      </div>

      {/* Announcements Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <Megaphone className="w-6 h-6 text-blue-500 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Announcements</h3>
        </div>
        <div className="space-y-3">
          {announcements.map(a => (
            <div key={a.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white">{a.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{a.content}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Posted by: {a.postedBy || 'Staff'} • {new Date(a.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
          {announcements.length === 0 && <div className="text-sm text-gray-500 dark:text-gray-400">No announcements.</div>}
        </div>
      </div>

      {/* Recent Logs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity Submissions</h3>
          <Link to={`/student/manage-activities${days && days>0 ? `?days=${days}` : ''}`}>
            <Button variant="indigoOutline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              View All
            </Button>
          </Link>
        </div>
        
        <div className="space-y-4">
          {sortedRecent.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-full ${getStatusColor(activity.status)}`}>
                  {getStatusIcon(activity.status)}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{activity.title}</h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>{activity.activityType}</span>
                    <span>•</span>
                    <span>{activity.activityDate}</span>
                  </div>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${statusChip(activity.status)}`}>
                {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white transition-transform duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Submit New Activity</h3>
              <p className="text-blue-100 text-sm mt-1">Submit a new activity like a conference or paper</p>
            </div>
            <Plus className="w-8 h-8" />
          </div>
          <Link to="/student/submit-activity" className="block mt-4">
            <Button variant="outline" className="bg-white text-blue-600 hover:bg-blue-50 border-white">
              Get Started
            </Button>
          </Link>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-md p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Manage Activities</h3>
              <p className="text-green-100 text-sm mt-1">Browse all your submitted activities</p>
            </div>
            <FileText className="w-8 h-8" />
          </div>
          <Link to="/student/manage-activities" className="block mt-4">
            <Button variant="outline" className="bg-white text-green-600 hover:bg-green-50 border-white">
              View Activities
            </Button>
          </Link>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-md p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Settings</h3>
              <p className="text-purple-100 text-sm mt-1">Manage your account preferences</p>
            </div>
            <Calendar className="w-8 h-8" />
          </div>
          <Link to="/settings" className="block mt-4">
            <Button variant="outline" className="bg-white text-purple-600 hover:bg-purple-50 border-white">
              Configure
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
