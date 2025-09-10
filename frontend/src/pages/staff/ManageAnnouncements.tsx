import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import Button from '../../components/ui/button/Button';
import { useModal } from '../../hooks/useModal';
import { Modal } from '../../components/ui/modal';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

type Ann = { id: number; title: string; content: string; createdAt: string };

const ManageAnnouncements: React.FC = () => {
  const { isOpen, openModal, closeModal } = useModal();
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Ann[]>([]);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<{ id?: number; title: string; content: string } | null>(null);

  const load = async () => {
    try {
      if (!user) return;
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('elog_token') || '';
      const res = await fetch(`${base}/staff/${user.id}/announcements/managed`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load announcements');
      const data: Ann[] = await res.json();
      setAnnouncements(data);
    } catch (e:any) {
      toast.error(e.message || 'Failed to load announcements');
    }
  };

  useEffect(() => { load(); }, [user]);

  const handleCreate = () => {
    setCurrentAnnouncement({ title: '', content: '' });
    openModal();
  };

  const handleEdit = (announcement: Ann) => {
    setCurrentAnnouncement(announcement);
    openModal();
  };

  const handleDelete = async (id: number) => {
    try {
      if (!user) return;
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('elog_token') || '';
      const res = await fetch(`${base}/staff/${user.id}/announcements/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to delete');
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      toast.success('Announcement deleted');
    } catch (e:any) {
      toast.error(e.message || 'Delete failed');
    }
  };

  const handleSave = async () => {
    if (!currentAnnouncement || !user) return;
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('elog_token') || '';
      if (currentAnnouncement.id) {
        const res = await fetch(`${base}/staff/${user.id}/announcements/${currentAnnouncement.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title: currentAnnouncement.title, content: currentAnnouncement.content })
        });
        if (!res.ok) throw new Error('Update failed');
        setAnnouncements(prev => prev.map(a => a.id === currentAnnouncement.id ? { ...a, title: currentAnnouncement.title, content: currentAnnouncement.content } : a));
        toast.success('Announcement updated');
      } else {
        const res = await fetch(`${base}/staff/${user.id}/announcements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title: currentAnnouncement.title, content: currentAnnouncement.content })
        });
        if (!res.ok) throw new Error('Create failed');
        const data = await res.json();
        setAnnouncements(prev => [{ id: Number(data.id), title: data.title, content: data.content, createdAt: new Date().toISOString() }, ...prev]);
        toast.success('Announcement created');
      }
      closeModal();
    } catch (e:any) {
      toast.error(e.message || 'Save failed');
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (currentAnnouncement) {
      setCurrentAnnouncement({
        ...currentAnnouncement,
        [e.target.name]: e.target.value,
      });
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manage Announcements</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Create, edit, and delete announcements for students.</p>
        </div>
        <Button onClick={handleCreate} startIcon={<Plus className="w-4 h-4" />}>
          Create Announcement
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">Title</th>
                <th scope="col" className="px-6 py-3">Date</th>
                <th scope="col" className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map((announcement) => (
                <tr key={announcement.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                    {announcement.title}
                  </th>
                  <td className="px-6 py-4">{new Date(announcement.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEdit(announcement)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDelete(announcement.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isOpen && (
        <Modal isOpen={isOpen} title={currentAnnouncement?.id ? 'Edit Announcement' : 'Create Announcement'} onClose={closeModal}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
              <input
                type="text"
                value={currentAnnouncement?.title || ''}
                name="title"
                onChange={handleFormChange}
                className="input-field mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Content</label>
              <textarea
                rows={4}
                value={currentAnnouncement?.content || ''}
                name="content"
                onChange={handleFormChange}
                className="input-field mt-1"
              ></textarea>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={closeModal}>Cancel</Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ManageAnnouncements;
