import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Edit, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '../../components/ui/table';
import Button from '../../components/ui/button/Button';
import Tooltip from '../../components/ui/tooltip/Tooltip';
import { useModal } from '../../hooks/useModal';
import { Modal } from '../../components/ui/modal';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import toast from 'react-hot-toast';

type Staff = { id: string; name: string; email: string; role?: string; studentIds?: string[] };
type Student = { id: string; name: string; regNo?: string; email?: string; logCount?: number };
type ActivityLog = { id: string; submittedBy?: string; activity?: string; date?: string; status: 'Approved'|'Pending'|'Rejected' };

const DepartmentSingleView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
  const token = typeof window !== 'undefined' ? localStorage.getItem('elog_token') : null;

  const [deptName, setDeptName] = useState<string>('');
  const [deptEmail, setDeptEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Staff State
  const [staff, setStaff] = useState<Staff[]>([]);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);

  // Student State
  const [students, setStudents] = useState<Student[]>([]);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
  const [assignedMap, setAssignedMap] = useState<Record<string, Student[]>>({});

  // Activity Logs State
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Live data fetch
  useEffect(() => {
    let alive = true;
    const fetchAll = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const headers: Record<string,string> = { };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        // fetch department list and find this one for name/email display
        const rDept = await fetch(`${API_BASE}/org/departments`, { headers });
        if (rDept.ok) {
          const list = await rDept.json();
          const d = (list || []).find((x: any) => String(x.id) === String(id));
          if (d) { setDeptName(d.name || ''); setDeptEmail(d.email || ''); }
        }
        // fetch staff
        const r1 = await fetch(`${API_BASE}/org/departments/${id}/staff`, { headers });
        const r2 = await fetch(`${API_BASE}/org/departments/${id}/students`, { headers });
        const r3 = await fetch(`${API_BASE}/org/departments/${id}/logs`, { headers });
        const rr1 = r1.ok ? await r1.json() : [];
        const rr2 = r2.ok ? await r2.json() : [];
        const rr3 = r3.ok ? await r3.json() : [];
        if (!alive) return;
        setStaff(rr1.map((x:any)=>({ id: String(x.id), name: x.name, email: x.email })));
        setStudents(rr2.map((x:any)=>({ id: String(x.id), name: x.name, regNo: x.regNo || '', email: x.email, logCount: Number(x.logCount || 0) })));
        setActivityLogs(rr3.map((x:any)=>({ id: String(x.id), submittedBy: x.submittedBy || '', activity: x.title || x.activityType || '', date: x.activityDate ? new Date(x.activityDate).toLocaleDateString() : '', status: (String(x.status||'Pending')[0].toUpperCase()+String(x.status||'Pending').slice(1).toLowerCase()) as any })));
      } catch (e:any) {
        console.error(e);
        setError(e?.message || 'Failed to load department');
        toast.error(e?.message || 'Failed to load department');
      } finally {
        if (alive) setLoading(false);
      }
    };
    fetchAll();
    return () => { alive = false; };
  }, [id]);

  // Load assigned students for a staff on demand
  const loadAssignedForStaff = async (staffId: string) => {
    try {
      const headers: Record<string,string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const r = await fetch(`${API_BASE}/org/departments/${id}/staff/${staffId}/students`, { headers });
      if (!r.ok) return;
      const arr = await r.json();
      setAssignedMap(prev => ({ ...prev, [staffId]: (arr || []).map((x:any)=>({ id: String(x.id), name: x.name, email: x.email })) }));
    } catch {}
  };

  // Modals
  const { isOpen: isEditStaffModalOpen, openModal: openEditStaffModal, closeModal: closeEditStaffModal } = useModal();
  const { isOpen: isDeleteStaffConfirmOpen, openModal: openDeleteStaffConfirm, closeModal: closeDeleteStaffConfirm } = useModal();
  const { isOpen: isEditStudentModalOpen, openModal: openEditStudentModal, closeModal: closeEditStudentModal } = useModal();
  const { isOpen: isDeleteStudentConfirmOpen, openModal: openDeleteStudentConfirm, closeModal: closeDeleteStudentConfirm } = useModal();

  // Input change handlers
  const handleStaffInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditingStaff(prev => ({ ...prev!, [name]: value }));
  };

  const handleStudentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditingStudent(prev => ({ ...prev!, [name]: value }));
  };

  // Staff CRUD
  const handleUpdateStaff = () => {
    if (editingStaff) {
      setStaff(prev => prev.map(s => s.id === editingStaff.id ? editingStaff : s));
    }
    closeEditStaffModal();
  };

  const handleDeleteStaffClick = (s: Staff) => {
    setDeletingStaff(s);
    openDeleteStaffConfirm();
  };

  const handleConfirmDeleteStaff = () => {
    if (deletingStaff) {
      setStaff(prev => prev.filter(s => s.id !== deletingStaff.id));
    }
    closeDeleteStaffConfirm();
  };

  // Student CRUD
  const handleUpdateStudent = () => {
    if (editingStudent) {
      setStudents(prev => prev.map(s => s.id === editingStudent.id ? editingStudent : s));
    }
    closeEditStudentModal();
  };

  const handleDeleteStudentClick = (s: Student) => {
    setDeletingStudent(s);
    openDeleteStudentConfirm();
  };

  const handleConfirmDeleteStudent = () => {
    if (deletingStudent) {
      setStudents(prev => prev.filter(s => s.id !== deletingStudent.id));
    }
    closeDeleteStudentConfirm();
  };

  if (!id) return <div>Department not found.</div>;

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manage: {deptName || `Department #${id}`}</h1>
        <p className="text-gray-600 dark:text-gray-400">Email: {deptEmail || '-'}</p>
      </div>
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">{error}</div>
      )}
      {loading && (
        <div className="p-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-md dark:bg-gray-800/50 dark:border-gray-700 dark:text-white">Loading department data...</div>
      )}

      {/* Staff Management */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Staff Details <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({staff.length})</span></h2>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
          <div className="max-h-80 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell className="font-semibold text-gray-900 dark:text-white p-3 w-[40%] sticky top-0 bg-white dark:bg-gray-800 z-10">Staff Name</TableCell>
                <TableCell className="font-semibold text-gray-900 dark:text-white p-3 w-[25%] sticky top-0 bg-white dark:bg-gray-800 z-10">Role</TableCell>
                <TableCell className="font-semibold text-gray-900 dark:text-white p-3 w-[20%] sticky top-0 bg-white dark:bg-gray-800 z-10">Assigned Students</TableCell>
                <TableCell className="text-right font-semibold text-gray-900 dark:text-white p-3 w-[15%] sticky top-0 bg-white dark:bg-gray-800 z-10">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">No staff found for this department.</TableCell>
                </TableRow>
              ) : staff.map(s => (
                <React.Fragment key={s.id}>
                  <TableRow className="odd:bg-gray-50/50 dark:odd:bg-gray-900/30">
                    <TableCell className="p-3 text-gray-900 dark:text-gray-300">
                      <span className="block truncate" title={s.name}>{s.name}</span>
                    </TableCell>
                    <TableCell className="p-3 text-gray-600 dark:text-gray-400 truncate">{s.role || 'Staff'}</TableCell>
                    <TableCell className="p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{Array.isArray(assignedMap[s.id]) ? assignedMap[s.id].length : (typeof (s as any).assignedCount === 'number' ? (s as any).assignedCount : 0)}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const next = expandedStaffId === s.id ? null : s.id;
                            setExpandedStaffId(next);
                            if (next && !assignedMap[s.id]) {
                              await loadAssignedForStaff(s.id);
                            }
                          }}
                        >
                          {expandedStaffId === s.id ? 'Hide' : 'View'} Students
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right p-3">
                      <div className="flex justify-end items-center gap-2 flex-wrap">
                        <Tooltip text="Edit Staff">
                          <Button variant="outline" size="icon" onClick={() => { setEditingStaff(s); openEditStaffModal(); }}>
                            <Edit className="h-5 w-5" />
                          </Button>
                        </Tooltip>
                        <Tooltip text="Delete Staff">
                          <Button variant="destructive" size="icon" onClick={() => handleDeleteStaffClick(s)}>
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedStaffId === s.id && (
                    <TableRow>
                      <TableCell colSpan={4} className="p-0">
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-200 dark:border-gray-700">
                          <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Assigned Students</h4>
                          {Array.isArray(assignedMap[s.id]) && assignedMap[s.id].length > 0 ? (
                            <ul className="list-disc pl-5 text-sm text-gray-800 dark:text-gray-200">
                              {assignedMap[s.id].map(st => (
                                <li key={st.id}>{st.name} <span className="text-gray-500 dark:text-gray-400">({st.email || '-'})</span></li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-sm text-gray-600 dark:text-gray-400">No students assigned.</div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
          </div>
          </div>
        </div>
      </div>

      {/* Student Management */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Student Details <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({students.length})</span></h2>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
          <div className="max-h-80 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell className="font-semibold text-gray-900 dark:text-white p-3 w-[45%] sticky top-0 bg-white dark:bg-gray-800 z-10">Student Name</TableCell>
                <TableCell className="font-semibold text-gray-900 dark:text-white p-3 w-[35%] sticky top-0 bg-white dark:bg-gray-800 z-10">No. of Logs Uploaded</TableCell>
                <TableCell className="text-right font-semibold text-gray-900 dark:text-white p-3 w-[20%] sticky top-0 bg-white dark:bg-gray-800 z-10">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">No students found for this department.</TableCell>
                </TableRow>
              ) : students.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="p-3 text-gray-900 dark:text-gray-300">
                    <span className="block truncate" title={s.name}>{s.name}</span>
                  </TableCell>
                  <TableCell className="p-3 text-gray-700 dark:text-gray-300 truncate">{typeof s.logCount === 'number' ? s.logCount : '-'}</TableCell>
                  <TableCell className="text-right p-3">
                    <div className="flex justify-end items-center gap-2 flex-wrap">
                    <Tooltip text="Edit">
                      <Button variant="outline" size="icon" onClick={() => { setEditingStudent(s); openEditStudentModal(); }}><Edit className="h-4 w-4" /></Button>
                    </Tooltip>
                    <Tooltip text="Delete">
                      <Button variant="destructive" size="icon" onClick={() => handleDeleteStudentClick(s)}><Trash2 className="h-4 w-4" /></Button>
                    </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
          </div>
        </div>
      </div>

      {/* Activity Logs Overview */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Activity Logs Overview <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({activityLogs.length})</span></h2>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
          <div className="max-h-80 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell className="font-semibold p-3 sticky top-0 bg-white dark:bg-gray-800 z-10"><span className="text-gray-900 dark:!text-white">Submitted By</span></TableCell>
                <TableCell className="font-semibold p-3 sticky top-0 bg-white dark:bg-gray-800 z-10"><span className="text-gray-900 dark:!text-white">Activity</span></TableCell>
                <TableCell className="font-semibold p-3 sticky top-0 bg-white dark:bg-gray-800 z-10"><span className="text-gray-900 dark:!text-white">Date</span></TableCell>
                <TableCell className="text-right font-semibold p-3 sticky top-0 bg-white dark:bg-gray-800 z-10"><span className="text-gray-900 dark:!text-white">Status</span></TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activityLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">No activity logs found.</TableCell>
                </TableRow>
              ) : activityLogs.map(log => (
                <TableRow key={log.id} className="odd:bg-gray-50/50 dark:odd:bg-gray-900/30">
                  <TableCell className="p-3 text-gray-900 dark:text-gray-200">
                    <span className="block truncate" title={log.submittedBy || '-' }>{log.submittedBy || '-'}</span>
                  </TableCell>
                  <TableCell className="p-3 text-gray-900 dark:text-gray-200">
                    <span className="block truncate" title={log.activity || '-' }>{log.activity || '-'}</span>
                  </TableCell>
                  <TableCell className="p-3 whitespace-nowrap text-gray-900 dark:text-gray-200">{log.date || '-'}</TableCell>
                  <TableCell className="text-right p-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      log.status === 'Approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                      log.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      {log.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
          </div>
        </div>
      </div>

      <Modal isOpen={isEditStaffModalOpen} onClose={closeEditStaffModal} title="Edit Staff">
        {editingStaff && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="editStaffName">Staff Name</Label>
              <Input id="editStaffName" name="name" value={editingStaff.name} onChange={handleStaffInputChange} />
            </div>
            <div>
              <Label htmlFor="editStaffRole">Role</Label>
              <Input id="editStaffRole" name="role" value={editingStaff.role} onChange={handleStaffInputChange} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeEditStaffModal}>Cancel</Button>
              <Button onClick={handleUpdateStaff}>Update Staff</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isDeleteStaffConfirmOpen} onClose={closeDeleteStaffConfirm} title="Confirm Delete">
        <p>Are you sure you want to delete {deletingStaff?.name}?</p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={closeDeleteStaffConfirm}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirmDeleteStaff}>Delete</Button>
        </div>
      </Modal>

      {editingStudent && (
        <Modal isOpen={isEditStudentModalOpen} onClose={closeEditStudentModal} title={`Edit ${editingStudent.name}`}>
          <form className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="student-name" className="sm:text-right">Name</Label>
              <Input id="student-name" name="name" value={editingStudent.name} onChange={handleStudentInputChange} className="sm:col-span-3" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="student-regNo" className="sm:text-right">Reg. No.</Label>
              <Input id="student-regNo" name="regNo" value={editingStudent.regNo} onChange={handleStudentInputChange} className="sm:col-span-3" />
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={closeEditStudentModal}>Cancel</Button>
              <Button onClick={handleUpdateStudent}>Save Changes</Button>
            </div>
          </form>
        </Modal>
      )}

      {deletingStudent && (
        <Modal isOpen={isDeleteStudentConfirmOpen} onClose={closeDeleteStudentConfirm} title="Confirm Deletion">
          <p>Are you sure you want to delete <strong>{deletingStudent.name}</strong>?</p>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={closeDeleteStudentConfirm}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDeleteStudent}>Delete</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DepartmentSingleView;
