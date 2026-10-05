import re

with open('frontend/src/pages/LoginPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

ui_match = """<form onSubmit={handleSubmit} className="space-y-4">"""
ui_replacement = """<form onSubmit={handleSubmit} className="space-y-4">
              {requiresMfa && (
                <div>
                  <label htmlFor="totp" className="field-label">
                    Authentication Code
                  </label>
                  <input
                    id="totp"
                    type="text"
                    required
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="6-digit code"
                    className="field"
                  />
                </div>
              )}"""
content = content.replace(ui_match, ui_replacement)

with open('frontend/src/pages/LoginPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
