import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, FileText, BarChart2, Search, UserCircle2, LayoutGrid, List, Edit, Trash2 } from 'lucide-react';
import Button from '../../components/ui/button/Button';
import { Modal } from '../../components/ui/modal';
import Tooltip from '../../components/ui/tooltip/Tooltip';
import { useModal } from '../../hooks/useModal';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '../../components/ui/table';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

type Student = {
  id: string;
  name: string;
  email: string;
  major: string;
  status: string;
  avatarUrl?: string;
  // extended optional fields used for reports
  registrationNo?: string;
  universityRegNo?: string;
  rollNo?: string;
  programName?: string;
  academicYear?: string;
  batchYear?: string;
  semester?: string;
  rotationName?: string;
  rotationStartDate?: string;
  rotationEndDate?: string;
  phone?: string;
  address?: string;
  guardianName?: string;
  guardianPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
};

const initialStudents: Student[] = [];

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const { isOpen: isAddStudentModalOpen, openModal: openAddStudentModal, closeModal: closeAddStudentModal } = useModal();
  const { isOpen: isBulkUploadModalOpen, openModal: openBulkUploadModal, closeModal: closeBulkUploadModal } = useModal();
  const { isOpen: isEditStudentModalOpen, openModal: openEditStudentModal, closeModal: closeEditStudentModal } = useModal();
  const { isOpen: isDeleteConfirmModalOpen, openModal: openDeleteConfirmModal, closeModal: closeDeleteConfirmModal } = useModal();

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newStudent, setNewStudent] = useState({
    name: '', email: '', major: '',
    registrationNo: '', universityRegNo: '', rollNo: '', programName: '', academicYear: '', batchYear: '', semester: '',
    rotationName: '', rotationStartDate: '', rotationEndDate: '',
    phone: '', address: '', guardianName: '', guardianPhone: '', emergencyContactName: '', emergencyContactPhone: ''
  });
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState<boolean>(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const apiBase = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';

  const [sortOrder, setSortOrder] = useState('name-asc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('card');

  const filteredStudents = students
    .filter((student) => {
      const searchMatch =
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.major.toLowerCase().includes(searchTerm.toLowerCase());

      const statusMatch = statusFilter === 'all' || student.status === statusFilter;

      return searchMatch && statusMatch;
    })
    .sort((a, b) => {
      if (sortOrder === 'name-asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortOrder === 'name-desc') {
        return b.name.localeCompare(a.name);
      }
      return 0;
    });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (editingStudent) {
      setEditingStudent(prev => prev ? { ...prev, [name]: value } : null);
    } else {
      setNewStudent(prev => ({ ...prev, [name]: value }));
    }
  };

  // Fetch students from backend
  const fetchStudents = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('elog_token');
      const res = await fetch(`${apiBase}/staff/${user.id}/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load students');
      const data: Array<any> = await res.json();
      const mapped: Student[] = data.map((s) => ({
        id: String(s.id),
        name: s.name,
        email: s.email,
        major: s.major || '',
        status: s.status || 'Active',
        avatarUrl: s.avatarUrl,
        registrationNo: s.registrationNo,
        universityRegNo: s.universityRegNo,
        rollNo: s.rollNo,
        programName: s.programName,
        academicYear: s.academicYear,
        batchYear: s.batchYear,
        semester: s.semester,
        rotationName: s.rotationName,
        rotationStartDate: s.rotationStartDate,
        rotationEndDate: s.rotationEndDate,
        phone: s.phone,
        address: s.address,
        guardianName: s.guardianName,
        guardianPhone: s.guardianPhone,
        emergencyContactName: s.emergencyContactName,
        emergencyContactPhone: s.emergencyContactPhone,
      }));
      setStudents(mapped);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleViewLogs = (student: Student) => {
    navigate(`/staff/student-logs?studentId=${student.id}`);
  };

  const handleGenerateReport = (student: Student) => {
    navigate(`/staff/reports?studentId=${student.id}`);
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    openEditStudentModal();
  };

  const handleDeleteStudent = (student: Student) => {
    setSelectedStudent(student);
    openDeleteConfirmModal();
  };

  const handleSaveStudent = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('elog_token');
      const res = await fetch(`${apiBase}/staff/${user.id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newStudent),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to create student');
      }
      toast.success('Student created');
      setNewStudent({ name: '', email: '', major: '', registrationNo:'', universityRegNo:'', rollNo:'', programName:'', academicYear:'', batchYear:'', semester:'', rotationName:'', rotationStartDate:'', rotationEndDate:'', phone:'', address:'', guardianName:'', guardianPhone:'', emergencyContactName:'', emergencyContactPhone:'' });
      closeAddStudentModal();
      fetchStudents();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create student');
    }
  };

  const handleUpdateStudent = async () => {
    if (!user || !editingStudent) return;
    try {
      const token = localStorage.getItem('elog_token');
      const res = await fetch(`${apiBase}/staff/${user.id}/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: editingStudent.name,
          email: editingStudent.email,
          major: editingStudent.major,
          status: editingStudent.status,
          registrationNo: editingStudent.registrationNo,
          universityRegNo: editingStudent.universityRegNo,
          rollNo: editingStudent.rollNo,
          programName: editingStudent.programName,
          academicYear: editingStudent.academicYear,
          batchYear: editingStudent.batchYear,
          semester: editingStudent.semester,
          rotationName: editingStudent.rotationName,
          rotationStartDate: editingStudent.rotationStartDate,
          rotationEndDate: editingStudent.rotationEndDate,
          phone: editingStudent.phone,
          address: editingStudent.address,
          guardianName: editingStudent.guardianName,
          guardianPhone: editingStudent.guardianPhone,
          emergencyContactName: editingStudent.emergencyContactName,
          emergencyContactPhone: editingStudent.emergencyContactPhone,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to update student');
      }
      toast.success('Student updated');
      closeEditStudentModal();
      setEditingStudent(null);
      fetchStudents();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update student');
    }
  };

  const handleConfirmDelete = async () => {
    if (!user || !selectedStudent) return;
    try {
      const token = localStorage.getItem('elog_token');
      const res = await fetch(`${apiBase}/staff/${user.id}/students/${selectedStudent.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to delete student');
      }
      toast.success('Student deleted');
      closeDeleteConfirmModal();
      setSelectedStudent(null);
      fetchStudents();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete student');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Logic to process CSV will be added here
      console.log('Uploading file:', file.name);
      closeBulkUploadModal();
    }
  };

  const sampleCsvData = "name,email,specialization\nLiam Smith,liam.smith@example.com,Cardiology\nAva Johnson,ava.johnson@example.com,Neurology";
  const sampleCsvBlob = new Blob([sampleCsvData], { type: 'text/csv' });
  const sampleCsvUrl = URL.createObjectURL(sampleCsvBlob);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Student Management</h1>
        <div className="flex space-x-2 mt-4 sm:mt-0">
          <Button onClick={openAddStudentModal}>
            <Plus className="w-4 h-4 mr-2" />
            Add New Student
          </Button>
          <Button variant="outline" onClick={openBulkUploadModal}>
            <Upload className="w-4 h-4 mr-2" />
            Bulk Upload
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:flex-grow">
          <Input
            type="text"
            placeholder="Search students..."
            className="pl-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-full md:w-[180px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Sort: Name A-Z</SelectItem>
              <SelectItem value="name-desc">Sort: Name Z-A</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Filter: All</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Completed Residency">Completed Residency</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600">
            <Button variant={viewMode === 'card' ? 'primary' : 'outline'} size="sm" onClick={() => setViewMode('card')} className="rounded-r-none">
              <LayoutGrid className="w-5 h-5" />
            </Button>
            <Button variant={viewMode === 'list' ? 'primary' : 'outline'} size="sm" onClick={() => setViewMode('list')} className="rounded-l-none">
              <List className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12"><p className="text-gray-500 dark:text-gray-400 text-lg">Loading students...</p></div>
          ) : filteredStudents.length > 0 ? (
            filteredStudents.map((student) => (
              <div key={student.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-between transition-transform transform hover:scale-105">
                <div className="flex items-center space-x-4">
                  {student.avatarUrl ? (
                    // eslint-disable-next-line jsx-a11y/img-redundant-alt
                    <img src={student.avatarUrl} alt={`${student.name} avatar`} className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                  ) : (
                    <UserCircle2 className="w-12 h-12 text-gray-400" />
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{student.name}</h3>
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          student.status === 'Active'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}
                      >
                        {student.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{student.email}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{student.major}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-2 mt-6">
                  <Tooltip text="View Logs">
                    <Button variant="outline" size="icon" onClick={() => handleViewLogs(student)}>
                      <FileText className="w-4 h-4" />
                    </Button>
                  </Tooltip>
                  <Tooltip text="Generate Report">
                    <Button variant="outline" size="icon" onClick={() => handleGenerateReport(student)}>
                      <BarChart2 className="w-4 h-4" />
                    </Button>
                  </Tooltip>
                  <Tooltip text="Edit">
                    <Button variant="outline" size="icon" onClick={() => handleEditStudent(student)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </Tooltip>
                  <Tooltip text="Delete">
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteStudent(student)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </Tooltip>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 text-lg">No students found.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200 dark:border-gray-700">
                <TableCell isHeader className="px-6 py-3 text-left text-gray-900 dark:text-white font-semibold">Student Name</TableCell>
                <TableCell isHeader className="px-6 py-3 text-left text-gray-900 dark:text-white font-semibold">Email</TableCell>
                <TableCell isHeader className="px-6 py-3 text-left text-gray-900 dark:text-white font-semibold">Specialization</TableCell>
                <TableCell isHeader className="px-6 py-3 text-left text-gray-900 dark:text-white font-semibold">Status</TableCell>
                <TableCell isHeader className="px-6 py-3 text-right text-gray-900 dark:text-white font-semibold">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell className="px-6 py-4" colSpan={5}>Loading students...</TableCell>
                </TableRow>
              ) : filteredStudents.map((student) => (
                <TableRow key={student.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                  <TableCell className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{student.name}</TableCell>
                  <TableCell className="px-6 py-4 text-gray-700 dark:text-gray-300">{student.email}</TableCell>
                  <TableCell className="px-6 py-4 text-gray-700 dark:text-gray-300">{student.major}</TableCell>
                  <TableCell className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        student.status === 'Active'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}
                    >
                      {student.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Tooltip text="View Logs">
                        <Button variant="outline" size="icon" onClick={() => handleViewLogs(student)}>
                          <FileText className="w-4 h-4" />
                        </Button>
                      </Tooltip>
                      <Tooltip text="Generate Report">
                        <Button variant="outline" size="icon" onClick={() => handleGenerateReport(student)}>
                          <BarChart2 className="w-4 h-4" />
                        </Button>
                      </Tooltip>
                      <Tooltip text="Edit">
                        <Button variant="outline" size="icon" onClick={() => handleEditStudent(student)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Tooltip>
                      <Tooltip text="Delete">
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteStudent(student)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Student Modal */}
      <Modal isOpen={isAddStudentModalOpen} onClose={closeAddStudentModal} title="Add New Student">
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right dark:text-gray-300">Name</Label>
            <Input id="name" name="name" value={newStudent.name} onChange={handleFormChange} className="col-span-3" placeholder="e.g., John Doe" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right dark:text-gray-300">Email</Label>
            <Input id="email" name="email" type="email" value={newStudent.email} onChange={handleFormChange} className="col-span-3" placeholder="e.g., john.doe@example.com" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="major" className="text-right dark:text-gray-300">Specialization</Label>
            <Input id="major" name="major" value={newStudent.major} onChange={handleFormChange} className="col-span-3" placeholder="e.g., Cardiology" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right dark:text-gray-300">Registration No.</Label>
            <Input name="registrationNo" value={newStudent.registrationNo} onChange={handleFormChange} className="col-span-3" placeholder="e.g., REG/2025/001" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right dark:text-gray-300">Program</Label>
            <Input name="programName" value={newStudent.programName} onChange={handleFormChange} className="col-span-3" placeholder="e.g., MBBS" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right dark:text-gray-300">Academic Year</Label>
            <Input name="academicYear" value={newStudent.academicYear} onChange={handleFormChange} className="col-span-3" placeholder="e.g., 2024-2025" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right dark:text-gray-300">Semester</Label>
            <Input name="semester" value={newStudent.semester} onChange={handleFormChange} className="col-span-3" placeholder="e.g., 6" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right dark:text-gray-300">Rotation Name</Label>
            <Input name="rotationName" value={newStudent.rotationName} onChange={handleFormChange} className="col-span-3" placeholder="e.g., Gynaecology" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right dark:text-gray-300">Rotation Start</Label>
            <Input name="rotationStartDate" type="date" value={newStudent.rotationStartDate} onChange={handleFormChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right dark:text-gray-300">Rotation End</Label>
            <Input name="rotationEndDate" type="date" value={newStudent.rotationEndDate} onChange={handleFormChange} className="col-span-3" />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={closeAddStudentModal}>Cancel</Button>
            <Button onClick={handleSaveStudent}>Save Student</Button>
          </div>
        </div>
      </Modal>

      

      {/* Bulk Upload Modal */}
      <Modal isOpen={isBulkUploadModalOpen} onClose={closeBulkUploadModal} title="Bulk Upload Students">
        <div className="grid gap-4 py-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 col-span-4">
            Upload a CSV file with student information. The file should contain the following columns: `name`, `email`, and `specialization`.
          </p>
          <div className="col-span-4">
            <a href={sampleCsvUrl} download="sample_students.csv" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
              Download Sample CSV File
            </a>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="csv-file" className="text-right">CSV File</Label>
            <Input id="csv-file" type="file" accept=".csv" onChange={handleFileUpload} className="col-span-3" />
          </div>
          <div className="flex justify-end pt-4 col-span-4">
            <Button variant="outline" onClick={closeBulkUploadModal}>Close</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Student Modal */}
      {editingStudent && (
        <Modal isOpen={isEditStudentModalOpen} onClose={closeEditStudentModal} title={`Edit ${editingStudent.name}`}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name-edit" className="text-right dark:text-gray-300">Name</Label>
              <Input id="name-edit" name="name" value={editingStudent.name} onChange={handleFormChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email-edit" className="text-right dark:text-gray-300">Email</Label>
              <Input id="email-edit" name="email" type="email" value={editingStudent.email} onChange={handleFormChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="major-edit" className="text-right dark:text-gray-300">Specialization</Label>
              <Input id="major-edit" name="major" value={editingStudent.major} onChange={handleFormChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right dark:text-gray-300">Registration No.</Label>
              <Input name="registrationNo" value={editingStudent.registrationNo || ''} onChange={handleFormChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right dark:text-gray-300">Program</Label>
              <Input name="programName" value={editingStudent.programName || ''} onChange={handleFormChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right dark:text-gray-300">Academic Year</Label>
              <Input name="academicYear" value={editingStudent.academicYear || ''} onChange={handleFormChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right dark:text-gray-300">Semester</Label>
              <Input name="semester" value={editingStudent.semester || ''} onChange={handleFormChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status-edit" className="text-right dark:text-gray-300">Status</Label>
              <Select name="status" value={editingStudent.status} onValueChange={(value) => handleFormChange({ target: { name: 'status', value } } as any)}>
                <SelectTrigger className="col-span-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Completed Residency">Completed Residency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={closeEditStudentModal}>Cancel</Button>
              <Button onClick={handleUpdateStudent}>Save Changes</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {selectedStudent && (
        <Modal isOpen={isDeleteConfirmModalOpen} onClose={closeDeleteConfirmModal} title="Confirm Deletion">
          <div className="space-y-4">
            <p>Are you sure you want to delete the student "{selectedStudent.name}"? This action cannot be undone.</p>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={closeDeleteConfirmModal}>Cancel</Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>Delete</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StudentManagement;
