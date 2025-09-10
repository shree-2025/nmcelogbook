import React from 'react';
import Button from '../../components/ui/button/Button';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

const Reports: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = React.useState<Array<{ id: string; name: string; email: string; avatarUrl?: string }>>([]);
  const [loading, setLoading] = React.useState(false);
  const [reportStudentId, setReportStudentId] = React.useState<string | null>(null);
  const [reportHtml, setReportHtml] = React.useState<string>('');
  const [orgName, setOrgName] = React.useState<string>('');
  const [orgLogoUrl, setOrgLogoUrl] = React.useState<string>('');
  const [deptName, setDeptName] = React.useState<string>('');
  const [overallRemarks, setOverallRemarks] = React.useState<string>('');
  const location = useLocation();

  const apiBase = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';

  const loadStudents = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('elog_token') || '';
      const res = await fetch(`${apiBase}/staff/${user.id}/students`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load students');
      const data: Array<any> = await res.json();
      setStudents(data.map((s) => ({ id: String(s.id), name: s.name, email: s.email, avatarUrl: s.avatarUrl })));
    } catch (e: any) {
      toast.error(e.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { loadStudents(); }, [user?.id]);

  // Load org/department metadata for headers
  React.useEffect(() => {
    const run = async () => {
      if (!user) return;
      try {
        const token = localStorage.getItem('elog_token') || '';
        const r = await fetch(`${apiBase}/staff/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) return;
        const d = await r.json();
        setOrgName(d.organizationName || '');
        setDeptName(d.departmentName || '');
        if (d.organizationAvatarUrl) setOrgLogoUrl(String(d.organizationAvatarUrl));
      } catch {}
    };
    run();
  }, [user?.id]);

  const generateReport = async (studentId: string) => {
    if (!user) return;
    try {
      setReportStudentId(studentId);
      toast.loading('Generating report...');
      const token = localStorage.getItem('elog_token') || '';
      // Fetch logs
      const res = await fetch(`${apiBase}/staff/${user.id}/student-logs?studentId=${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch logs');
      const logs: Array<any> = await res.json();
      // Fetch full student profile
      const rProfile = await fetch(`${apiBase}/staff/${user.id}/student/${studentId}/profile`, { headers: { Authorization: `Bearer ${token}` } });
      const student = rProfile.ok ? await rProfile.json() : students.find(s => s.id === studentId);

      const cover = `
        <section class="page cover" id="cover">
          <div class="logo-flex"><img src="${orgLogoUrl || '/images/logo/logo.svg'}" alt="College Logo" style="max-height:90px;width:auto;object-fit:contain;" /></div>
          <div class="title">LOG BOOK</div>
          <div class="subtitle" style="font-weight:700;color:#111827;">Resident Training Programme</div>
          <div class="banner"></div>
          <div class="subtitle" style="margin-top:6px;">Department of Obstetrics &amp; Gynaecology</div>
          <div class="subtitle">Shri Guru Ram Rai Institute of Medical and Health Sciences</div>
          <div class="subtitle">Patel Nagar, Dehradun</div>
          <div class="cover-card">
            <div class="kv-grid">
              <div>Program: ${student?.programName || '-'}</div>
              <div>Academic Year: ${student?.academicYear || '-'}</div>
              <div>Rotation: ${student?.rotationName || '-'}${student?.rotationStartDate ? ` (${new Date(student.rotationStartDate).toLocaleDateString()} - ${student?.rotationEndDate ? new Date(student.rotationEndDate).toLocaleDateString() : '-'})` : ''}</div>
              <div>Assigned Teacher: ${user?.name || '-'}</div>
              <div class="kv-span student">Student: ${student?.name || '-'} (${student?.email || ''})</div>
              <div>Registration No.: ${student?.registrationNo || '-'}</div>
              <div>University Reg. No.: ${student?.universityRegNo || '-'}</div>
              <div>Roll No.: ${student?.rollNo || '-'}</div>
              <div></div>
              <div class="kv-span divider"></div>
              <div><strong>Head of Department:</strong> ${student?.hodName || '-'}</div>
              <div><strong>Principal:</strong> ${student?.principalName || '-'}</div>
            </div>
          </div>
        </section>`;

      

      const toc = `
        <section class="page" id="toc">
          <h2>Table of Contents</h2>
          <ol class="toc">
            <li>CV of the Resident <span class="toc-page" data-target="cv"></span></li>
            <li>Acknowledgement <span class="toc-page" data-target="ack"></span></li>
            <li>Activities <span class="toc-page" data-target="activities"></span></li>
            <li>Final Certificate <span class="toc-page" data-target="final-cert"></span></li>
          </ol>
        </section>`;

      const cvSection = `
        <section class="page" id="cv">
          <h2 class="section-title"><span class="bar"></span>CV of the Resident</h2>
          <div class="card" style="padding:12px;">
            <div class="cv-grid">
              <div><strong>Name:</strong> ${student?.name || '___________________________'}</div>
              <div><strong>DOB:</strong> ${student?.dob ? new Date(student.dob).toLocaleDateString() : '___________________________'}</div>
              <div><strong>Email:</strong> ${student?.email || '___________________________'}</div>
              <div><strong>Phone:</strong> ${student?.phone || '___________________________'}</div>
              <div><strong>Registration No.:</strong> ${student?.registrationNo || '___________________________'}</div>
              <div><strong>University Reg. No.:</strong> ${student?.universityRegNo || '___________________________'}</div>
              <div><strong>Roll No.:</strong> ${student?.rollNo || '___________________________'}</div>
              <div><strong>Program:</strong> ${student?.programName || '___________________________'}</div>
              <div><strong>Academic Year:</strong> ${student?.academicYear || '___________________________'}</div>
              <div class="cv-span"><strong>Address (Local & Permanent):</strong> ${student?.address || '___________________________'}</div>
            </div>
            <div style="margin-top:10px;"><strong>Qualifications</strong></div>
            <table class="tbl" style="margin-top:6px;">
              <thead><tr><th>Degree</th><th>Year</th><th>College</th><th>University</th></tr></thead>
              <tbody>${Array.from({length:4}).map(()=>`<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>`).join('')}</tbody>
            </table>
            <div style="margin-top:10px;" class="cv-grid">
              <div><strong>Date of Joining:</strong> ___________________________</div>
              <div><strong>Title of Thesis:</strong> ___________________________</div>
              <div><strong>Thesis Dates:</strong> Start _____ / Submission _____</div>
              <div><strong>Supervisor:</strong> ${student?.adviserName || '____________________'}</div>
            </div>
          </div>
        </section>`;

      const acknowledgement = `
        <section class="page" id="ack">
          <h2>Acknowledgement</h2>
          <div class="card ack">
            <p>I acknowledge the guidance and constant support provided by my teachers, the Department of Obstetrics &amp; Gynaecology, and the institute in the successful completion of this Log Book. Their mentorship has been instrumental in shaping my academic growth and clinical competence.</p>
            <p>I also express my sincere gratitude to all patients and their families for their cooperation during my residency training.</p>
            <div class="spacer"></div>
            <div>Date: _____________ &nbsp;&nbsp; Signature of Candidate: __________________</div>
          </div>
        </section>`;

      const activities = `
        <section class="page" id="activities">
          <h2 class="section-title"><span class="bar"></span>Activities <span class="badge" style="margin-left:8px;">${logs.length} entries</span></h2>
          ${overallRemarks ? `<div class="remarks"><strong>Overall Remarks:</strong> ${overallRemarks.replace(/</g,'&lt;')}</div>` : ''}
          <table class="tbl">
            <thead>
              <tr>
                <th class="nowrap">Date</th>
                <th>Title</th>
                <th>Activity Type</th>
                <th class="nowrap">Status</th>
                <th>Description</th>
                <th class="nowrap">Attachments</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map((l) => `
                <tr>
                  <td class="nowrap">${new Date(l.activityDate).toLocaleDateString()}</td>
                  <td>${(l.title || '(untitled)').toString().replace(/</g,'&lt;')}</td>
                  <td>${(l.activityType || '').toString().replace(/</g,'&lt;')}</td>
                  <td class="nowrap">
                    <span class="chip status-${String(l.status||'').toLowerCase()}">${l.status}</span>
                  </td>
                  <td class="wrap">${(l.detailedDescription || '-').toString().replace(/</g,'&lt;')}</td>
                  <td class="nowrap muted">${Array.isArray(l.attachments) ? l.attachments.length : 0}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </section>`;

      const certificate = `
        <section class="page" id="final-cert">
          <h2>Final Certificate</h2>
          <div class="card wrap">
            <p>This is to certify that <strong>${student?.name || '__________________'}</strong> has pursued the Postgraduate Residency in the <strong>${deptName || '__________________'}</strong> at <strong>${orgName || '__________________'}</strong>, and has maintained the required Log Book of academic and clinical activities under the guidance of the department.</p>
            <p>The entries recorded are, to the best of our knowledge, true and reflect the resident’s academic and clinical exposure during the training period.</p>
            <div class="spacer"></div>
            <div class="sig-grid sig-grid-compact">
              <div class="sig-box"><div class="sig-name">Candidate</div></div>
              <div class="sig-box"><div class="sig-name">Staff/Teacher</div></div>
              <div class="sig-box"><div class="sig-name">Head of Department (${student?.hodName || '_____________'})</div></div>
              <div class="sig-box"><div class="sig-name">Principal (${student?.principalName || '_____________'})</div></div>
            </div>
          </div>
        </section>`;

      

      const styles = `
        <style>
          :root{
            --ink:#0f172a; /* slate-900 */
            --muted:#475569; /* slate-600 */
            --border:#e5e7eb; /* gray-200 */
            --subtle:#f8fafc; /* slate-50 */
            --brand:#4f46e5; /* indigo-600 */
            --brand-50:#eef2ff; /* indigo-50 */
            --success:#16a34a; --warning:#d97706; --danger:#dc2626;
          }
          @media print {
            @page { margin: 10mm; }
            header { position: fixed; top: 0; left: 0; right: 0; height: 18mm; }
            footer { position: fixed; bottom: 0; left: 0; right: 0; height: 14mm; }
            .page { page-break-after: always; }
          }
          * { box-sizing: border-box; }
          body { font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color: var(--ink); }
          header, footer { font-size: 11px; color: var(--muted); display: flex; align-items: center; justify-content: space-between; padding: 8px 4px; border-bottom: 1px solid var(--border); }
          footer { border-top: 1px solid var(--border); border-bottom: none; }
          /* Ensure content doesn't collide with header/footer */
          .page { padding: 26mm 10px 20mm; position: relative; }
          .divider { height:1px; background: var(--border); margin: 14px 0; }
          h2 { font-size: 20px; font-weight: 800; margin: 0 0 12px; letter-spacing: .2px; }
          .section-title { display:flex; align-items:center; gap:8px; }
          .section-title .bar { width:16px; height:16px; background: var(--brand); border-radius:4px; }
          .badge { display:inline-block; padding:2px 8px; font-size:12px; background: var(--brand-50); color: var(--brand); border: 1px solid #c7d2fe; border-radius: 999px; }
          .chip { display:inline-block; padding:2px 8px; font-size:11px; font-weight:700; border-radius:999px; }
          .status-approved { background:#dcfce7; color:#166534; }
          .status-pending { background:#fef3c7; color:#92400e; }
          .status-rejected { background:#fee2e2; color:#991b1b; }

          /* Cover */
          .cover-card{ max-width: 720px; margin: 20px auto; background: white; border:1px solid var(--border); border-radius: 14px; padding: 24px; box-shadow: 0 6px 26px rgba(79,70,229,0.07); }
          .cover .title { font-size: 28px; font-weight: 800; margin: 8px 0 10px; text-align:center; letter-spacing:.3px; }
          .cover .subtitle { font-size: 14px; text-align:center; margin: 3px 0; color: var(--muted); }
          .cover .student { font-size: 18px; font-weight: 700; text-align:center; margin: 14px 0; }
          .logo-flex{ display:flex; justify-content:center; align-items:center; margin:8px 0 6px; }
          .kv-grid{ display:grid; grid-template-columns: 1fr 1fr; gap:6px 16px; align-items: center; }
          .kv-grid .kv-span{ grid-column: 1 / -1; }
          .signatures { display: grid; grid-template-columns: 1fr; gap: 8px; margin-top: 20px; max-width: 520px; margin-left: auto; margin-right: auto; }

          /* Acknowledgement */
          .ack { font-size: 14px; line-height: 1.7; }

          /* Grids */
          .sig-grid { display:grid; grid-template-columns: 1fr 1fr; gap:16px; }
          .sig-grid-compact { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .sig-box { border:1px dashed var(--border); border-radius:10px; padding:10px 12px; min-height:80px; }
          .sig-name { margin-top:28px; border-top:1px solid var(--border); padding-top:6px; font-size:12px; color: var(--muted); }
          .cv-grid{ display:grid; grid-template-columns: 1fr 1fr; gap:8px 16px; }
          .cv-grid .cv-span{ grid-column: 1 / -1; }
          .tbl thead th { background: var(--subtle); color: var(--ink); border-bottom: 1px solid var(--border); font-weight: 800; }
          .tbl tbody tr + tr td { border-top: 1px solid var(--border); }
          .tbl .muted { color: var(--muted); }
          .wrap { white-space: pre-wrap; line-height: 1.45; }
          .nowrap { white-space: nowrap; }
          .spacer { height: 38px; }
          .hdr-left { font-weight: 700; }
          .banner { height:6px; background: linear-gradient(90deg, #4f46e5, #06b6d4); border-radius: 999px; margin: 8px auto 16px; width:180px; }
        </style>`;

      const header = `
        <header>
          <div class="hdr-left">${orgName || ''}</div>
          <div class="hdr-right">Student ID: ${student?.id || ''}</div>
        </header>`;
      const footer = `
        <footer>
          <div>${student?.name || ''}</div>
          <div>Page <span class="pageNumber"></span></div>
        </footer>`;

      const script = `
        <script>
          (function(){
            function onAfterPrint(){
              // no-op
            }
            function numberPages(){
              // Simple page number injector for most browsers
              try {
                var pages = document.querySelectorAll('.page');
                pages.forEach(function(p, idx){
                  var footer = p.querySelector('footer .pageNumber');
                  if (footer) footer.textContent = String(idx + 1);
                });
              } catch(e){}
            }
            numberPages();
            window.onafterprint = onAfterPrint;
          })();
        </script>`;

      const html = `<!doctype html><html><head><title>Student Report</title>${styles}</head><body>${header}${footer}${cover}${toc}${cvSection}${acknowledgement}${activities}${certificate}${script}</body></html>`;
      setReportHtml(html);
      toast.dismiss();
    } catch (e: any) {
      toast.dismiss();
      toast.error(e.message || 'Failed to generate report');
      setReportHtml('');
    } finally {
      setReportStudentId(null);
    }
  };

  const onPrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(reportHtml);
    w.document.close();
    w.focus();
    w.print();
  };

  // If studentId is in URL, auto-generate
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sid = params.get('studentId');
    if (sid) {
      generateReport(String(sid));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, students.length]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Reports</h1>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        {loading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Loading students...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((s) => (
              <div key={s.id} className="border border-gray-200 dark:border-gray-700 rounded p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-xs text-gray-600">
                    {s.avatarUrl ? <img src={s.avatarUrl} alt={s.name} className="w-full h-full object-cover" /> : <span>{s.name.charAt(0).toUpperCase()}</span>}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{s.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{s.email}</div>
                  </div>
                </div>
                <Button onClick={() => generateReport(s.id)} disabled={!!reportStudentId}>Generate Report</Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Overall Remarks (optional)</label>
          <textarea value={overallRemarks} onChange={(e) => setOverallRemarks(e.target.value)} rows={3} className="mt-1 w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-2" placeholder="Type a short overall remark that will appear on the Activities page"></textarea>
        </div>
      </div>

      {reportHtml && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Preview</div>
            <Button onClick={onPrint}>Print / Save PDF</Button>
          </div>
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: reportHtml }} />
        </div>
      )}
    </div>
  );
};

export default Reports;
