import React, { useEffect, useMemo, useState } from 'react';
import { Edit, Trash2, BookMarked, Search, List, Grid, ChevronLeft, ChevronRight } from 'lucide-react';
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
  managerName: string; // HOD
  email: string;
};

const initialDepartments: Department[] = [];

const DepartmentManagement: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [newDepartment, setNewDepartment] = useState({ name: '', managerName: '', email: '' });
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortKey, setSortKey] = useState<'name' | 'managerName' | 'email'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // list view default; grid will use 9 by layout
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = useMemo(() => (import.meta.env.VITE_API_URL || 'http://localhost:4000') as string, []);
  const token = typeof window !== 'undefined' ? localStorage.getItem('elog_token') : null;

  const { isOpen: isAddDeptModalOpen, openModal: openAddDeptModal, closeModal: closeAddDeptModal } = useModal();
  const { isOpen: isEditDeptModalOpen, openModal: openEditDeptModal, closeModal: closeEditDeptModal } = useModal();
  const { isOpen: isDeleteConfirmOpen, openModal: openDeleteConfirm, closeModal: closeDeleteConfirm } = useModal();
  const { isOpen: isBulkOpen, openModal: openBulkModal, closeModal: closeBulkModal } = useModal();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (editingDepartment) {
      setEditingDepartment(prevState => ({ ...prevState!, [name]: value }));
    } else {
      setNewDepartment(prevState => ({ ...prevState, [name]: value }));
    }
  };

  const fetchDepartments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/org/departments`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }

      const data = await response.json();
      const mapped: Department[] = (data || []).map((d: any) => ({
        id: String(d.id),
        name: d.name,
        managerName: d.managerName || '',
        email: d.email,
      }));
      setDepartments(mapped);
    } catch (e: any) {
      setError(e?.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // restore preferred view
    const savedView = typeof window !== 'undefined' ? localStorage.getItem('dept_view_mode') : null;
    if (savedView === 'grid' || savedView === 'list') setViewMode(savedView);
    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // persist preferred view
    if (typeof window !== 'undefined') {
      localStorage.setItem('dept_view_mode', viewMode);
    }
  }, [viewMode]);

  // Reset to page 1 when filters/sort change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, sortKey, sortDir, viewMode]);

  const handleEditDepartment = (dept: Department) => {
    setEditingDepartment({ ...dept });
    openEditDeptModal();
  };

  const handleUpdateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDepartment) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/org/departments/${editingDepartment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editingDepartment.name,
          managerName: editingDepartment.managerName,
          email: editingDepartment.email
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update department');
      }

      // Update the local state with the updated department
      setDepartments(departments.map(dept => 
        dept.id === editingDepartment.id ? editingDepartment : dept
      ));
      
      closeEditDeptModal();
      setEditingDepartment(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update department';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDepartment = async (dept: Department) => {
    setDeletingDepartment(dept);
    openDeleteConfirm();
  };

  const confirmDeleteDepartment = async () => {
    if (!deletingDepartment) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/org/departments/${deletingDepartment.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete department');
      }

      // Update the local state
      setDepartments(departments.filter(dept => dept.id !== deletingDepartment.id));
      closeDeleteConfirm();
      setDeletingDepartment(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete department';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDepartment) {
      await handleUpdateDepartment(e);
    } else {
      // Add new department
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_BASE}/org/departments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newDepartment)
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to add department');
        }

        const data = await response.json();
        setDepartments([...departments, {
          id: String(data.id),
          name: data.name,
          managerName: data.managerName || '',
          email: data.email
        }]);
        setNewDepartment({ name: '', managerName: '', email: '' });
        closeAddDeptModal();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to add department';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.managerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedDepartments = [...filteredDepartments].sort((a, b) => {
    const aVal = (a[sortKey] || '').toLowerCase();
    const bVal = (b[sortKey] || '').toLowerCase();
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const isGrid = viewMode === 'grid';
  const effectivePageSize = isGrid ? 9 : pageSize;
  const totalPages = Math.max(1, Math.ceil(sortedDepartments.length / effectivePageSize));
  const startIdx = (page - 1) * effectivePageSize;
  const pagedDepartments = sortedDepartments.slice(startIdx, startIdx + effectivePageSize);

  const changeSort = (key: 'name' | 'managerName' | 'email') => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="bg-white/90 dark:bg-gray-800/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 supports-[backdrop-filter]:dark:bg-gray-800/60 p-6 rounded-2xl shadow ring-1 ring-gray-200 dark:ring-gray-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Department Management</h1>
            <p className="text-sm text-gray-600 dark:text-white">Manage all departments in the organization.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1 text-xs text-gray-700 dark:text-white bg-gray-50 dark:bg-gray-900/40">
              {departments.length} total
            </span>
            <Button onClick={openAddDeptModal}>Add New Department</Button>
            <Button variant="outline" onClick={openBulkModal}>Bulk Add</Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">{error}</div>
        )}
        {loading && (
          <div className="mb-4 p-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-md dark:bg-gray-800/50 dark:border-gray-700 dark:text-white">
            Loading departments...
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-4">
          <div className="relative w-full sm:w-auto">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search departments..."
              className="pl-10 w-full sm:w-72 bg-white dark:bg-gray-900/60 border-gray-200 dark:border-gray-700 focus-visible:ring-2 focus-visible:ring-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Tooltip text="List View">
              <Button aria-label="List view" variant={viewMode === 'list' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('list')}>
                <List className="h-5 w-5" />
              </Button>
            </Tooltip>
            <Tooltip text="Grid View">
              <Button aria-label="Grid view" variant={viewMode === 'grid' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('grid')}>
                <Grid className="h-5 w-5" />
              </Button>
            </Tooltip>
          </div>
        </div>
        {sortedDepartments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-white">
              <BookMarked className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">No departments found</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-white">Try adjusting your search or add a new department.</p>
            <div className="mt-4 flex gap-2">
              <Button onClick={openAddDeptModal}>Add Department</Button>
              <Button variant="outline" onClick={() => setSearchTerm('')}>Clear Search</Button>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-visible">
            <div>
              <Table className="w-full table-auto">
                <colgroup>
                  <col className="w-[35%]" />
                  <col className="w-[25%]" />
                  <col />
                  <col className="w-[160px]" />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableCell className="font-semibold text-left text-gray-900 dark:text-white p-3">
                      <button type="button" onClick={() => changeSort('name')} className="inline-flex items-center gap-2">
                        Department Name
                        {sortKey === 'name' && <span className="text-xs text-gray-500">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                      </button>
                    </TableCell>
                    <TableCell className="font-semibold text-left text-gray-900 dark:text-white p-3">
                      <button type="button" onClick={() => changeSort('managerName')} className="inline-flex items-center gap-2">
                        Managed By (HOD)
                        {sortKey === 'managerName' && <span className="text-xs text-gray-500">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                      </button>
                    </TableCell>
                    <TableCell className="font-semibold text-left text-gray-900 dark:text-white p-3">
                      <button type="button" onClick={() => changeSort('email')} className="inline-flex items-center gap-2">
                        Email
                        {sortKey === 'email' && <span className="text-xs text-gray-500">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                      </button>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-gray-900 dark:text-white p-3 pr-6 md:pr-8">Actions</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedDepartments.map(dept => (
                    <TableRow key={dept.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                      <TableCell className="p-3 text-gray-900 dark:text-white align-middle whitespace-nowrap">
                        <span className="block truncate" title={dept.name}>{dept.name}</span>
                      </TableCell>
                      <TableCell className="p-3 text-gray-700 dark:text-white align-middle whitespace-nowrap">
                        <span className="block truncate" title={dept.managerName}>{dept.managerName}</span>
                      </TableCell>
                      <TableCell className="p-3 text-gray-700 dark:text-white align-middle whitespace-nowrap">
                        <span className="block truncate" title={dept.email}>{dept.email}</span>
                      </TableCell>
                      <TableCell className="text-right p-3 pr-6 md:pr-8">
                        <div className="inline-flex justify-end items-center gap-1.5 flex-nowrap">
                          <Tooltip text="View Department">
                            <span className="inline-flex">
                              <Link to={`/organization-admin/department/${dept.id}`}>
                                <button aria-label="View Department" className="inline-flex h-8 w-8 items-center justify-center bg-transparent text-gray-500 hover:text-indigo-500 dark:text-white dark:hover:text-indigo-400 transition-colors">
                                  <BookMarked className="h-4 w-4" />
                                </button>
                              </Link>
                            </span>
                          </Tooltip>
                          <Tooltip text="Edit Department">
                            <span className="inline-flex">
                              <button aria-label="Edit Department" onClick={() => handleEditDepartment(dept)} className="inline-flex h-8 w-8 items-center justify-center bg-transparent text-gray-500 hover:text-indigo-500 dark:text-white dark:hover:text-indigo-400 transition-colors">
                                <Edit className="h-4 w-4" />
                              </button>
                            </span>
                          </Tooltip>
                          <Tooltip text="Delete Department">
                            <span className="inline-flex">
                              <button aria-label="Delete Department" onClick={() => handleDeleteDepartment(dept)} className="inline-flex h-8 w-8 items-center justify-center bg-transparent text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </span>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-white">
                <span>Rows per page:</span>
                <select
                  className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white px-2 py-1"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="ml-2">Page {page} of {totalPages}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 overflow-visible">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {pagedDepartments.map(dept => (
                <div
                  key={dept.id}
                  className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 p-6 flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-0.5"
                >
                  <div>
                    <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      <BookMarked className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{dept.name}</h2>
                    <p className="text-sm text-gray-600 dark:text-white">HOD: {dept.managerName}</p>
                    <p className="text-sm text-gray-600 dark:text-white">Email: {dept.email}</p>
                  </div>
                  <div className="flex justify-end items-center gap-1.5 mt-5">
                    <Tooltip text="View Department">
                      <span className="inline-flex relative">
                        <Link to={`/organization-admin/department/${dept.id}`}> 
                          <button aria-label="View Department" className="inline-flex h-8 w-8 items-center justify-center bg-transparent text-gray-500 hover:text-indigo-500 dark:text-white dark:hover:text-indigo-400 transition-colors">
                            <BookMarked className="h-4 w-4" />
                          </button>
                        </Link>
                      </span>
                    </Tooltip>
                    <Tooltip text="Edit Department">
                      <span className="inline-flex relative">
                        <button aria-label="Edit Department" onClick={() => handleEditDepartment(dept)} className="inline-flex h-8 w-8 items-center justify-center bg-transparent text-gray-500 hover:text-indigo-500 dark:text-white dark:hover:text-indigo-400 transition-colors">
                          <Edit className="h-4 w-4" />
                        </button>
                      </span>
                    </Tooltip>
                    <Tooltip text="Delete Department">
                      <span className="inline-flex relative">
                        <button aria-label="Delete Department" onClick={() => handleDeleteDepartment(dept)} className="inline-flex h-8 w-8 items-center justify-center bg-transparent text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </span>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600 dark:text-white">Page {page} of {totalPages}</span>
              <Button variant="outline" size="icon" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Department Modal */}
      <Modal isOpen={isAddDeptModalOpen} onClose={closeAddDeptModal} title="Add New Department">
        <form onSubmit={handleSubmit} className="grid gap-4 py-4 text-gray-800 dark:text-white">
          <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
            <Label htmlFor="dept-name" className="sm:text-right dark:text-white">Department Name</Label>
            <Input id="dept-name" name="name" placeholder="e.g., Cardiology" className="sm:col-span-3 bg-white dark:bg-gray-900 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-700" value={newDepartment.name} onChange={handleInputChange} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
            <Label htmlFor="manager-name" className="sm:text-right dark:text-white">Managed By (HOD)</Label>
            <Input id="manager-name" name="managerName" placeholder="e.g., Dr. John Watson" className="sm:col-span-3 bg-white dark:bg-gray-900 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-700" value={newDepartment.managerName} onChange={handleInputChange} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
            <Label htmlFor="dept-email" className="sm:text-right dark:text-white">Department Email</Label>
            <Input id="dept-email" name="email" placeholder="e.g., cardio@example.com" className="sm:col-span-3 bg-white dark:bg-gray-900 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-700" value={newDepartment.email} onChange={handleInputChange} />
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={closeAddDeptModal}>Cancel</Button>
            <Button type="submit">Save Department</Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Add Modal */}
      <BulkAddModal isOpen={isBulkOpen} onClose={closeBulkModal} onSubmit={async (rows) => {
        setError(null);
        try {
          const res = await fetch(`${API_BASE}/org/departments/bulk`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ departments: rows }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.error || 'Bulk create failed');
          }
          await fetchDepartments();
          closeBulkModal();
        } catch (e: any) {
          setError(e?.message || 'Bulk create failed');
        }
      }} />

      {/* Edit Department Modal */}
      {editingDepartment && (
        <Modal isOpen={isEditDeptModalOpen} onClose={closeEditDeptModal} title={`Edit ${editingDepartment.name}`}>
          <form onSubmit={handleUpdateDepartment} className="grid gap-4 py-4 text-gray-800 dark:text-white">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="dept-name" className="sm:text-right dark:text-white">Department Name</Label>
              <Input id="name" name="name" className="sm:col-span-3 bg-white dark:bg-gray-900 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-700" value={editingDepartment?.name || ''} onChange={handleInputChange} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="manager-name" className="sm:text-right dark:text-white">HOD Name</Label>
              <Input id="managerName" name="managerName" className="sm:col-span-3 bg-white dark:bg-gray-900 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-700" value={editingDepartment?.managerName || ''} onChange={handleInputChange} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="dept-email" className="sm:text-right dark:text-white">Department Email</Label>
              <Input id="email" name="email" className="sm:col-span-3 bg-white dark:bg-gray-900 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-700" value={editingDepartment?.email || ''} onChange={handleInputChange} />
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={closeEditDeptModal}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingDepartment && (
        <Modal isOpen={isDeleteConfirmOpen} onClose={closeDeleteConfirm} title="Confirm Delete">
          <p className="text-gray-800 dark:text-white">Are you sure you want to delete the department "{deletingDepartment?.name}"? This action cannot be undone.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={closeDeleteConfirm} disabled={loading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteDepartment} disabled={loading}>
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DepartmentManagement;

// --- Bulk Add Modal ---
type BulkRow = { name: string; managerName: string; email: string };

const BulkAddModal: React.FC<{ isOpen: boolean; onClose: () => void; onSubmit: (rows: BulkRow[]) => void }>
  = ({ isOpen, onClose, onSubmit }) => {
  const [csv, setCsv] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  const parseCsv = (): BulkRow[] => {
    const lines = csv.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const rows: BulkRow[] = [];
    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length < 3) {
        throw new Error('Each line must be: name, managerName, email');
      }
      const [name, managerName, email] = parts;
      rows.push({ name, managerName, email });
    }
    return rows;
  };

  const handleSubmit = () => {
    try {
      setParseError(null);
      const rows = parseCsv();
      onSubmit(rows);
    } catch (e: any) {
      setParseError(e?.message || 'Invalid input');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Add Departments">
      <div className="space-y-3 py-2">
        <p className="text-sm text-gray-600 dark:text-white">
          Paste CSV lines in the format: <code>name, managerName, email</code>
        </p>
        <textarea
          className="w-full h-48 p-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white"
          placeholder="Cardiology, Dr. John Watson, cardio@example.com\nNeurology, Dr. Strange, neuro@example.com"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
        />
        {parseError && <div className="p-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded">{parseError}</div>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Create</Button>
        </div>
      </div>
    </Modal>
  );
};
