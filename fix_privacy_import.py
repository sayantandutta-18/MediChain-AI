import re

with open('frontend/src/pages/PrivacyDashboardPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_btn = """              <button onClick={handleExport} disabled={isExporting} className="btn-primary mt-4">
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Preparing Archive...' : 'Export All Data'}
              </button>"""

import_btn_new = """              <div className="flex gap-4 mt-4">
                <button onClick={handleExport} disabled={isExporting} className="btn-primary">
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Preparing Archive...' : 'Export All Data'}
                </button>
                <label className="btn-ghost cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Data
                  <input type="file" className="hidden" accept=".json" onChange={async (e) => {
                    if (e.target.files && e.target.files[0]) {
                      const formData = new FormData();
                      formData.append('file', e.target.files[0]);
                      try {
                        await apiClient.post('/import/import', formData);
                        alert('Data imported successfully');
                      } catch (err: any) {
                        alert(err.message || 'Import failed');
                      }
                    }
                  }} />
                </label>
              </div>"""

content = content.replace(import_btn, import_btn_new)
content = content.replace("import { Activity, Shield, Key, EyeOff, AlertTriangle, Download } from 'lucide-react';", "import { Activity, Shield, Key, EyeOff, AlertTriangle, Download, Upload } from 'lucide-react';")

with open('frontend/src/pages/PrivacyDashboardPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
