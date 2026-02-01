import { createRoute } from 'honox/factory'
import { Layout } from '../components/Layout'

export default createRoute((c) => {
  const { user } = c.get('beam')
  const authToken = c.get('beamAuthToken')

  return c.html(
    <Layout title="Home" authToken={authToken}>
      {/* Auth Status Bar */}
      <div class="auth-bar">
        {user ? (
          <div class="auth-bar-content">
            <span>Welcome, <strong>{user.name as string}</strong></span>
            <span class={`badge badge-${user.role}`}>{user.role as string}</span>
            <form action="/logout" method="POST" style="display: inline;">
              <button type="submit" class="btn-link">Sign Out</button>
            </form>
          </div>
        ) : (
          <div class="auth-bar-content">
            <span>Welcome, Guest</span>
            <a href="/login" class="btn-link">Sign In</a>
          </div>
        )}
      </div>

      <section class="hero">
        <h1>Welcome to My App</h1>
        <p>A fast, minimal web application with Beam auth context.</p>
        <div class="hero-buttons">
          <a href="/products" class="btn-primary">View Products</a>
          <a href="/reactivity" class="btn-secondary">Reactivity Demo</a>
          <a href="/auth-demo" class="btn-secondary">Auth Demo</a>
          <a href="/demo" class="btn-secondary">Beam Demo</a>
        </div>
      </section>

      <style>{`
        .auth-bar {
          background: #f9fafb;
          padding: 0.75rem 1.5rem;
          border-bottom: 1px solid #e5e5e5;
          margin: -1rem -1rem 2rem -1rem;
        }
        .auth-bar-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .badge {
          display: inline-block;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 500;
          text-transform: uppercase;
        }
        .badge-admin { background: #fee2e2; color: #dc2626; }
        .badge-user { background: #dbeafe; color: #2563eb; }
        .badge-guest { background: #f3f4f6; color: #6b7280; }
        .btn-link {
          background: none;
          border: none;
          color: #3b82f6;
          cursor: pointer;
          font-size: inherit;
          padding: 0;
          margin-left: auto;
        }
        .btn-link:hover {
          text-decoration: underline;
        }
        a.btn-link {
          text-decoration: none;
          margin-left: auto;
        }
        .hero-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 1.5rem;
        }
        .btn-secondary {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          background: #f3f4f6;
          color: #374151;
          border-radius: 6px;
          text-decoration: none;
        }
        .btn-secondary:hover {
          background: #e5e7eb;
        }
      `}</style>
    </Layout>
  )
})
