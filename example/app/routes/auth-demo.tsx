import { createRoute } from 'honox/factory'
import { Layout } from '../components/Layout'

export default createRoute((c) => {
  const { user } = c.get('beam')

  return c.html(
    <Layout title="Auth Demo">
      <div class="auth-demo">
        <h1>Authentication Demo</h1>
        <p class="text-muted">
          This page demonstrates the Beam auth context sharing between handlers and routes.
        </p>

        {/* Auth Status Section */}
        <div class="demo-section">
          <h2>Current Auth Status</h2>
          <div class="auth-status-card">
            {user ? (
              <div class="user-profile">
                <div class="user-avatar large">{(user.name as string)?.[0] || '?'}</div>
                <div class="user-info">
                  <h3>{user.name as string}</h3>
                  <p class="user-email">{user.email as string}</p>
                  <span class={`badge badge-${user.role}`}>{user.role as string}</span>
                </div>
                <form action="/logout" method="POST" style="margin-left: auto;">
                  <button type="submit" class="btn-logout">Sign Out</button>
                </form>
              </div>
            ) : (
              <div class="guest-prompt">
                <p>You are currently browsing as a guest.</p>
                <a href="/login" class="btn-primary">Sign In</a>
              </div>
            )}
          </div>
        </div>

        {/* Auth-Aware Content */}
        <div class="demo-section">
          <h2>Auth-Aware Content</h2>
          <div class="content-grid">
            {/* Public Content */}
            <div class="content-card">
              <h3>Public Content</h3>
              <p>This content is visible to everyone.</p>
              <div class="demo-box">
                Welcome to our demo! Anyone can see this.
              </div>
            </div>

            {/* User Content */}
            <div class={`content-card ${!user ? 'locked' : ''}`}>
              <h3>User Content</h3>
              {user ? (
                <>
                  <p>This content is for authenticated users.</p>
                  <div class="demo-box success">
                    Hello, {user.name as string}! You have access to user features.
                  </div>
                </>
              ) : (
                <>
                  <p>Sign in to view this content.</p>
                  <div class="demo-box locked">
                    <span class="lock-icon">🔒</span>
                    <a href="/login">Sign in to unlock</a>
                  </div>
                </>
              )}
            </div>

            {/* Admin Content */}
            <div class={`content-card ${user?.role !== 'admin' ? 'locked' : ''}`}>
              <h3>Admin Content</h3>
              {user?.role === 'admin' ? (
                <>
                  <p>This content is for administrators only.</p>
                  <div class="demo-box admin">
                    Welcome, Admin! You have full access.
                    <ul>
                      <li>Manage users</li>
                      <li>View analytics</li>
                      <li>System settings</li>
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <p>Admin privileges required.</p>
                  <div class="demo-box locked">
                    <span class="lock-icon">🔐</span>
                    {user ? (
                      <span>Admin access required</span>
                    ) : (
                      <a href="/login">Sign in as admin</a>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Beam Action Demo */}
        <div class="demo-section">
          <h2>Beam Action with Auth Context</h2>
          <p class="text-muted">
            The button below calls a Beam action that reads the auth context.
          </p>
          <div id="user-display" beam-defer beam-action="getCurrentUser" class="user-display-container">
            <div class="loading-spinner">Loading user...</div>
          </div>
        </div>

        {/* Session Info */}
        {user && (
          <div class="demo-section">
            <h2>Session Details</h2>
            <div class="session-info">
              <dl>
                <dt>User ID</dt>
                <dd>{user.id}</dd>
                <dt>Name</dt>
                <dd>{user.name as string}</dd>
                <dt>Email</dt>
                <dd>{user.email as string}</dd>
                <dt>Role</dt>
                <dd>{user.role as string}</dd>
              </dl>
            </div>
          </div>
        )}

        <style>{`
          .auth-demo {
            max-width: 900px;
            margin: 0 auto;
            padding: 2rem;
          }
          .auth-demo h1 {
            margin-bottom: 0.5rem;
          }
          .auth-demo .text-muted {
            color: #666;
            margin-bottom: 2rem;
          }
          .demo-section {
            margin: 2rem 0;
            padding: 1.5rem;
            border: 1px solid #e5e5e5;
            border-radius: 8px;
          }
          .demo-section h2 {
            margin-top: 0;
            font-size: 1.2rem;
          }
          .auth-status-card {
            background: #f9fafb;
            border-radius: 8px;
            padding: 1.5rem;
          }
          .user-profile {
            display: flex;
            align-items: center;
            gap: 1rem;
          }
          .user-avatar {
            width: 48px;
            height: 48px;
            background: #3b82f6;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            font-weight: bold;
          }
          .user-avatar.large {
            width: 64px;
            height: 64px;
            font-size: 1.5rem;
          }
          .user-info h3 {
            margin: 0;
          }
          .user-email {
            color: #666;
            font-size: 0.9rem;
            margin: 0.25rem 0;
          }
          .badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: uppercase;
          }
          .badge-admin { background: #fee2e2; color: #dc2626; }
          .badge-user { background: #dbeafe; color: #2563eb; }
          .badge-guest { background: #f3f4f6; color: #6b7280; }
          .btn-logout {
            background: #f3f4f6;
            border: 1px solid #d1d5db;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
          }
          .btn-logout:hover {
            background: #e5e7eb;
          }
          .guest-prompt {
            text-align: center;
          }
          .guest-prompt p {
            margin-bottom: 1rem;
            color: #666;
          }
          .btn-primary {
            display: inline-block;
            background: #3b82f6;
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            text-decoration: none;
            border: none;
            cursor: pointer;
          }
          .btn-primary:hover {
            background: #2563eb;
          }
          .content-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
          }
          .content-card {
            border: 1px solid #e5e5e5;
            border-radius: 8px;
            padding: 1rem;
          }
          .content-card h3 {
            margin-top: 0;
            font-size: 1rem;
          }
          .content-card.locked {
            opacity: 0.8;
          }
          .demo-box {
            background: #f5f5f5;
            padding: 1rem;
            border-radius: 6px;
          }
          .demo-box.success {
            background: #dcfce7;
            color: #166534;
          }
          .demo-box.admin {
            background: #fef3c7;
            color: #92400e;
          }
          .demo-box.admin ul {
            margin: 0.5rem 0 0;
            padding-left: 1.25rem;
          }
          .demo-box.locked {
            background: #f3f4f6;
            color: #6b7280;
            text-align: center;
          }
          .lock-icon {
            display: block;
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
          }
          .demo-box.locked a {
            color: #3b82f6;
          }
          .user-display-container {
            background: #f9fafb;
            padding: 1rem;
            border-radius: 8px;
            min-height: 60px;
          }
          .user-info.guest a {
            color: #3b82f6;
            text-decoration: none;
          }
          .session-info {
            background: #f9fafb;
            padding: 1rem;
            border-radius: 8px;
          }
          .session-info dl {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 0.5rem 1rem;
            margin: 0;
          }
          .session-info dt {
            font-weight: 500;
            color: #666;
          }
          .session-info dd {
            margin: 0;
          }
          .loading-spinner {
            color: #666;
            text-align: center;
            padding: 1rem;
          }
        `}</style>
      </div>
    </Layout>
  )
})
