import React, { useState, useMemo } from 'react';
import { UserPlus, Upload, LayoutGrid, List, Search, Eye, FileText, Edit, Trash2 } from 'lucide-react';
import Button from '../../components/ui/button/Button';
import { useModal } from '../../hooks/useModal';
import { Modal } from '../../components/ui/modal';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import Tooltip from '../../components/ui/tooltip/Tooltip';

const StaffManagement: React.FC = () => {
  const { isOpen: isAddStaffModalOpen, openModal: openAddStaffModal, closeModal: closeAddStaffModal } = useModal();
  const { isOpen: isBulkAddModalOpen, openModal: openBulkAddModal, closeModal: closeBulkAddModal } = useModal();
  const [view, setView] = useState('list'); // 'list' or 'card'
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

  const staff = [
    { name: 'John Doe', email: 'john.doe@example.com', role: 'Lecturer', status: 'Active' },
    { name: 'Jane Smith', email: 'jane.smith@example.com', role: 'Assistant Professor', status: 'Active' },
    { name: 'Peter Jones', email: 'peter.jones@example.com', role: 'Lab Assistant', status: 'Inactive' },
    { name: 'Alice Williams', email: 'alice.w@example.com', role: 'Lecturer', status: 'Active' },
    { name: 'Bob Brown', email: 'bob.b@example.com', role: 'Professor', status: 'Active' },
  ];

  const filteredAndSortedStaff = useMemo(() => {
    return staff
      .filter(member => member.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        if (a.name < b.name) return sortOrder === 'asc' ? -1 : 1;
        if (a.name > b.name) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [staff, searchTerm, sortOrder]);

  const renderListView = () => (
    <div className="w-full bg-white dark:bg-gray-800 p-2 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      <div className="">
        <table className="min-w-full bg-white dark:bg-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAndSortedStaff.map((member, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{member.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{member.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{member.role}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${member.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {member.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2 flex items-center">
                  <Tooltip text="Show Details">
                    <Button variant="outline" size="icon"><Eye className="h-4 w-4" /></Button>
                  </Tooltip>
                  <Tooltip text="Generate Report">
                    <Button variant="outline" size="icon"><FileText className="h-4 w-4" /></Button>
                  </Tooltip>
                  <Tooltip text="Edit">
                    <Button variant="outline" size="icon"><Edit className="h-4 w-4" /></Button>
                  </Tooltip>
                  <Tooltip text="Delete">
                    <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                  </Tooltip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCardView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredAndSortedStaff.map((member, index) => (
        <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{member.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{member.role}</p>
              </div>
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${member.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {member.status}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{member.email}</p>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-2">
            <Button variant="outline" size="sm">Show Details</Button>
            <Button variant="outline" size="sm">Generate Report</Button>
            <Button variant="outline" size="sm">Edit</Button>
            <Button variant="destructive" size="sm">Delete</Button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <Modal isOpen={isAddStaffModalOpen} onClose={closeAddStaffModal} title="Add New Staff">
        <form className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Full Name</Label>
            <Input id="name" placeholder="John Doe" className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">Email</Label>
            <Input id="email" type="email" placeholder="john.doe@example.com" className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">Role</Label>
            <Select>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lecturer">Lecturer</SelectItem>
                <SelectItem value="assistant-professor">Assistant Professor</SelectItem>
                <SelectItem value="lab-assistant">Lab Assistant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={closeAddStaffModal}>Cancel</Button>
            <Button>Add Staff</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isBulkAddModalOpen} onClose={closeBulkAddModal} title="Bulk Add Staff">
        <form className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="csv-file" className="text-right">CSV File</Label>
            <Input id="csv-file" type="file" className="col-span-3" />
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={closeBulkAddModal}>Cancel</Button>
            <Button>Upload</Button>
          </div>
        </form>
      </Modal>

      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Staff Management</h1>
        <div className="flex space-x-2 mt-4 sm:mt-0">
          <Button onClick={openAddStaffModal}><UserPlus className="w-4 h-4 mr-2" />Add Staff</Button>
          <Button variant="outline" onClick={openBulkAddModal}><Upload className="w-4 h-4 mr-2" />Bulk Add</Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-4">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="asc">Sort A-Z</option>
            <option value="desc">Sort Z-A</option>
          </select>
          <div className="flex items-center gap-2">
            <Button variant={view === 'list' ? 'primary' : 'outline'} onClick={() => setView('list')}><List className="w-5 h-5" /></Button>
            <Button variant={view === 'card' ? 'primary' : 'outline'} onClick={() => setView('card')}><LayoutGrid className="w-5 h-5" /></Button>
          </div>
        </div>
      </div>

      {view === 'list' ? renderListView() : renderCardView()}
    </div>
  );
};

export default StaffManagement;
