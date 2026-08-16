import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import FileBrowser from '../pages/FileBrowser';
import Trash from '../pages/Trash';
import SearchResults from '../pages/SearchResults';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes — Dashboard is the layout wrapper with Sidebar + Header */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Dashboard />}>
          <Route path="/" element={<FileBrowser />} />
          <Route path="/folder/:folderId" element={<FileBrowser />} />
          <Route path="/trash" element={<Trash />} />
          <Route path="/search" element={<SearchResults />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
