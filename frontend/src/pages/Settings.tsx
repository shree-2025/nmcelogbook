import React from 'react';
import Button from '../components/ui/button/Button';
import { Bell } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Switch from '../components/form/switch/Switch';

const Settings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [emailOptIn, setEmailOptIn] = React.useState<boolean>(true);
  const [notificationsMuted, setNotificationsMuted] = React.useState<boolean>(false);
  const [defaultTheme, setDefaultTheme] = React.useState<'light'|'dark'>(theme);
  const [loading, setLoading] = React.useState<boolean>(false);

  const load = async () => {
    try {
      setLoading(true);
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('elog_token') || '';
      // Determine endpoint by role
      const path = user?.role === 'Staff'
        ? `/staff/${user.id}/settings`
        : `/student/settings`;
      const res = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load settings');
      const data: { emailOptIn: number | boolean; notificationsMuted: number | boolean; defaultTheme: 'light'|'dark' } = await res.json();
      setEmailOptIn(Boolean(data.emailOptIn));
      setNotificationsMuted(Boolean(data.notificationsMuted));
      setDefaultTheme(data.defaultTheme || 'light');
      // apply theme from backend if different
      if (data.defaultTheme && data.defaultTheme !== theme) toggleTheme();
    } catch (e: any) {
      toast.error(e.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const save = async (partial?: Partial<{emailOptIn:boolean;notificationsMuted:boolean;defaultTheme:'light'|'dark'}>) => {
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('elog_token') || '';
      const body = JSON.stringify({ 
        emailOptIn, notificationsMuted, defaultTheme, ...(partial || {})
      });
      const path = user?.role === 'Staff'
        ? `/staff/${user.id}/settings`
        : `/student/settings`;
      const res = await fetch(`${base}${path}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body });
      if (!res.ok) throw new Error('Failed to save settings');
      toast.success('Settings saved');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save settings');
    }
  };

  React.useEffect(() => { if (user) load(); }, [user]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Notification & Email Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <Bell className="w-8 h-8 mr-4 text-brand-500" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Notifications & Email</h2>
          </div>
          <div className="space-y-4 text-sm">
            <Switch
              label="Receive emails"
              checked={emailOptIn}
              onChange={(checked) => { setEmailOptIn(checked); save({ emailOptIn: checked }); }}
              color="blue"
            />
            <Switch
              label="Mute notifications"
              checked={notificationsMuted}
              onChange={(checked) => { setNotificationsMuted(checked); save({ notificationsMuted: checked }); }}
              color="blue"
            />
          </div>
        </div>

        {/* Theme */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Theme</h2>
          <div className="flex items-center gap-3">
            <select value={defaultTheme} onChange={(e) => { const val = e.target.value as 'light'|'dark'; setDefaultTheme(val); if (val !== theme) toggleTheme(); save({ defaultTheme: val }); }} className="h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-800 dark:text-gray-100">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <Button variant="indigoOutline" onClick={() => save()}>Save</Button>
          </div>
        </div>
      </div>
      {loading && <div className="text-sm text-gray-500 dark:text-gray-400">Loading settings...</div>}
    </div>
  );
};

export default Settings;
