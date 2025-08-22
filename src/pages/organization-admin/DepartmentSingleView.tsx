import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Edit, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '../../components/ui/table';
import Button from '../../components/ui/button/Button';
import Tooltip from '../../components/ui/tooltip/Tooltip';
import { useModal } from '../../hooks/useModal';
import { Modal } from '../../components/ui/modal';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

import { departments, allStaff, allStudents, allActivityLogs, Staff, Student, ActivityLog } from '../../data/mockData';

const DepartmentSingleView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const department = departments.find(d => d.id === id);

  // Filter data based on department ID
  const departmentStaff = allStaff.filter(s => s.departmentId === id);
  const departmentStudents = allStudents.filter(s => s.departmentId === id);
  const departmentLogs = allActivityLogs.filter(l => l.departmentId === id);

  // Staff State
  const [staff, setStaff] = useState<Staff[]>(departmentStaff);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);

  // Student State
  const [students, setStudents] = useState<Student[]>(departmentStudents);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);

  // Activity Logs State
  const [activityLogs] = useState<ActivityLog[]>(departmentLogs);

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

  if (!department) {
    return <div>Department not found.</div>;
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manage: {department.name}</h1>
        <p className="text-gray-600 dark:text-gray-400">Head of Department: {department.hod}</p>
      </div>

      {/* Staff Management */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Staff Details</h2>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell className="font-semibold text-gray-900 dark:text-white p-4">Staff Name</TableCell>
                <TableCell className="font-semibold text-gray-900 dark:text-white p-4">Role</TableCell>
                <TableCell className="font-semibold text-gray-900 dark:text-white p-4">Assigned Students</TableCell>
                <TableCell className="text-right font-semibold text-gray-900 dark:text-white p-4">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map(s => (
                <React.Fragment key={s.id}>
                  <TableRow>
                    <TableCell className="p-4 text-gray-900 dark:text-gray-300">{s.name}</TableCell>
                    <TableCell className="p-4 text-gray-600 dark:text-gray-400">{s.role}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => setExpandedStaffId(expandedStaffId === s.id ? null : s.id)}>
                        {s.studentIds.length} Students
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
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
                      <TableCell colSpan={4} className="p-4">
                        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          <h4 className="font-bold mb-2">Assigned Students</h4>
                          <ul className="list-disc pl-5">
                            {s.studentIds.map(studentId => {
                              const student = allStudents.find(stud => stud.id === studentId);
                              return <li key={studentId}>{student ? student.name : 'Unknown Student'}</li>;
                            })}
                          </ul>
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

      {/* Student Management */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Student Details</h2>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell className="font-semibold text-gray-900 dark:text-white p-4">Student Name</TableCell>
                <TableCell className="font-semibold text-gray-900 dark:text-white p-4">Registration No.</TableCell>
                <TableCell className="text-right font-semibold text-gray-900 dark:text-white p-4">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="p-4 text-gray-900 dark:text-gray-300">{s.name}</TableCell>
                  <TableCell className="p-4 text-gray-600 dark:text-gray-400">{s.regNo}</TableCell>
                  <TableCell className="text-right">
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

      {/* Activity Logs Overview */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Activity Logs Overview</h2>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell className="font-semibold">Submitted By</TableCell>
                <TableCell className="font-semibold">Activity</TableCell>
                <TableCell className="font-semibold">Date</TableCell>
                <TableCell className="text-right font-semibold">Status</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activityLogs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>{log.submittedBy}</TableCell>
                  <TableCell>{log.activity}</TableCell>
                  <TableCell>{log.date}</TableCell>
                  <TableCell className="text-right">
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
