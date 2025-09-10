import React from 'react';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Button from '../../components/ui/button/Button';
import Select from '../../components/form/Select';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Zod schema for the staff activity form
const staffActivitySchema = z.object({
  activityDate: z.string().min(1, 'Activity date is required'),
  activityType: z.string().min(1, 'Activity type is required'),
  title: z.string().min(3, 'Title is required'),
  description: z.string().min(10, 'A detailed description is required'),
  department: z.string().min(1, 'Department is required'),
  contribution: z.string().min(1, 'Your contribution is required'),
  attachments: z.any().optional(),
});

type StaffActivityFormData = z.infer<typeof staffActivitySchema>;

// Mock data for dropdowns
const activityTypeOptions = [
  { value: 'conference', label: 'Conference' },
  { value: 'paper_publication', label: 'Paper Publication' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'project_demo', label: 'Project Demo' },
  { value: 'other', label: 'Other' },
];

const departmentOptions = [
  { value: 'general_medicine', label: 'General Medicine' },
  { value: 'surgery', label: 'Surgery' },
  { value: 'pediatrics', label: 'Pediatrics' },
  { value: 'research', label: 'Research' },
  { value: 'administration', label: 'Administration' },
];

const contributionOptions = [
  { value: 'organizer', label: 'Organizer' },
  { value: 'presenter', label: 'Presenter' },
  { value: 'attendee', label: 'Attendee' },
  { value: 'author', label: 'Author' },
];

const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-4 pt-6">
    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-300 dark:border-gray-700 pb-2">{title}</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{children}</div>
  </div>
);

