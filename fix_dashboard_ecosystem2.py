import re

with open('frontend/src/pages/DashboardPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

ecosystem_section = """
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mt-8">
          <Link to="/hospitals">
            <Card className="group relative overflow-hidden p-6 transition-all hover:bg-slate-800/50 hover:ring-1 hover:ring-slate-700 h-full flex flex-col justify-center items-center text-center">
              <Building2 className="h-8 w-8 text-blue-400 mb-3 transition-transform group-hover:scale-110" />
              <h3 className="font-semibold text-white">Hospitals</h3>
              <p className="text-sm text-slate-400 mt-1">Provider directory</p>
            </Card>
          </Link>
          <Link to="/explorer">
            <Card className="group relative overflow-hidden p-6 transition-all hover:bg-slate-800/50 hover:ring-1 hover:ring-slate-700 h-full flex flex-col justify-center items-center text-center">
              <Database className="h-8 w-8 text-indigo-400 mb-3 transition-transform group-hover:scale-110" />
              <h3 className="font-semibold text-white">Sui Explorer</h3>
              <p className="text-sm text-slate-400 mt-1">Blockchain anchors</p>
            </Card>
          </Link>
          <Link to="/prescriptions">
            <Card className="group relative overflow-hidden p-6 transition-all hover:bg-slate-800/50 hover:ring-1 hover:ring-slate-700 h-full flex flex-col justify-center items-center text-center">
              <Pill className="h-8 w-8 text-rose-400 mb-3 transition-transform group-hover:scale-110" />
              <h3 className="font-semibold text-white">Medications</h3>
              <p className="text-sm text-slate-400 mt-1">Active prescriptions</p>
            </Card>
          </Link>
          <Link to="/appointments">
            <Card className="group relative overflow-hidden p-6 transition-all hover:bg-slate-800/50 hover:ring-1 hover:ring-slate-700 h-full flex flex-col justify-center items-center text-center">
              <Clock className="h-8 w-8 text-emerald-400 mb-3 transition-transform group-hover:scale-110" />
              <h3 className="font-semibold text-white">Appointments</h3>
              <p className="text-sm text-slate-400 mt-1">Schedule & visits</p>
            </Card>
          </Link>
        </div>
"""

pattern = r"        </div>\n      \) : null\}\n    </div>\n  \);\n\};"
replacement = "        </div>\n      ) : null}\n" + ecosystem_section + "    </div>\n  );\n};"
content = re.sub(pattern, replacement, content)

with open('frontend/src/pages/DashboardPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
