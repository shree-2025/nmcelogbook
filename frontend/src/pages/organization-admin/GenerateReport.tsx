import React, { useState, useRef } from 'react';
import Button from '../../components/ui/button/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { allStaff, allStudents, allActivityLogs, departments } from '../../data/mockData';

const GenerateReport: React.FC = () => {
  const [reportType, setReportType] = useState<string>('');
  const reportContentRef = useRef<HTMLDivElement>(null);

  const handleGenerateReport = () => {
    if (!reportType) {
      alert('Please select a report type.');
      return;
    }

    if (reportContentRef.current) {
      html2canvas(reportContentRef.current).then((canvas: HTMLCanvasElement) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${reportType}-report.pdf`);
      });
    }
  };

  const renderReportContent = () => {
    if (!reportType) return null;

    const commonTableStyle = {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '20px',
    } as React.CSSProperties;

    const commonCellStyle = {
      border: '1px solid #ddd',
      padding: '8px',
      textAlign: 'left',
    } as React.CSSProperties;

    const headerCellStyle = {
      ...commonCellStyle,
      backgroundColor: '#f2f2f2',
      fontWeight: 'bold',
    } as React.CSSProperties;


    switch (reportType) {
      case 'staff':
        return (
          <div>
            <h2>Staff Report</h2>
            <table style={commonTableStyle}>
              <thead>
                <tr>
                  <th style={headerCellStyle}>Name</th>
                  <th style={headerCellStyle}>Role</th>
                  <th style={headerCellStyle}>Department</th>
                </tr>
              </thead>
              <tbody>
                {allStaff.map(staff => (
                  <tr key={staff.id}>
                    <td style={commonCellStyle}>{staff.name}</td>
                    <td style={commonCellStyle}>{staff.role}</td>
                    <td style={commonCellStyle}>{departments.find(d => d.id === staff.departmentId)?.name || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'students':
        return (
          <div>
            <h2>Student Report</h2>
            <table style={commonTableStyle}>
              <thead>
                <tr>
                  <th style={headerCellStyle}>Name</th>
                  <th style={headerCellStyle}>Registration No.</th>
                  <th style={headerCellStyle}>Department</th>
                </tr>
              </thead>
              <tbody>
                {allStudents.map(student => (
                  <tr key={student.id}>
                    <td style={commonCellStyle}>{student.name}</td>
                    <td style={commonCellStyle}>{student.regNo}</td>
                    <td style={commonCellStyle}>{departments.find(d => d.id === student.departmentId)?.name || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'activity':
        return (
          <div>
            <h2>Activity Log Report</h2>
            <table style={commonTableStyle}>
              <thead>
                <tr>
                  <th style={headerCellStyle}>Submitted By</th>
                  <th style={headerCellStyle}>Activity</th>
                  <th style={headerCellStyle}>Date</th>
                  <th style={headerCellStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {allActivityLogs.map(log => (
                  <tr key={log.id}>
                    <td style={commonCellStyle}>{log.submittedBy}</td>
                    <td style={commonCellStyle}>{log.activity}</td>
                    <td style={commonCellStyle}>{log.date}</td>
                    <td style={commonCellStyle}>{log.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'departments':
        return (
          <div>
            <h2>Departments Report</h2>
            <table style={commonTableStyle}>
              <thead>
                <tr>
                  <th style={headerCellStyle}>Name</th>
                  <th style={headerCellStyle}>Head of Department</th>
                </tr>
              </thead>
              <tbody>
                {departments.map(dept => (
                  <tr key={dept.id}>
                    <td style={commonCellStyle}>{dept.name}</td>
                    <td style={commonCellStyle}>{dept.hod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Generate Report</h1>
          <p className="text-gray-600 dark:text-gray-400">Select a report type to generate.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
          <Select onValueChange={setReportType} value={reportType}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Select report type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="staff">Staff Report</SelectItem>
              <SelectItem value="students">Students Report</SelectItem>
              <SelectItem value="activity">Activity Log Report</SelectItem>
              <SelectItem value="departments">Departments Report</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleGenerateReport} disabled={!reportType}>
            Generate Report
          </Button>
        </div>
      </div>

      {/* Hidden container for PDF generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={reportContentRef} style={{ padding: '20px', backgroundColor: 'white', width: '210mm' }}>
          <h1>Report: {reportType}</h1>
          <p>Generated on: {new Date().toLocaleString()}</p>
          {renderReportContent()}
        </div>
      </div>
    </div>
  );
};

export default GenerateReport;
