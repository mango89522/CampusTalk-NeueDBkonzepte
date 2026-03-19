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
  subscribe: (id) => api.post(`/forums/${id}/subscribe`),
  unsubscribe: (id) => api.delete(`/forums/${id}/subscribe`),
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
  report: (id, reason = '') => api.post(`/posts/${id}/report`, { reason }),
  remove: (id) => api.delete(`/posts/${id}`),
}

export const commentApi = {
  create: (payload) => api.post('/comments', payload),
  update: (id, payload) => api.patch(`/comments/${id}`, payload),
  report: (id, reason = '') => api.post(`/comments/${id}/report`, { reason }),
  remove: (id) => api.delete(`/comments/${id}`),
}

export const userApi = {
  myPosts: () => api.get('/users/me/posts'),
  mySubscriptions: () => api.get('/users/me/subscriptions'),
  postsByUserId: (id) => api.get(`/users/${id}/posts`),
  search: (query, limit = 15) => api.get('/users/search', { params: { q: query, limit } }),
}

export const privateMessageApi = {
  conversations: (limit = 100) => api.get('/private-messages/conversations', { params: { limit } }),
  conversation: (userId, limit = 100) => api.get(`/private-messages/${userId}`, { params: { limit } }),
}

export const adminApi = {
  users: () => api.get('/admin/users'),
  changeRole: (userId, role) => api.patch(`/admin/users/${userId}/role`, { role }),
  reports: () => api.get('/admin/reports'),
}
