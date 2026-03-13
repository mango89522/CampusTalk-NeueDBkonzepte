import { api } from './client'

export const authApi = {
  register: (payload) => api.post('/auth/register', payload),
  login: (payload) => api.post('/auth/login', payload),
  me: () => api.get('/auth/me'),
}

export const forumApi = {
  list: (params = {}) => api.get('/forums', { params }),
  getById: (id) => api.get(`/forums/${id}`),
  create: (payload) => api.post('/forums', payload),
  update: (id, payload) => api.patch(`/forums/${id}`, payload),
  remove: (id) => api.delete(`/forums/${id}`),
  messages: (forumId, limit = 100) => api.get(`/forums/${forumId}/messages`, { params: { limit } }),
}

export const postApi = {
  list: (params = {}) => api.get('/posts', { params }),
  getById: (id) => api.get(`/posts/${id}`),
  comments: (postId) => api.get(`/posts/${postId}/comments`),
  create: (payload) => api.post('/posts', payload),
  update: (id, payload) => api.patch(`/posts/${id}`, payload),
  upvote: (id) => api.patch(`/posts/${id}/upvote`),
  downvote: (id) => api.patch(`/posts/${id}/downvote`),
  remove: (id) => api.delete(`/posts/${id}`),
}

export const commentApi = {
  create: (payload) => api.post('/comments', payload),
  update: (id, payload) => api.patch(`/comments/${id}`, payload),
  remove: (id) => api.delete(`/comments/${id}`),
}

export const userApi = {
  myPosts: () => api.get('/users/me/posts'),
  postsByUserId: (id) => api.get(`/users/${id}/posts`),
}

export const privateMessageApi = {
  conversation: (userId, limit = 100) => api.get(`/private-messages/${userId}`, { params: { limit } }),
}

export const adminApi = {
  users: () => api.get('/admin/users'),
  changeRole: (userId, role) => api.patch(`/admin/users/${userId}/role`, { role }),
}