const FormField: React.FC<{ label: string; error?: string; children: React.ReactNode; className?: string }> = ({ label, error, children, className = '' }) => (
  <div className={`space-y-1 ${className}`}>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
    {children}
    {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
  </div>
);

const SubmitStaffActivity: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const params = new URLSearchParams(location.search);
  const editId = params.get('editId');
  const [files, setFiles] = React.useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = React.useState<Array<{ url: string; contentType?: string; size?: number }>>([]);
  const [isEditable] = React.useState(true);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<StaffActivityFormData>({
    resolver: zodResolver(staffActivitySchema),
    defaultValues: {
      activityDate: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  // Prefill in edit mode
  React.useEffect(() => {
    const run = async () => {
      if (!editId || !user) return;
      try {
        const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
        const token = localStorage.getItem('elog_token') || '';
        const res = await fetch(`${base}/staff/${user.id}/logs/${editId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load activity');
        const d = await res.json();
        reset({
          activityDate: d.activityDate || format(new Date(), 'yyyy-MM-dd'),
          activityType: d.activityType || '',
          title: d.title || '',
          description: d.description || '',
          department: '', // not in staff_logs schema; keeping form stable
          contribution: d.contribution || '',
          attachments: undefined,
        });
        setExistingAttachments(Array.isArray(d.attachments) ? d.attachments : []);
        // No status/remark in simplified flow; always editable
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load');
      }
    };
    run();
  }, [editId, reset, user]);

  

  const onSubmit = async (data: StaffActivityFormData) => {
    try {
      toast.loading(editId ? 'Updating activity...' : 'Submitting activity...');
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('elog_token') || '';
      if (!user) throw new Error('Not authenticated');
      // Upload newly selected files, if any
      let newFiles: Array<{ url: string; contentType?: string; size?: number }> = [];
      if (files.length) {
        const uploads = files.map(async (f) => {
          const fd = new FormData();
          fd.append('file', f);
          const resp = await fetch(`${base}/uploads/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
          if (!resp.ok) {
            const t = await resp.json().catch(() => ({}));
            throw new Error(t?.error || `Failed to upload file: ${f.name}`);
          }
          const out: { url: string; contentType?: string; size?: number } = await resp.json();
          return { url: out.url, contentType: f.type || out.contentType, size: f.size ?? out.size };
        });
        newFiles = await Promise.all(uploads);
      }
      // Merge with existing attachments (user may have removed some)
      const mergedAttachments = [...existingAttachments, ...newFiles];
      const payload = {
        activityDate: data.activityDate,
        activityType: data.activityType,
        title: data.title,
        description: data.description,
        contribution: data.contribution,
        attachments: mergedAttachments,
      };
      const url = editId ? `${base}/staff/${user.id}/logs/${editId}` : `${base}/staff/${user.id}/logs`;
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || (editId ? 'Failed to update activity' : 'Failed to submit activity'));
      }
      toast.dismiss();
      if (editId) {
        toast.success('Activity updated successfully!');
        navigate('/staff/dashboard');
      } else {
        toast.success('Activity submitted successfully!');
        reset();
        setFiles([]);
        setExistingAttachments([]);
      }
    } catch (e) {
      toast.dismiss();
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  // Status display removed in simplified flow

  const onPickFiles = (picked: FileList | null) => {
    if (!picked || picked.length === 0) return;
    const selected = Array.from(picked);
    setFiles((prev) => {
      const map = new Map(prev.map(f => [f.name + ':' + f.size, f]));
      for (const f of selected) map.set(f.name + ':' + f.size, f);
      return Array.from(map.values());
    });
  };
  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 md:p-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">{editId ? 'Edit Staff Activity' : 'Submit Staff Activity'}</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          <FormSection title="Activity Details">
            <FormField label="Date of Activity" error={errors.activityDate?.message}>
              <Controller
                control={control}
                name="activityDate"
                render={({ field }) => (
                  <DatePicker
                    selected={field.value ? new Date(field.value) : null}
                    onChange={(date: Date | null) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                    dateFormat="yyyy-MM-dd"
                    className="input-field"
                    placeholderText="Select date"
                    disabled={!!editId && !isEditable}
                  />
                )}
              />
            </FormField>
            <FormField label="Activity Type" error={errors.activityType?.message}>
              <Controller name="activityType" control={control} render={({ field }) => <Select options={activityTypeOptions} placeholder="Select type..." {...field} disabled={!!editId && !isEditable} />} />
            </FormField>
            <FormField label="Title / Short Description" error={errors.title?.message} className="md:col-span-2">
              <input type="text" placeholder="Enter a brief title for the activity" {...register('title')} className="input-field" disabled={!!editId && !isEditable} />
            </FormField>
            <FormField label="Detailed Description" error={errors.description?.message} className="md:col-span-2">
              <textarea rows={5} placeholder="Provide a detailed description of the activity..." {...register('description')} className="input-field" disabled={!!editId && !isEditable}></textarea>
            </FormField>
            <FormField label="Department" error={errors.department?.message}>
              <Controller name="department" control={control} render={({ field }) => <Select options={departmentOptions} placeholder="Select department..." {...field} disabled={!!editId && !isEditable} />} />
            </FormField>
            <FormField label="Role / Contribution" error={errors.contribution?.message}>
              <Controller name="contribution" control={control} render={({ field }) => <Select options={contributionOptions} placeholder="Select your contribution..." {...field} disabled={!!editId && !isEditable} />} />
            </FormField>
          </FormSection>

          <FormSection title="Attachments">
            <FormField label="Upload Files" className="md:col-span-2">
              <div className="mt-1 px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                    <svg className="h-10 w-10 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <div>
                      <div className="text-sm">Click to upload or drag and drop</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Any format up to 10MB</div>
                    </div>
                  </div>
                  <label htmlFor="attachments" className={`relative rounded-md font-medium text-white px-3 py-2 ${editId && !isEditable ? 'bg-gray-400 cursor-not-allowed' : 'cursor-pointer bg-brand-600 hover:bg-brand-500'}`}>
                    Add files
                    <input id="attachments" type="file" className="sr-only" multiple onChange={(e) => onPickFiles(e.target.files)} disabled={!!editId && !isEditable} />
                  </label>
                </div>

                {files.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {files.map((f, idx) => {
                      const isImage = /^image\//.test(f.type);
                      const isPdf = f.type === 'application/pdf';
                      const url = isImage ? URL.createObjectURL(f) : undefined;
                      return (
                        <div key={idx} className="flex items-start gap-3 border border-gray-200 dark:border-gray-700 rounded-md p-3">
                          <div className="w-16 h-16 shrink-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded">
                            {isImage ? (
                              // eslint-disable-next-line jsx-a11y/alt-text
                              <img src={url} className="w-16 h-16 object-cover rounded" onLoad={() => url && URL.revokeObjectURL(url)} />
                            ) : (
                              <span className="text-xs text-gray-600 dark:text-gray-300">{isPdf ? 'PDF' : (f.type || 'FILE')}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate" title={f.name}>{f.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{(f.size / 1024).toFixed(1)} KB</div>
                            {isPdf && (
                              <div className="mt-1 text-xs text-brand-600"><a href={URL.createObjectURL(f)} target="_blank" rel="noreferrer">Preview PDF</a></div>
                            )}
                          </div>
                          <button type="button" onClick={() => removeFile(idx)} className="text-red-600 hover:text-red-700 text-xs">Remove</button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Existing attachments (edit mode) */}
                {editId && existingAttachments.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Existing Files</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {existingAttachments.map((a, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3 border border-gray-200 dark:border-gray-700 rounded-md p-3">
                          <div className="min-w-0">
                            <a href={a.url} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 underline break-all">
                              {(() => { try { return decodeURIComponent(new URL(a.url).pathname.split('/').pop() || a.url); } catch { return a.url; } })()}
                            </a>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{(a.contentType || '').toString()} {a.size ? `• ${(a.size/1024).toFixed(1)} KB` : ''}</div>
                          </div>
                          <button type="button" onClick={() => setExistingAttachments(prev => prev.filter((_, i) => i !== idx))} className="text-red-600 hover:text-red-700 text-xs">Remove</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </FormField>
          </FormSection>

          {/* Review fields removed */}

          <div className="pt-5">
            <div className="flex justify-end">
              <Button type="button" variant='outline' onClick={() => (editId ? navigate('/staff/dashboard') : reset())} className="mr-3">Cancel</Button>
              <Button type="submit" disabled={!!editId && !isEditable}>{editId ? 'Update Activity' : 'Submit Activity'}</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmitStaffActivity;
