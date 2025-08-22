import React from 'react';
import { Building, Users, Stethoscope, BarChart2 } from 'lucide-react';
import DepartmentStaffChart from '../../components/charts/DepartmentStaffChart';
import DepartmentStudentChart from '../../components/charts/DepartmentStudentChart';
import { departments, allStaff, allStudents } from '../../data/mockData';

const OrganizationAdminDashboard: React.FC = () => {
  const departmentData = departments.map(dept => ({
    ...dept,
    staffCount: allStaff.filter(s => s.departmentId === dept.id).length,
    studentCount: allStudents.filter(st => st.departmentId === dept.id).length,
  }));

  const totalDepartments = departments.length;
  const totalStaff = allStaff.length;
  const totalStudents = allStudents.length;

  const stats = [
    {
      title: 'Total Departments',
      value: totalDepartments.toString(),
      icon: <Building className="h-8 w-8 text-blue-500" />,
    },
    {
      title: 'Total Staff',
      value: totalStaff.toString(),
      icon: <Users className="h-8 w-8 text-green-500" />,
    },
    {
      title: 'Total Patients',
      value: totalStudents.toString(),
      icon: <Stethoscope className="h-8 w-8 text-yellow-500" />,
    },
    {
      title: 'Analytics Overview',
      value: 'View Details',
      icon: <BarChart2 className="h-8 w-8 text-purple-500" />,
    },
  ];

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Organization Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Welcome back, Admin!</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex items-center space-x-4">
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-full">
              {stat.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <DepartmentStaffChart data={departmentData} />
        <DepartmentStudentChart data={departmentData} />
      </div>
    </div>
  );
};

export default OrganizationAdminDashboard;
