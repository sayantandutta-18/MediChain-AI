import re

with open('frontend/src/pages/LoginPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

error_match = """      } catch (err) {
        const apiError = toError(err);
        reportFailure(err);
        setError(isApiOffline(apiError) ? null : apiError.message);
        setFieldErrors(isApiOffline(apiError) ? {} : toFieldErrors(apiError));
      } finally {"""
error_replacement = """      } catch (err) {
        const apiError = toError(err);
        reportFailure(err);
        if (apiError.code === 'MFA_REQUIRED') {
          setRequiresMfa(true);
          setError('Two-factor authentication required.');
        } else {
          setError(isApiOffline(apiError) ? null : apiError.message);
          setFieldErrors(isApiOffline(apiError) ? {} : toFieldErrors(apiError));
        }
      } finally {"""
content = content.replace(error_match, error_replacement)

with open('frontend/src/pages/LoginPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
