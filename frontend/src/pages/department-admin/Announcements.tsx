import React from 'react';
import { Megaphone, Edit, Trash2 } from 'lucide-react';
import Button from '../../components/ui/button/Button';
import { useModal } from '../../hooks/useModal';
import { Modal } from '../../components/ui/modal';
import toast from 'react-hot-toast';

const Announcements: React.FC = () => {
  const { isOpen: isAnnouncementModalOpen, openModal: openAnnouncementModal, closeModal: closeAnnouncementModal } = useModal();
  const [items, setItems] = React.useState<Array<{ id:number; title:string; content:string; createdAt:string; postedBy?: string; role?: 'ALL'|'STUDENT'|'STAFF' }>>([]);
  const [current, setCurrent] = React.useState<{ id?: number; title: string; content: string; audience: 'ALL'|'STUDENT'|'STAFF' } | null>(null);

  const load = async () => {
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('elog_token') || '';
      const res = await fetch(`${base}/departments/me/announcements`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load announcements');
      setItems(await res.json());
    } catch (e:any) {
      toast.error(e.message || 'Failed to load');
    }
  };

  React.useEffect(() => { load(); }, []);

  const handleCreate = () => {
    setCurrent({ title: '', content: '', audience: 'ALL' });
    openAnnouncementModal();
  };

  const handleEdit = (a: { id:number; title:string; content:string; role?: 'ALL'|'STUDENT'|'STAFF' }) => {
    setCurrent({ id: a.id, title: a.title, content: a.content, audience: a.role || 'ALL' });
    openAnnouncementModal();
  };

  const handleDelete = async (id: number) => {
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('elog_token') || '';
      const res = await fetch(`${base}/departments/me/announcements/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to delete');
      setItems(prev => prev.filter(x => x.id !== id));
      toast.success('Announcement deleted');
    } catch (e:any) {
      toast.error(e.message || 'Delete failed');
    }
  };

  const handleSave = async () => {
    if (!current) return;
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('elog_token') || '';
      if (current.id) {
        const res = await fetch(`${base}/departments/me/announcements/${current.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title: current.title, content: current.content, audience: current.audience })
        });
        if (!res.ok) throw new Error('Update failed');
        setItems(prev => prev.map(x => x.id === current.id ? { ...x, title: current.title, content: current.content } : x));
        toast.success('Announcement updated');
      } else {
        const res = await fetch(`${base}/departments/me/announcements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title: current.title, content: current.content, audience: current.audience })
        });
        if (!res.ok) throw new Error('Create failed');
        const data = await res.json();
        setItems(prev => [{ id: Number(data.id), title: data.title, content: data.content, createdAt: new Date().toISOString(), postedBy: 'Department' }, ...prev]);
        toast.success('Announcement created');
      }
      closeAnnouncementModal();
    } catch (e:any) {
      toast.error(e.message || 'Save failed');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Modal isOpen={isAnnouncementModalOpen} onClose={closeAnnouncementModal} title={current?.id ? 'Edit Announcement' : 'New Announcement'}>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
            <input value={current?.title || ''} onChange={(e) => setCurrent(prev => ({ id: prev?.id, title: e.target.value, content: prev?.content || '', audience: prev?.audience || 'ALL' }))} type="text" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Content</label>
            <textarea value={current?.content || ''} onChange={(e) => setCurrent(prev => ({ id: prev?.id, title: prev?.title || '', content: e.target.value, audience: prev?.audience || 'ALL' }))} rows={4} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"></textarea>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Audience</label>
            <select value={current?.audience || 'ALL'} onChange={(e) => setCurrent(prev => ({ id: prev?.id, title: prev?.title || '', content: prev?.content || '', audience: e.target.value as 'ALL'|'STUDENT'|'STAFF' }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <option value="ALL">Both (Staff + Students)</option>
              <option value="STUDENT">Students only</option>
              <option value="STAFF">Staff only</option>
            </select>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={closeAnnouncementModal}>Cancel</Button>
            <Button type="button" onClick={handleSave}>{current?.id ? 'Update' : 'Post Announcement'}</Button>
          </div>
        </form>
      </Modal>

      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manage Announcements</h1>
        <Button onClick={handleCreate}>
          <Megaphone className="w-4 h-4 mr-2" />
          New Announcement
        </Button>
      </div>

      <div className="space-y-4">
        {items.map((announcement) => (
          <div key={announcement.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{announcement.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{announcement.content}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Posted by Department • {new Date(announcement.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(announcement)}><Edit className="w-4 h-4 mr-1" />Edit</Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(announcement.id)}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400">No announcements yet.</div>
        )}
      </div>
    </div>
  );
};

export default Announcements;
