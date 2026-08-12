import * as React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { RootLayout } from '@/components/layout/RootLayout';
import { RbacLoader } from '@/components/layout/RbacLoader';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { CalendarPage } from '@/features/calendar/CalendarPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { SessionsManagementPage } from '@/features/sessions/SessionsManagementPage';
import { TutorsManagementPage } from '@/features/tutors/TutorsManagementPage';
import { GamificationLeaderboardPage } from '@/features/gamification/GamificationLeaderboardPage';
import { StudentsManagementPage } from '@/features/students/StudentsManagementPage';
import { VolunteersManagementPage } from '@/features/volunteers/VolunteersManagementPage';
import { AdminsManagementPage } from '@/features/admins/AdminsManagementPage';
import { EstablishmentsManagementPage } from '@/features/establishments/EstablishmentsManagementPage';
import { ReportsManagementPage } from '@/features/reports/ReportsManagementPage';
import { VscReportsManagementPage } from '@/features/vsc-reports/VscReportsManagementPage';
import { SubjectsManagementPage } from '@/features/subjects/SubjectsManagementPage';
import { LevelsManagementPage } from '@/features/levels/LevelsManagementPage';
import { ProgramsManagementPage } from '@/features/programs/ProgramsManagementPage';
import { SchoolYearsManagementPage } from '@/features/school-years/SchoolYearsManagementPage';
import { ActivityTypesManagementPage } from '@/features/activity-types/ActivityTypesManagementPage';
import { ActivitiesManagementPage } from '@/features/activities/ActivitiesManagementPage';
import { HolidaysManagementPage } from '@/features/holidays/HolidaysManagementPage';
import { MatchingManagementPage } from '@/features/matching/MatchingManagementPage';
import { SpecialtiesManagementPage } from '@/features/specialties/SpecialtiesManagementPage';
import { RolesManagementPage } from '@/features/roles/RolesManagementPage';
import { TutorialsPage } from '@/features/tutorials/TutorialsPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { UnauthorizedPage } from '@/features/auth/UnauthorizedPage';
import { NotFoundPage } from '@/features/auth/NotFoundPage';
import { useAuth } from '@/hooks/useAuth';
import { DynamicRoleGroupPage } from '@/features/role-group/DynamicRoleGroupPage';
import { DASHBOARD_PATH_ALIASES } from '@/constants/sidebar-routes';

const RootRedirect = () => {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
};

/** Legacy / French sidebar URLs → canonical English routes (avoids 404). */
const dashboardAliasRoutes = Object.entries(DASHBOARD_PATH_ALIASES).map(
  ([alias, canonical]) => ({
    path: alias,
    element: <Navigate to={`/dashboard/${canonical}`} replace />,
  }),
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/gamification-leaderboard',
    element: <Navigate to="/dashboard/gamification-leaderboard" replace />,
  },
  {
    path: '/dashboard',
    element: (
      <RbacLoader>
        <RootLayout />
      </RbacLoader>
    ),
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute requiredPermission={{ resource: 'dashboard', action: 'read' }}>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'calendar',
        element: (
          <ProtectedRoute requiredPermission={{ resource: 'dashboard', action: 'read' }}>
            <CalendarPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'tutorials',
        element: (
          <ProtectedRoute requiredPermission={{ resource: 'tutorials', action: 'read' }}>
            <TutorialsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'sessions',
        element: (
          <ProtectedRoute requiredPermission={{ resource: 'sessions', action: 'read' }}>
            <SessionsManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'matching',
        element: (
          <ProtectedRoute requiredPermission={{ resource: 'matching', action: 'read' }}>
            <MatchingManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'tutors',
        element: (
          <ProtectedRoute requiredPermission={{ resource: 'tutors', action: 'read' }}>
            <TutorsManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'gamification-leaderboard',
        element: (
          <ProtectedRoute requiredPermission={{ resource: 'tutors', action: 'read' }}>
            <GamificationLeaderboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'students',
        element: (
          <ProtectedRoute requiredPermission={{ resource: 'students', action: 'read' }}>
            <StudentsManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'volunteers',
        element: (
          <ProtectedRoute requiredPermission={{ resource: 'volunteers', action: 'read' }}>
            <VolunteersManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admins',
        element: (
          <ProtectedRoute requiredPermission={{ resource: 'admins', action: 'read' }}>
            <AdminsManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'establishments',
        element: (
          <ProtectedRoute requiredPermission={{ resource: 'establishments', action: 'read' }}>
            <EstablishmentsManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'reports',
        element: (
          <ProtectedRoute requiredPermission={{ resource: 'reports', action: 'read' }}>
            <ReportsManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'vsc-reports',
        element: (
          <ProtectedRoute requiredPermission={{ resource: 'vsc-reports', action: 'read' }}>
            <VscReportsManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'subjects',
        element: (
          <ProtectedRoute requiredPermission={{ resource: 'subjects', action: 'read' }}>
            <SubjectsManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'levels',
        element: (
          <ProtectedRoute requiredPermission={{ resource: 'levels', action: 'read' }}>
            <LevelsManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'programs',
        element: (
          <ProtectedRoute requiredPermission={{ resource: 'programs', action: 'read' }}>
            <ProgramsManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'school-years',
        element: (
          <ProtectedRoute requiredPermission={{ resource: 'schoolYears', action: 'read' }}>
            <SchoolYearsManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'activity-types',
        element: (
          <ProtectedRoute requiredPermission={{ resource: 'activityTypes', action: 'read' }}>
            <ActivityTypesManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'activities',
        element: (
          <ProtectedRoute requiredPermission={{ resource: 'activities', action: 'read' }}>
            <ActivitiesManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'holidays',
        element: (
          <ProtectedRoute requiredPermission={{ resource: 'holidays', action: 'read' }}>
            <HolidaysManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'specialties',
        element: (
          <ProtectedRoute requiredPermission={{ resource: 'specialties', action: 'read' }}>
            <SpecialtiesManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'roles',
        element: (
          <ProtectedRoute requiredPermission={{ resource: 'roles', action: 'read' }}>
            <RolesManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'unauthorized',
        element: <UnauthorizedPage />,
      },
      /**
       * Dynamic route for admin-type role groups created at runtime.
       * When a new role is created with e.g. roleGroup = 'steering', the backend
       * auto-creates menu-steering in sidebar + tab-* IE in 'steering' interface.
       * The sidebar link points to /dashboard/role-group/steering.
       * This route renders DynamicRoleGroupPage which derives interfaceName/menuId from params.
       *
       * Known static routes (admins, tutors, students, volunteers, etc.) take precedence
       * because they are declared above this catch-all.
       */
      {
        path: 'role-group/:groupCode',
        element: <DynamicRoleGroupPage />,
      },
      ...dashboardAliasRoutes,
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);

export const Router: React.FC = () => {
  return <RouterProvider router={router} />;
};
