import React from 'react';
import Button from '../components/ui/button/Button';
import toast from 'react-hot-toast';

const Support: React.FC = () => {
  const [subject, setSubject] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [sending, setSending] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error('Please enter subject and message');
      return;
    }
    try {
      setSending(true);
      // Placeholder: send to backend or email integration.
      // For now, just acknowledge.
      await new Promise((r) => setTimeout(r, 500));
      toast.success('Your request has been sent');
      setSubject('');
      setMessage('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Support</h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <p className="text-gray-600 dark:text-gray-400 mb-4">Have a question or need help? Send us a message.</p>
        <form className="space-y-4" onSubmit={submit}>
          <label className="block text-sm text-gray-700 dark:text-gray-300">Subject
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm text-gray-700 dark:text-gray-300">Message
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
          </label>
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white" disabled={sending}>{sending ? 'Sending...' : 'Send'}</Button>
        </form>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Contact</h2>
        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
          <li>Email: support@example.com</li>
          <li>Docs: Coming soon</li>
        </ul>
      </div>
    </div>
  );
};

export default Support;
