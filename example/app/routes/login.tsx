import { createRoute } from 'honox/factory'
import { Layout } from '../components/Layout'

// Demo users
const DEMO_USERS: Record<string, { id: string; name: string; email: string; role: string }> = {
  admin: { id: '1', name: 'Admin User', email: 'admin@example.com', role: 'admin' },
  user: { id: '2', name: 'Regular User', email: 'user@example.com', role: 'user' },
  guest: { id: '3', name: 'Guest User', email: 'guest@example.com', role: 'guest' },
}

// GET /login - show login form
export default createRoute((c) => {
  const { user } = c.get('beam')
  const error = c.req.query('error')

  // Already logged in? Redirect to home
  if (user) {
    return c.redirect('/')
  }

  return c.html(
    <Layout title="Login">
      <div class="auth-container">
        <div class="auth-card">
          <h1>Sign In</h1>
          <p class="text-muted">Demo accounts: admin, user, or guest (any password)</p>

          {error && (
            <div class="auth-error">{decodeURIComponent(error)}</div>
          )}

          <form method="POST" action="/login" class="auth-form">
            <div class="form-group">
              <label for="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                placeholder="admin, user, or guest"
                required
                autofocus
              />
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="any password"
                required
              />
            </div>
            <button type="submit" class="btn-primary btn-block">
              Sign In
            </button>
          </form>

          <div class="auth-footer">
            <a href="/">Back to Home</a>
          </div>
        </div>
      </div>

      <style>{`
        .auth-container {
          min-height: 80vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }
        .auth-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          padding: 2rem;
          width: 100%;
          max-width: 400px;
        }
        .auth-card h1 {
          margin: 0 0 0.5rem;
          text-align: center;
        }
        .auth-card .text-muted {
          text-align: center;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
          color: #666;
        }
        .auth-form .form-group {
          margin-bottom: 1rem;
        }
        .auth-form label {
          display: block;
          margin-bottom: 0.25rem;
          font-weight: 500;
        }
        .auth-form input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 1rem;
        }
        .auth-form input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .btn-primary {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-primary:hover {
          background: #2563eb;
        }
        .btn-block {
          width: 100%;
          margin-top: 1rem;
        }
        .auth-error {
          background: #fee2e2;
          color: #dc2626;
          padding: 0.75rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          text-align: center;
        }
        .auth-footer {
          text-align: center;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #eee;
        }
        .auth-footer a {
          color: #3b82f6;
          text-decoration: none;
        }
        .auth-footer a:hover {
          text-decoration: underline;
        }
      `}</style>
    </Layout>
  )
})

// POST /login - handle login
export const POST = createRoute(async (c) => {
  const { env } = c.get('beam')
  const formData = await c.req.formData()
  const username = (formData.get('username') as string || '').toLowerCase().trim()
  const password = formData.get('password') as string || ''

  // Validate
  if (!username || !password) {
    return c.redirect('/login?error=' + encodeURIComponent('Please enter username and password'))
  }

  // Check user
  const user = DEMO_USERS[username]
  if (!user) {
    return c.redirect('/login?error=' + encodeURIComponent('Invalid username. Try: admin, user, or guest'))
  }

  // Create session
  const sessionId = crypto.randomUUID()
  await env.KV.put(`session:${sessionId}`, JSON.stringify(user), {
    expirationTtl: 60 * 60 * 24, // 24 hours
  })

  // Set cookie and redirect
  c.header('Set-Cookie', `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`)
  return c.redirect('/')
})
