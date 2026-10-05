import re

with open('frontend/src/pages/LoginPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add state
state_match = "const [password, setPassword] = useState('');"
state_replacement = "const [password, setPassword] = useState('');\n  const [totpCode, setTotpCode] = useState('');\n  const [requiresMfa, setRequiresMfa] = useState(false);"
content = content.replace(state_match, state_replacement)

# Update login call
login_match = "await login(email.trim(), password);"
login_replacement = "await login(email.trim(), password, totpCode);"
content = content.replace(login_match, login_replacement)

# Update error handling
error_match = """      } catch (err) {
      const apiError = toError(err);
      setError(apiError.message);
      if (apiError.code === 'NETWORK_ERROR') {
        reportFailure();
      }
    }"""
error_replacement = """      } catch (err) {
      const apiError = toError(err);
      if (apiError.code === 'MFA_REQUIRED') {
        setRequiresMfa(true);
        setError('Two-factor authentication required.');
      } else {
        setError(apiError.message);
        if (apiError.code === 'NETWORK_ERROR') {
          reportFailure();
        }
      }
    }"""
content = content.replace(error_match, error_replacement)

# Update UI
ui_match = """            <form onSubmit={handleSubmit} className="space-y-4">"""
ui_replacement = """            <form onSubmit={handleSubmit} className="space-y-4">
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
