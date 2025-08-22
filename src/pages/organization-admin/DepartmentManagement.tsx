import React, { useState } from 'react';
import { Edit, Trash2, BookMarked, Search, List, Grid, Users, User } from 'lucide-react';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '../../components/ui/table';
import Button from '../../components/ui/button/Button';
import Tooltip from '../../components/ui/tooltip/Tooltip';
import { useModal } from '../../hooks/useModal';
import { Modal } from '../../components/ui/modal';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Link } from 'react-router-dom';

type Department = {
  id: string;
  name: string;
  hod: string;
  staffCount: number;
  studentCount: number;
};

const initialDepartments: Department[] = [
  {
    id: '1',
    name: 'Cardiology',
    hod: 'Dr. John Watson',
    staffCount: 25,
    studentCount: 120,
  },
  {
    id: '2',
    name: 'Neurology',
    hod: 'Dr. Stephen Strange',
    staffCount: 15,
    studentCount: 85,
  },
  {
    id: '3',
    name: 'Pediatrics',
    hod: 'Dr. Meredith Grey',
    staffCount: 18,
    studentCount: 95,
  },
];

const DepartmentManagement: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [newDepartment, setNewDepartment] = useState({ name: '', hod: '' });
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState('');

  const { isOpen: isAddDeptModalOpen, openModal: openAddDeptModal, closeModal: closeAddDeptModal } = useModal();
  const { isOpen: isEditDeptModalOpen, openModal: openEditDeptModal, closeModal: closeEditDeptModal } = useModal();
  const { isOpen: isDeleteConfirmOpen, openModal: openDeleteConfirm, closeModal: closeDeleteConfirm } = useModal();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (editingDepartment) {
      setEditingDepartment(prevState => ({ ...prevState!, [name]: value }));
    } else {
      setNewDepartment(prevState => ({ ...prevState, [name]: value }));
    }
  };

  const handleSaveDepartment = () => {
    setDepartments(prevDepartments => [
      ...prevDepartments,
      {
        id: String(prevDepartments.length + 1),
        name: newDepartment.name,
        hod: newDepartment.hod,
        staffCount: 0,
        studentCount: 0,
      },
    ]);
    setNewDepartment({ name: '', hod: '' });
    closeAddDeptModal();
  };

  const handleEditClick = (dept: Department) => {
    setEditingDepartment(dept);
    openEditDeptModal();
  };

  const handleUpdateDepartment = () => {
    if (editingDepartment) {
      setDepartments(prevDepartments =>
        prevDepartments.map(dept => (dept.id === editingDepartment.id ? editingDepartment : dept))
      );
    }
    closeEditDeptModal();
  };

  const handleDeleteClick = (dept: Department) => {
    setDeletingDepartment(dept);
    openDeleteConfirm();
  };

  const handleConfirmDelete = () => {
    if (deletingDepartment) {
      setDepartments(prevDepartments => prevDepartments.filter(dept => dept.id !== deletingDepartment.id));
    }
    closeDeleteConfirm();
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.hod.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Department Management</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage all departments in the organization.</p>
          </div>
          <Button onClick={openAddDeptModal}>Add New Department</Button>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search departments..."
              className="pl-10 w-full sm:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Tooltip text="List View">
              <Button variant={viewMode === 'list' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('list')}>
                <List className="h-5 w-5" />
              </Button>
            </Tooltip>
            <Tooltip text="Grid View">
              <Button variant={viewMode === 'grid' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('grid')}>
                <Grid className="h-5 w-5" />
              </Button>
            </Tooltip>
          </div>
        </div>
        {viewMode === 'list' ? (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell className="font-semibold text-gray-900 dark:text-white p-2">Department Name</TableCell>
                                    <TableCell className="font-semibold text-gray-900 dark:text-white p-2">
                    <span className="hidden sm:inline">Head of Department (HOD)</span>
                    <span className="sm:hidden">HOD</span>
                  </TableCell>
                  <TableCell className="font-semibold text-gray-900 dark:text-white p-2">Staff Count</TableCell>
                  <TableCell className="font-semibold text-gray-900 dark:text-white p-2">Student Count</TableCell>
                  <TableCell className="text-right font-semibold text-gray-900 dark:text-white p-2">Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments.map(dept => (
                  <TableRow key={dept.id}>
                    <TableCell className="p-2 text-gray-900 dark:text-white">{dept.name}</TableCell>
                    <TableCell className="p-2 text-gray-600 dark:text-gray-400">{dept.hod}</TableCell>
                    <TableCell className="p-2 text-gray-600 dark:text-gray-400">{dept.staffCount}</TableCell>
                    <TableCell className="p-2 text-gray-600 dark:text-gray-400">{dept.studentCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2 flex-wrap">
                        <Tooltip text="View Department">
                          <Link to={`/organization-admin/department/${dept.id}`}>
                            <Button variant="outline" size="icon">
                              <BookMarked className="h-5 w-5" />
                            </Button>
                          </Link>
                        </Tooltip>
                        <Tooltip text="Edit Department">
                          <Button variant="outline" size="icon" onClick={() => handleEditClick(dept)}>
                            <Edit className="h-5 w-5" />
                          </Button>
                        </Tooltip>
                        <Tooltip text="Delete Department">
                          <Button variant="destructive" size="icon" onClick={() => handleDeleteClick(dept)}>
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDepartments.map(dept => (
              <div key={dept.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{dept.name}</h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">HOD: {dept.hod}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{dept.staffCount} Staff</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>{dept.studentCount} Patients</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end items-center gap-2 mt-4">
                  <Tooltip text="View Department">
                    <Link to={`/organization-admin/department/${dept.id}`}>
                      <Button variant="outline" size="icon">
                        <BookMarked className="h-5 w-5" />
                      </Button>
                    </Link>
                  </Tooltip>
                  <Tooltip text="Edit Department">
                    <Button variant="outline" size="icon" onClick={() => handleEditClick(dept)}>
                      <Edit className="h-5 w-5" />
                    </Button>
                  </Tooltip>
                  <Tooltip text="Delete Department">
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteClick(dept)}>
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Department Modal */}
      <Modal isOpen={isAddDeptModalOpen} onClose={closeAddDeptModal} title="Add New Department">
        <form className="grid gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
            <Label htmlFor="dept-name" className="sm:text-right">Department Name</Label>
            <Input id="dept-name" name="name" placeholder="e.g., Cardiology" className="sm:col-span-3" value={newDepartment.name} onChange={handleInputChange} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
            <Label htmlFor="hod-name" className="sm:text-right">HOD Name</Label>
            <Input id="hod-name" name="hod" placeholder="e.g., Dr. John Watson" className="sm:col-span-3" value={newDepartment.hod} onChange={handleInputChange} />
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={closeAddDeptModal}>Cancel</Button>
            <Button onClick={handleSaveDepartment}>Save Department</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Department Modal */}
      {editingDepartment && (
        <Modal isOpen={isEditDeptModalOpen} onClose={closeEditDeptModal} title={`Edit ${editingDepartment.name}`}>
          <form className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="dept-name" className="sm:text-right">Department Name</Label>
              <Input id="name" name="name" className="sm:col-span-3" value={editingDepartment.name} onChange={handleInputChange} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="hod-name" className="sm:text-right">HOD Name</Label>
              <Input id="hod" name="hod" className="sm:col-span-3" value={editingDepartment.hod} onChange={handleInputChange} />
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={closeEditDeptModal}>Cancel</Button>
              <Button onClick={handleUpdateDepartment}>Save Changes</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingDepartment && (
        <Modal isOpen={isDeleteConfirmOpen} onClose={closeDeleteConfirm} title="Confirm Deletion">
          <div className="py-4">
            <p>Are you sure you want to delete the <strong>{deletingDepartment.name}</strong> department?</p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={closeDeleteConfirm}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Delete</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DepartmentManagement;
