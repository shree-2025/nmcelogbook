import React from 'react';
import Button from '../../components/ui/button/Button';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [me, setMe] = React.useState<{
    id: number;
    name: string;
    email: string;
    departmentId?: number;
    organizationId?: number;
    departmentName?: string;
    organizationName?: string;
    avatarUrl?: string;
  } | null>(null);

  const [avatarPreview, setAvatarPreview] = React.useState<string | undefined>(undefined);
  const [uploadingAvatar, setUploadingAvatar] = React.useState<boolean>(false);

  // Change password form
  const [oldPassword, setOldPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [savingPwd, setSavingPwd] = React.useState(false);
  const [savingOrg, setSavingOrg] = React.useState(false);
  const [savingStudentInfo, setSavingStudentInfo] = React.useState(false);

  // Student report/profile fields
  const [studentInfo, setStudentInfo] = React.useState<any>({});

  const load = async () => {
    try {
      setLoading(true);
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('elog_token') || '';
      let path = '/student/me';
      if (user?.role === 'Staff') path = '/staff/me';
      else if (user?.role === 'DepartmentAdmin') path = '/departments/me';
      else if (user?.role === 'OrganizationAdmin') path = '/org/me';
      const res = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load profile');
      const data = await res.json();
      setMe(data);
      setAvatarPreview(data.avatarUrl || undefined);
      if (user?.role === 'Student') {
        setStudentInfo({
          registrationNo: data.registrationNo || '',
          universityRegNo: data.universityRegNo || '',
          rollNo: data.rollNo || '',
          programName: data.programName || '',
          academicYear: data.academicYear || '',
          batchYear: data.batchYear || '',
          semester: data.semester || '',
          rotationName: data.rotationName || '',
          rotationStartDate: data.rotationStartDate ? String(data.rotationStartDate).slice(0,10) : '',
          rotationEndDate: data.rotationEndDate ? String(data.rotationEndDate).slice(0,10) : '',
          dob: data.dob ? String(data.dob).slice(0,10) : '',
          gender: data.gender || '',
          bloodGroup: data.bloodGroup || '',
          phone: data.phone || '',
          address: data.address || '',
          guardianName: data.guardianName || '',
          guardianPhone: data.guardianPhone || '',
          emergencyContactName: data.emergencyContactName || '',
          emergencyContactPhone: data.emergencyContactPhone || '',
          adviserName: data.adviserName || '',
          hodName: data.hodName || '',
          principalName: data.principalName || '',
          remarks: data.remarks || '',
        });
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, [user]);

  const { updateUser } = useAuth();
  const saveOrgName = async () => {
    if (user?.role !== 'OrganizationAdmin' || !me) return;
    try {
      setSavingOrg(true);
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('elog_token') || '';
      const res = await fetch(`${base}/org/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: me.name }),
      });
      if (!res.ok) {
        const t = await res.json().catch(() => ({}));
        throw new Error(t?.error || 'Failed to update College Name');
      }
      toast.success('College Name updated');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update');
    } finally {
      setSavingOrg(false);
    }
  };

  const onAvatarChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // Optimistic preview
    const url = URL.createObjectURL(f);
    setAvatarPreview(url);

    try {
      setUploadingAvatar(true);
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('elog_token') || '';
      const form = new FormData();
      form.append('file', f);
      // pick endpoint based on role
      let avatarPath = '/student/avatar';
      if (user?.role === 'Staff') avatarPath = '/staff/avatar';
      else if (user?.role === 'DepartmentAdmin') avatarPath = '/departments/avatar';
      else if (user?.role === 'OrganizationAdmin') avatarPath = '/org/avatar';
      const res = await fetch(`${base}${avatarPath}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const t = await res.json().catch(() => ({} as any));
        throw new Error(t?.error || 'Failed to upload avatar');
      }
      const data: { ok: boolean; avatarUrl?: string } = await res.json();
      if (data.avatarUrl) {
        setAvatarPreview(data.avatarUrl);
        setMe((prev) => (prev ? { ...prev, avatarUrl: data.avatarUrl } : prev));
        try { updateUser({ avatarUrl: data.avatarUrl }); } catch {}
        toast.success('Avatar saved');
      } else {
        toast.success('Avatar uploaded');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }
    try {
      setSavingPwd(true);
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('elog_token') || '';
      let changePath = '/auth/student/change-password';
      if (user?.role === 'Staff') changePath = '/auth/staff/change-password';
      else if (user?.role === 'DepartmentAdmin') changePath = '/auth/department/change-password';
      const res = await fetch(`${base}${changePath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      if (!res.ok) {
        const t = await res.json().catch(() => ({}));
        throw new Error(t?.error || 'Failed to change password');
      }
      toast.success('Password changed');
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to change password');
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile</h1>

      {/* Profile Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Edit Profile</h2>
        {loading && <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>}
        {me && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-gray-500 text-xl">{me.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300">{user?.role === 'OrganizationAdmin' ? 'Organization Logo' : 'Change Photo'}</label>
                <input type="file" accept="image/*" onChange={onAvatarChange} className="mt-1 block text-sm" disabled={uploadingAvatar} />
                {uploadingAvatar && <div className="text-xs text-gray-500 mt-1">Uploading...</div>}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <label className="text-sm text-gray-600 dark:text-gray-300">{user?.role === 'OrganizationAdmin' ? 'College Name' : 'Name'}
                <input
                  value={me.name}
                  onChange={(e) => setMe((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                  readOnly={user?.role !== 'OrganizationAdmin'}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-gray-600 dark:text-gray-300">Email
                <input value={me.email} readOnly className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
              </label>
              {user?.role === 'OrganizationAdmin' && (
                <div className="flex justify-end pt-2">
                  <Button onClick={saveOrgName} disabled={savingOrg} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                    {savingOrg ? 'Saving...' : 'Save College Name'}
                  </Button>
                </div>
              )}
            </div>
            {user?.role !== 'OrganizationAdmin' && (
              <div className="grid grid-cols-1 gap-3">
                <label className="text-sm text-gray-600 dark:text-gray-300">Organization (College)
                  <input value={me.organizationName || ''} readOnly className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
                </label>
                <label className="text-sm text-gray-600 dark:text-gray-300">Department
                  <input value={me.departmentName || ''} readOnly className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Change Password</h2>
        <form className="grid grid-cols-1 md:grid-cols-3 gap-4" onSubmit={submitPassword}>
          <label className="text-sm text-gray-600 dark:text-gray-300">Current Password
            <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm text-gray-600 dark:text-gray-300">New Password
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm text-gray-600 dark:text-gray-300">Confirm Password
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
          </label>
          <div className="md:col-span-3">
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white" disabled={savingPwd}>
              {savingPwd ? 'Saving...' : 'Update Password'}
            </Button>
          </div>
        </form>
      </div>

      {/* Student Personal & Report Info */}
      {user?.role === 'Student' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Personal & Report Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm text-gray-600 dark:text-gray-300">Registration No.
              <input value={studentInfo.registrationNo||''} onChange={(e)=>setStudentInfo((p:any)=>({...p, registrationNo:e.target.value}))} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300">University Reg. No.
              <input value={studentInfo.universityRegNo||''} onChange={(e)=>setStudentInfo((p:any)=>({...p, universityRegNo:e.target.value}))} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300">Roll No.
              <input value={studentInfo.rollNo||''} onChange={(e)=>setStudentInfo((p:any)=>({...p, rollNo:e.target.value}))} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300">Program Name
              <input value={studentInfo.programName||''} onChange={(e)=>setStudentInfo((p:any)=>({...p, programName:e.target.value}))} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300">Academic Year
              <input value={studentInfo.academicYear||''} onChange={(e)=>setStudentInfo((p:any)=>({...p, academicYear:e.target.value}))} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300">Batch Year
              <input value={studentInfo.batchYear||''} onChange={(e)=>setStudentInfo((p:any)=>({...p, batchYear:e.target.value}))} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300">Semester
              <input value={studentInfo.semester||''} onChange={(e)=>setStudentInfo((p:any)=>({...p, semester:e.target.value}))} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300">Rotation Name
              <input value={studentInfo.rotationName||''} onChange={(e)=>setStudentInfo((p:any)=>({...p, rotationName:e.target.value}))} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300">Rotation Start Date
              <input type="date" value={studentInfo.rotationStartDate||''} onChange={(e)=>setStudentInfo((p:any)=>({...p, rotationStartDate:e.target.value}))} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300">Rotation End Date
              <input type="date" value={studentInfo.rotationEndDate||''} onChange={(e)=>setStudentInfo((p:any)=>({...p, rotationEndDate:e.target.value}))} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300">DOB
              <input type="date" value={studentInfo.dob||''} onChange={(e)=>setStudentInfo((p:any)=>({...p, dob:e.target.value}))} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300">Gender
              <input value={studentInfo.gender||''} onChange={(e)=>setStudentInfo((p:any)=>({...p, gender:e.target.value}))} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300">Blood Group
              <input value={studentInfo.bloodGroup||''} onChange={(e)=>setStudentInfo((p:any)=>({...p, bloodGroup:e.target.value}))} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300">Phone
              <input value={studentInfo.phone||''} onChange={(e)=>setStudentInfo((p:any)=>({...p, phone:e.target.value}))} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300 md:col-span-2">Address
              <input value={studentInfo.address||''} onChange={(e)=>setStudentInfo((p:any)=>({...p, address:e.target.value}))} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300">Guardian Name
              <input value={studentInfo.guardianName||''} onChange={(e)=>setStudentInfo((p:any)=>({...p, guardianName:e.target.value}))} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300">Guardian Phone
              <input value={studentInfo.guardianPhone||''} onChange={(e)=>setStudentInfo((p:any)=>({...p, guardianPhone:e.target.value}))} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300">Emergency Contact Name
              <input value={studentInfo.emergencyContactName||''} onChange={(e)=>setStudentInfo((p:any)=>({...p, emergencyContactName:e.target.value}))} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300">Emergency Contact Phone
              <input value={studentInfo.emergencyContactPhone||''} onChange={(e)=>setStudentInfo((p:any)=>({...p, emergencyContactPhone:e.target.value}))} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300">Adviser Name
              <input value={studentInfo.adviserName||''} onChange={(e)=>setStudentInfo((p:any)=>({...p, adviserName:e.target.value}))} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300">HOD Name
              <input value={studentInfo.hodName||''} onChange={(e)=>setStudentInfo((p:any)=>({...p, hodName:e.target.value}))} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300">Principal Name
              <input value={studentInfo.principalName||''} onChange={(e)=>setStudentInfo((p:any)=>({...p, principalName:e.target.value}))} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-300 md:col-span-2">Remarks
              <textarea value={studentInfo.remarks||''} onChange={(e)=>setStudentInfo((p:any)=>({...p, remarks:e.target.value}))} rows={3} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={async ()=>{
              try{
                setSavingStudentInfo(true);
                const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
                const token = localStorage.getItem('elog_token') || '';
                const res = await fetch(`${base}/student/me`, { method:'PUT', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify(studentInfo)});
                if(!res.ok){ const t = await res.json().catch(()=>({})); throw new Error(t?.error||'Failed to save'); }
                toast.success('Profile info saved');
              } catch(e:any){ toast.error(e?.message||'Failed to save'); } finally{ setSavingStudentInfo(false); }
            }} disabled={savingStudentInfo} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              {savingStudentInfo? 'Saving...' : 'Save Info'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
