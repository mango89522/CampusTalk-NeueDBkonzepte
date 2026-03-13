import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForumDetailPage from './pages/ForumDetailPage'
import PostDetailPage from './pages/PostDetailPage'
import CreateForumPage from './pages/CreateForumPage'
import CreatePostPage from './pages/CreatePostPage'
import ProfilePage from './pages/ProfilePage'
import AdminPage from './pages/AdminPage'
import PrivateMessagesPage from './pages/PrivateMessagesPage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forums/:id" element={<ForumDetailPage />} />
        <Route path="posts/:id" element={<PostDetailPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="forums/new" element={<CreateForumPage />} />
          <Route path="posts/new" element={<CreatePostPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="messages" element={<PrivateMessagesPage />} />
        </Route>

        <Route element={<ProtectedRoute requireAdmin />}>
          <Route path="admin" element={<AdminPage />} />
        </Route>

        <Route path="old-home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
