import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/button/Button';
import toast from 'react-hot-toast';

const StaffReport: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const staffId = params.get('staffId');
  const staffName = params.get('staffName') || '';

  const [html, setHtml] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [orgName, setOrgName] = React.useState<string>('');
  const [deptName, setDeptName] = React.useState<string>('');
  const [overallRemarks, setOverallRemarks] = React.useState<string>('');

  const apiBase = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';

  const load = async () => {
    if (!user || !staffId) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('elog_token') || '';
      const res = await fetch(`${apiBase}/departments/${user.id}/staff/${staffId}/report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to load report data');
      }
      const data = await res.json();
      // fetch department profile for org/department names
      try {
        const dm = await fetch(`${apiBase}/departments/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (dm.ok) {
          const md = await dm.json();
          setOrgName(md.organizationName || '');
          setDeptName(md.name || '');
        }
      } catch {}
      // Build printable HTML
      const byStudent: Record<string, any[]> = {};
      for (const l of data.logs as any[]) {
        const sid = String(l.studentId);
        if (!byStudent[sid]) byStudent[sid] = [];
        byStudent[sid].push(l);
      }
      const attachByLog: Record<string, any[]> = {};
      for (const a of data.attachments as any[]) {
        const lid = String(a.logId);
        if (!attachByLog[lid]) attachByLog[lid] = [];
        attachByLog[lid].push(a);
      }
      const students = data.students as Array<any>;
      const cover = `
        <section class=\"page cover\">\n          <div style=\"display:flex;justify-content:center;margin-top:8px;margin-bottom:8px;\"><img src=\"/images/logo/logo.svg\" alt=\"College Logo\" style=\"height:48px;width:auto;\" /></div>\n          <div class=\"title\">${orgName || 'College/Organization Name'}</div>\n          <div class=\"subtitle\">Department: ${deptName || '-'}</div>\n          <div class=\"subtitle\">Assigned Teacher: ${data.staff?.name || staffName || '-'}</div>\n          <div class=\"student\">Staff Report</div>\n          <div class=\"signatures\">\n            <div>Student Signature: ______________________</div>\n            <div>Staff Signature: ________________________</div>\n            <div>Department Signature: ___________________</div>\n            <div>Organization Signature: _________________</div>\n          </div>\n        </section>`;

      const acknowledgement = `
        <section class=\"page\">\n          <h2>Acknowledgement</h2>\n          <p>We acknowledge the efforts and guidance contributing to the completion of the activities summarized in this booklet.</p>\n          <div class=\"spacer\"></div>\n          <div>Date: _____________ &nbsp;&nbsp; Signature: __________________</div>\n        </section>`;

      const toc = `
        <section class=\"page\">\n          <h2>Table of Contents</h2>\n          <ol class=\"toc\">\n            <li>Cover Page</li>\n            <li>Acknowledgement</li>\n            <li>Table of Contents</li>\n            <li>Activities by Students</li>\n            <li>Certificate</li>\n          </ol>\n        </section>`;

      const activities = `
        <section class=\"page\">\n          <h2>Activities by Students</h2>\n          ${overallRemarks ? `<div class=\"remarks\"><strong>Overall Remarks:</strong> ${overallRemarks.replace(/</g,'&lt;')}</div>` : ''}
          ${students.map(s => `
            <div class=\"student-block\">\n              <div class=\"student-hdr\">${s.name} <span class=\"sid\">(${s.email})</span></div>\n              ${(byStudent[String(s.id)] || []).map((l:any) => `
                <div class=\"log\">\n                  <div class=\"log-title\">${l.title || '(untitled)'} — ${l.activityType || ''}</div>\n                  <div class=\"log-meta\">${new Date(l.activityDate).toLocaleDateString()} • Status: ${l.status} • Student ID: ${s.id}</div>\n                  <div class=\"log-desc\">${(l.detailedDescription || '-').toString().replace(/</g,'&lt;')}</div>\n                  ${(attachByLog[String(l.id)] || []).length ? `
                    <div class=\\\"log-att\\\">\n                      <div class=\\\"att-title\\\">Attachments</div>\n                      <ul>\n                        ${attachByLog[String(l.id)].map((a:any) => `<li><a href='${a.url}' target='_blank'>${a.url}</a>${a.size?` (${(a.size/1024).toFixed(1)} KB)`:''}</li>`).join('')}\n                      </ul>\n                    </div>
                  `: ''}\n                </div>
              `).join('')}\n            </div>
          `).join('')}\n        </section>`;

      const certificate = `
        <section class=\"page\">\n          <h2>Certificate</h2>\n          <p>This is to certify that the activities under ${data.staff?.name || 'Staff'} have been reviewed by the department.</p>\n          <div class=\"spacer\"></div>\n          <div class=\"signatures\">\n            <div>Staff: ________________________ Date: ____________</div>\n            <div>Department: ___________________ Date: ____________</div>\n            <div>Organization: _________________ Date: ____________</div>\n          </div>\n        </section>`;

      const styles = `
        <style>@media print { @page { margin: 18mm; } header{position:fixed;top:0;left:0;right:0;height:20mm;} footer{position:fixed;bottom:0;left:0;right:0;height:15mm;} .page{page-break-after:always;} }
        body{font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial;color:#111827;}
        header,footer{font-size:11px;color:#374151;display:flex;align-items:center;justify-content:space-between;padding:8px 4px;border-bottom:1px solid #e5e7eb;} footer{border-top:1px solid #e5e7eb;border-bottom:none;}
        .page{padding:24px 4px;} .cover .title{font-size:28px;font-weight:700;margin:40px 0 6px;text-align:center;} .cover .subtitle{font-size:16px;text-align:center;margin-bottom:4px;} .cover .student{text-align:center;font-weight:600;margin:18px 0;font-size:18px;}
        .signatures{display:grid;grid-template-columns:1fr;gap:8px;margin-top:24px;max-width:420px;margin-left:auto;margin-right:auto;} h2{font-size:20px;font-weight:700;margin:0 0 12px;}
        .toc{margin:0 0 0 16px;} .remarks{background:#f3f4f6;padding:8px;border-radius:6px;margin-bottom:10px;} .student-block{margin-bottom:14px;} .student-hdr{font-weight:700;margin-bottom:6px;} .sid{color:#6b7280;font-weight:500;}
        .log{margin-bottom:12px;} .log-title{font-weight:700;} .log-meta{color:#6b7280;font-size:12px;margin-bottom:4px;} .log-desc{white-space:pre-wrap;} .log-att .att-title{font-size:12px;font-weight:600;margin-top:6px;} .spacer{height:40px;}
        .hdr-left{font-weight:600;}
        </style>`;

      const header = `<header><div class=\"hdr-left\">${orgName || ''} — ${deptName || ''}</div><div>Staff: ${data.staff?.name || ''}</div></header>`;
      const footer = `<footer><div>${staffName || data.staff?.name || ''}</div><div>Page <span class=\"pageNumber\"></span></div></footer>`;
      const script = `<script>(function(){try{var pages=document.querySelectorAll('.page');pages.forEach(function(p,idx){var n=p.querySelector('footer .pageNumber');if(n) n.textContent=String(idx+1);});}catch(e){}})();</script>`;
      const booklet = `<!doctype html><html><head><title>Staff Report</title>${styles}</head><body>${header}${footer}${cover}${acknowledgement}${toc}${activities}${certificate}${script}</body></html>`;
      setHtml(booklet);
    } catch (e:any) {
      toast.error(e.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, [user?.id, staffId]);

  const onPrint = () => {
    if (!html) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Staff Report</title></head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Report</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
          <Button onClick={onPrint} disabled={!html || loading}>Print / Save PDF</Button>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Overall Remarks (optional)</label>
          <textarea value={overallRemarks} onChange={(e)=>setOverallRemarks(e.target.value)} rows={3} className="mt-1 w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-2" placeholder="Type an overall remark to include on the Activities page"></textarea>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        {loading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Loading report...</div>
        ) : html ? (
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <div className="text-sm text-gray-500 dark:text-gray-400">No data</div>
        )}
      </div>
    </div>
  );
};

export default StaffReport;
